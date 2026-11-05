import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Candle, TechnicalIndicators, SMCAnalysis, TradeSignal, Timeframe } from '../types/gold';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Crosshair, BarChart3, Activity, Layers } from 'lucide-react';

interface CandlestickChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators;
  smc: SMCAnalysis;
  currentSignal?: TradeSignal | null;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  isDemo: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  indicators,
  smc,
  currentSignal,
  timeframe,
  onTimeframeChange,
  isDemo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Overlay visibility toggles
  const [showEMAs, setShowEMAs] = useState(true);
  const [showOBs, setShowOBs] = useState(true);
  const [showFVGs, setShowFVGs] = useState(true);
  const [showLiquidity, setShowLiquidity] = useState(true);
  const [showStructure, setShowStructure] = useState(true);
  const [showSignalLevels, setShowSignalLevels] = useState(true);
  const [subChart, setSubChart] = useState<'volume' | 'rsi' | 'macd' | 'none'>('rsi');

  // Chart view state: visible candle window
  const [visibleCount, setVisibleCount] = useState(55);
  const [offsetRight, setOffsetRight] = useState(5); // candles offset from right edge
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; candleIndex: number } | null>(null);

  // Drag / touch state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const touchStartDist = useRef(0);

  // Timeframes list
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h'];

  // Handle Resize
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute visible range
  const total = candles.length;
  const endIndex = Math.min(total, total - offsetRight);
  const startIndex = Math.max(0, endIndex - visibleCount);
  const visibleCandles = useMemo(() => candles.slice(startIndex, endIndex), [candles, startIndex, endIndex]);

  // Main chart render logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || total === 0 || visibleCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dimensions.width;
    const h = dimensions.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const paddingRight = 68; // Price scale width
    const paddingBottom = subChart === 'none' ? 24 : 110; // Bottom time axis or subchart
    const chartW = w - paddingRight;
    const mainChartH = h - paddingBottom;
    const subChartH = subChart === 'none' ? 0 : 80;
    const subChartY = h - subChartH - 22;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    // Find min and max price in visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    // Add margin
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.08;
    maxPrice += priceRange * 0.08;
    const adjustedRange = maxPrice - minPrice;

    // Mapping helpers
    const getX = (index: number) => {
      const relIdx = index - startIndex;
      const candleWidth = chartW / visibleCandles.length;
      return relIdx * candleWidth + candleWidth / 2;
    };

    const getY = (price: number) => {
      return mainChartH - ((price - minPrice) / adjustedRange) * mainChartH;
    };

    const candleWidth = Math.max(2, (chartW / visibleCandles.length) * 0.72);

    // Draw Price Grid & Levels
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    const gridStep = adjustedRange / 6;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#71717a';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 6; i++) {
      const p = minPrice + i * gridStep;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillText(`$${p.toFixed(2)}`, chartW + 6, y + 3);
    }

    // Draw Time Axis Grid
    const stepTime = Math.max(1, Math.floor(visibleCandles.length / 5));
    for (let i = 0; i < visibleCandles.length; i += stepTime) {
      const c = visibleCandles[i];
      const x = getX(startIndex + i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 20);
      ctx.stroke();

      const date = new Date(c.time * 1000);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      ctx.fillText(timeStr, x - 14, h - 6);
    }

    // 1. Draw Fair Value Gaps (FVG)
    if (showFVGs) {
      smc.fairValueGaps.forEach((fvg) => {
        if (fvg.candleIndex >= startIndex - 10 && fvg.candleIndex <= endIndex) {
          const x1 = getX(fvg.candleIndex);
          const x2 = chartW;
          const yTop = getY(fvg.top);
          const yBottom = getY(fvg.bottom);
          const height = Math.abs(yBottom - yTop);

          ctx.fillStyle = fvg.type === 'BULLISH_FVG' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
          ctx.strokeStyle = fvg.type === 'BULLISH_FVG' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
          ctx.setLineDash([3, 3]);
          ctx.fillRect(x1, Math.min(yTop, yBottom), x2 - x1, height);
          ctx.strokeRect(x1, Math.min(yTop, yBottom), x2 - x1, height);
          ctx.setLineDash([]);

          ctx.fillStyle = fvg.type === 'BULLISH_FVG' ? '#34d399' : '#f87171';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(fvg.type === 'BULLISH_FVG' ? '+FVG' : '-FVG', x1 + 4, Math.min(yTop, yBottom) + 10);
        }
      });
    }

    // 2. Draw Order Blocks (OB)
    if (showOBs) {
      smc.orderBlocks.forEach((ob) => {
        if (ob.candleIndex >= startIndex - 15 && ob.candleIndex <= endIndex) {
          const x1 = getX(ob.candleIndex);
          const x2 = chartW;
          const yTop = getY(ob.high);
          const yBottom = getY(ob.low);
          const height = Math.max(3, Math.abs(yBottom - yTop));

          ctx.fillStyle = ob.type === 'BULLISH_OB' ? 'rgba(212, 175, 55, 0.16)' : 'rgba(147, 51, 234, 0.16)';
          ctx.strokeStyle = ob.type === 'BULLISH_OB' ? 'rgba(212, 175, 55, 0.5)' : 'rgba(168, 85, 247, 0.5)';
          ctx.fillRect(x1, Math.min(yTop, yBottom), x2 - x1, height);
          ctx.strokeRect(x1, Math.min(yTop, yBottom), x2 - x1, height);

          ctx.fillStyle = ob.type === 'BULLISH_OB' ? '#fbbf24' : '#c084fc';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(ob.type === 'BULLISH_OB' ? 'DEMAND OB' : 'SUPPLY OB', x1 + 4, Math.min(yTop, yBottom) + 11);
        }
      });
    }

    // 3. Draw Liquidity Sweeps & Levels (BSL / SSL)
    if (showLiquidity) {
      smc.liquidityLevels.forEach((l) => {
        if (l.candleIndex >= startIndex - 30) {
          const y = getY(l.price);
          const xStart = getX(l.candleIndex);

          ctx.strokeStyle = l.swept ? 'rgba(212, 175, 55, 0.7)' : 'rgba(212, 175, 55, 0.35)';
          ctx.lineWidth = l.swept ? 1.5 : 1;
          ctx.setLineDash(l.swept ? [] : [4, 4]);

          ctx.beginPath();
          ctx.moveTo(xStart, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#fef08a';
          ctx.font = '9px "JetBrains Mono", monospace';
          const tag = l.swept ? `✓ ${l.type} SWEPT $${l.price.toFixed(2)}` : `${l.type} $${l.price.toFixed(2)}`;
          ctx.fillText(tag, chartW - 130, y - 4);
        }
      });
    }

    // 4. Draw Structure Breaks (BOS / CHoCH)
    if (showStructure) {
      smc.structureBreaks.forEach((sb) => {
        if (sb.candleIndex >= startIndex && sb.candleIndex <= endIndex) {
          const x = getX(sb.candleIndex);
          const y = getY(sb.price);

          ctx.strokeStyle = sb.direction === 'BULLISH' ? '#10b981' : '#ef4444';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 2]);

          ctx.beginPath();
          ctx.moveTo(x - 25, y);
          ctx.lineTo(x + 25, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = sb.direction === 'BULLISH' ? '#10b981' : '#ef4444';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(sb.type, x - 10, y - 4);
        }
      });
    }

    // 5. Draw EMAs
    if (showEMAs) {
      const drawEMALine = (data: number[], color: string, width: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        let started = false;

        for (let i = startIndex; i < endIndex; i++) {
          const val = data[i];
          if (!val) continue;
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      drawEMALine(indicators.ema20, '#d4af37', 1.5); // Gold 20
      drawEMALine(indicators.ema50, '#38bdf8', 1.2); // Blue 50
      drawEMALine(indicators.ema200, '#a1a1aa', 1.0); // Silver 200
    }

    // 6. Draw Candlesticks
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const realIdx = startIndex + i;
      const x = getX(realIdx);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#ef4444';

      // Wick
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    // 7. Draw Active Signal Lines (Entry, SL, TP)
    if (showSignalLevels && currentSignal && currentSignal.type !== 'NO_TRADE') {
      const drawSignalLevel = (price: number, label: string, color: string, isDashed = false) => {
        const y = getY(price);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        if (isDashed) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label banner
        ctx.fillStyle = color;
        ctx.fillRect(chartW + 2, y - 8, paddingRight - 4, 16);
        ctx.fillStyle = '#09090b';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(label, chartW + 5, y + 4);
      };

      drawSignalLevel(currentSignal.entry, `ENTRY ${currentSignal.entry.toFixed(2)}`, '#d4af37');
      drawSignalLevel(currentSignal.stopLoss, `SL ${currentSignal.stopLoss.toFixed(2)}`, '#ef4444', true);
      drawSignalLevel(currentSignal.takeProfit1, `TP1 ${currentSignal.takeProfit1.toFixed(2)}`, '#10b981', true);
      if (currentSignal.takeProfit2) {
        drawSignalLevel(currentSignal.takeProfit2, `TP2 ${currentSignal.takeProfit2.toFixed(2)}`, '#10b981', true);
      }
    }

    // 8. Draw Sub-chart (Volume, RSI, or MACD)
    if (subChart !== 'none') {
      // Subchart background & separator
      ctx.fillStyle = '#0e0e11';
      ctx.fillRect(0, subChartY, chartW, subChartH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, subChartY);
      ctx.lineTo(chartW, subChartY);
      ctx.stroke();

      if (subChart === 'volume') {
        let maxVol = 0;
        for (const c of visibleCandles) if (c.volume > maxVol) maxVol = c.volume;
        maxVol = maxVol || 1;

        for (let i = 0; i < visibleCandles.length; i++) {
          const c = visibleCandles[i];
          const x = getX(startIndex + i);
          const barH = (c.volume / maxVol) * (subChartH - 12);
          const y = subChartY + subChartH - barH;
          ctx.fillStyle = c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
          ctx.fillRect(x - candleWidth / 2, y, candleWidth, barH);
        }
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`VOL ${visibleCandles[visibleCandles.length - 1]?.volume.toLocaleString()}`, 8, subChartY + 14);
      } else if (subChart === 'rsi') {
        // RSI 70 and 30 reference lines
        const getRsiY = (val: number) => subChartY + subChartH - (val / 100) * subChartH;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.setLineDash([3, 3]);
        [70, 30].forEach((level) => {
          const y = getRsiY(level);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.fillStyle = '#71717a';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`${level}`, chartW + 6, y + 3);
        });
        ctx.setLineDash([]);

        // RSI line
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = startIndex; i < endIndex; i++) {
          const rsiVal = indicators.rsi[i];
          if (rsiVal === undefined) continue;
          const x = getX(i);
          const y = getRsiY(rsiVal);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        const latestRsi = indicators.rsi[endIndex - 1] || 50;
        ctx.fillStyle = latestRsi >= 70 ? '#ef4444' : latestRsi <= 30 ? '#10b981' : '#fbbf24';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`RSI (14): ${latestRsi.toFixed(1)}`, 8, subChartY + 14);
      } else if (subChart === 'macd') {
        const histData = indicators.macd.histogram;
        let maxHist = 0.5;
        for (let i = startIndex; i < endIndex; i++) {
          const hVal = Math.abs(histData[i] || 0);
          if (hVal > maxHist) maxHist = hVal;
        }

        const midY = subChartY + subChartH / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(chartW, midY);
        ctx.stroke();

        for (let i = startIndex; i < endIndex; i++) {
          const hVal = histData[i] || 0;
          const x = getX(i);
          const barH = (hVal / maxHist) * (subChartH / 2 - 6);
          ctx.fillStyle = hVal >= 0 ? '#10b981' : '#ef4444';
          ctx.fillRect(x - candleWidth / 2, midY - (hVal >= 0 ? barH : 0), candleWidth, Math.abs(barH));
        }

        const latestHist = histData[endIndex - 1] || 0;
        ctx.fillStyle = latestHist >= 0 ? '#10b981' : '#ef4444';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`MACD Hist: ${latestHist.toFixed(3)}`, 8, subChartY + 14);
      }
    }

    // 9. Crosshair Tooltip
    if (crosshair && crosshair.x < chartW && crosshair.y < h - 20) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, h - 20);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(chartW, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlighted price on right scale
      const crossPrice = maxPrice - (crosshair.y / mainChartH) * adjustedRange;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(chartW + 2, crosshair.y - 8, paddingRight - 4, 16);
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(`$${crossPrice.toFixed(2)}`, chartW + 5, crosshair.y + 4);
    }
  }, [
    dimensions,
    candles,
    visibleCandles,
    startIndex,
    endIndex,
    indicators,
    smc,
    currentSignal,
    showEMAs,
    showOBs,
    showFVGs,
    showLiquidity,
    showStructure,
    showSignalLevels,
    subChart,
    crosshair,
  ]);

  // Mouse & Touch Interactivity
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRight;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging.current) {
      const deltaX = e.clientX - dragStartX.current;
      const candleWidth = (dimensions.width - 68) / visibleCount;
      const shift = Math.round(deltaX / candleWidth);
      const newOffset = Math.max(0, Math.min(candles.length - visibleCount, dragStartOffset.current + shift));
      setOffsetRight(newOffset);
    } else {
      // Update crosshair
      const chartW = dimensions.width - 68;
      const candleWidth = chartW / visibleCandles.length;
      const relIdx = Math.floor(x / candleWidth);
      const candleIndex = Math.max(0, Math.min(visibleCandles.length - 1, relIdx));
      setCrosshair({ x, y, candleIndex: startIndex + candleIndex });
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount((prev) => Math.max(20, prev - 4));
    } else {
      // Zoom out
      setVisibleCount((prev) => Math.min(Math.min(180, candles.length), prev + 4));
    }
  };

  const resetView = () => {
    setVisibleCount(55);
    setOffsetRight(5);
  };

  // Inspect candle for HUD
  const inspectedCandle = crosshair
    ? candles[crosshair.candleIndex] || candles[candles.length - 1]
    : candles[candles.length - 1];

  return (
    <div className="flex flex-col w-full h-full bg-[#0c0c0e] rounded-xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* Top Bar: Timeframe selector & Overlay Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#121215] border-b border-zinc-800/80 text-xs">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === tf
                  ? 'bg-[#d4af37] text-zinc-950 shadow-sm shadow-[#d4af37]/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* SMC Overlays Toggle Toolbar */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          <button
            onClick={() => setShowEMAs(!showEMAs)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showEMAs ? 'bg-amber-500/15 text-[#fbbf24] border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="EMA 20, 50, 200"
          >
            EMA
          </button>
          <button
            onClick={() => setShowOBs(!showOBs)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showOBs ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Institutional Order Blocks"
          >
            OB
          </button>
          <button
            onClick={() => setShowFVGs(!showFVGs)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showFVGs ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Fair Value Gaps"
          >
            FVG
          </button>
          <button
            onClick={() => setShowLiquidity(!showLiquidity)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showLiquidity ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="BSL & SSL Liquidity Sweeps"
          >
            LIQ
          </button>
          <button
            onClick={() => setShowStructure(!showStructure)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showStructure ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="BOS & CHoCH Market Structure"
          >
            BOS
          </button>
          <button
            onClick={() => setShowSignalLevels(!showSignalLevels)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showSignalLevels ? 'bg-[#d4af37]/20 text-[#ffd700] border border-[#d4af37]/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Signal Entry, SL, TP Lines"
          >
            Levels
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          {/* Subchart selector */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded p-0.5">
            <button
              onClick={() => setSubChart('rsi')}
              className={`px-1.5 py-0.5 text-[10px] rounded ${subChart === 'rsi' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-500'}`}
            >
              RSI
            </button>
            <button
              onClick={() => setSubChart('macd')}
              className={`px-1.5 py-0.5 text-[10px] rounded ${subChart === 'macd' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-500'}`}
            >
              MACD
            </button>
            <button
              onClick={() => setSubChart('volume')}
              className={`px-1.5 py-0.5 text-[10px] rounded ${subChart === 'volume' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-500'}`}
            >
              VOL
            </button>
          </div>

          {/* Zoom controls */}
          <button
            onClick={() => setVisibleCount((c) => Math.max(20, c - 8))}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisibleCount((c) => Math.min(180, c + 8))}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Candlestick HUD Metric Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#09090b] border-b border-zinc-800/50 text-[11px] font-mono-numbers text-zinc-400 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-zinc-200">XAU/USD · {timeframe}</span>
          {inspectedCandle && (
            <>
              <span>O: <strong className="text-zinc-200">${inspectedCandle.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-emerald-400">${inspectedCandle.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-rose-400">${inspectedCandle.low.toFixed(2)}</strong></span>
              <span>
                C:{' '}
                <strong
                  className={inspectedCandle.close >= inspectedCandle.open ? 'text-emerald-400' : 'text-rose-400'}
                >
                  ${inspectedCandle.close.toFixed(2)}
                </strong>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          {showEMAs && (
            <>
              <span className="text-[#d4af37]">EMA20: ${(indicators.ema20[indicators.ema20.length - 1] || 0).toFixed(2)}</span>
              <span className="text-[#38bdf8]">EMA50: ${(indicators.ema50[indicators.ema50.length - 1] || 0).toFixed(2)}</span>
            </>
          )}
          {isDemo && (
            <span className="text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">DEMO FEED</span>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full min-h-[320px] cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isDragging.current = false;
          setCrosshair(null);
        }}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
    </div>
  );
};
