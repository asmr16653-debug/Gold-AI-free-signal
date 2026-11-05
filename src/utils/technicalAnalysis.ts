import { Candle, TechnicalIndicators, SMCAnalysis, OrderBlock, FairValueGap, LiquidityLevel, StructureBreak } from '../types/gold';

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): number[] {
  const result: number[] = new Array(candles.length).fill(0);
  if (candles.length < period) return result;

  const k = 2 / (period + 1);

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEMA = sum / period;
  result[period - 1] = prevEMA;

  for (let i = period; i < candles.length; i++) {
    const currentEMA = candles[i].close * k + prevEMA * (1 - k);
    result[i] = currentEMA;
    prevEMA = currentEMA;
  }

  // Fill initial values for continuous rendering
  for (let i = 0; i < period - 1; i++) {
    result[i] = result[period - 1];
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI) using Wilder's smoothing
 */
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  const result: number[] = new Array(candles.length).fill(50);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
  }

  for (let i = 0; i < period; i++) {
    result[i] = result[period];
  }

  return result;
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(candles: Candle[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(candles, 12);
  const slowEMA = calculateEMA(candles, 26);
  const macdLine: number[] = new Array(candles.length).fill(0);

  for (let i = 0; i < candles.length; i++) {
    macdLine[i] = fastEMA[i] - slowEMA[i];
  }

  // Calculate Signal line: 9-period EMA of MACD Line
  const signalLine: number[] = new Array(candles.length).fill(0);
  const k = 2 / (9 + 1);
  let sum = 0;
  for (let i = 0; i < 9 && i < macdLine.length; i++) {
    sum += macdLine[i];
  }
  let prevSignal = sum / Math.min(9, macdLine.length);
  signalLine[8] = prevSignal;

  for (let i = 9; i < macdLine.length; i++) {
    const currentSignal = macdLine[i] * k + prevSignal * (1 - k);
    signalLine[i] = currentSignal;
    prevSignal = currentSignal;
  }
  for (let i = 0; i < 8; i++) {
    signalLine[i] = signalLine[8] || 0;
  }

  const histogram: number[] = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    histogram[i] = macdLine[i] - signalLine[i];
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const result: number[] = new Array(candles.length).fill(2.5);
  if (candles.length <= period) return result;

  const tr: number[] = new Array(candles.length).fill(0);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevATR = sum / period;
  result[period - 1] = prevATR;

  for (let i = period; i < candles.length; i++) {
    const currentATR = (prevATR * (period - 1) + tr[i]) / period;
    result[i] = currentATR;
    prevATR = currentATR;
  }

  for (let i = 0; i < period - 1; i++) {
    result[i] = result[period - 1];
  }

  return result;
}

/**
 * Compute all primary technical indicators
 */
export function computeTechnicalIndicators(candles: Candle[]): TechnicalIndicators {
  return {
    ema20: calculateEMA(candles, 20),
    ema50: calculateEMA(candles, 50),
    ema200: calculateEMA(candles, 200),
    rsi: calculateRSI(candles, 14),
    macd: calculateMACD(candles),
    atr: calculateATR(candles, 14),
  };
}

/**
 * Institutional Smart Money Concepts (SMC) & ICT Engine
 */
export function analyzeSMC(candles: Candle[]): SMCAnalysis {
  const n = candles.length;
  if (n < 15) {
    return {
      orderBlocks: [],
      fairValueGaps: [],
      liquidityLevels: [],
      structureBreaks: [],
      currentTrend: 'RANGING',
    };
  }

  const orderBlocks: OrderBlock[] = [];
  const fairValueGaps: FairValueGap[] = [];
  const liquidityLevels: LiquidityLevel[] = [];
  const structureBreaks: StructureBreak[] = [];

  // 1. Identify 5-bar Fractal Swings (Highs & Lows)
  interface Swing {
    index: number;
    price: number;
    type: 'HIGH' | 'LOW';
  }
  const swings: Swing[] = [];

  for (let i = 2; i < n - 2; i++) {
    const c = candles[i];
    // Swing High: higher than 2 candles before and 2 after
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high > candles[i + 1].high &&
      c.high > candles[i + 2].high
    ) {
      swings.push({ index: i, price: c.high, type: 'HIGH' });
    }
    // Swing Low: lower than 2 candles before and 2 after
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low < candles[i + 1].low &&
      c.low < candles[i + 2].low
    ) {
      swings.push({ index: i, price: c.low, type: 'LOW' });
    }
  }

  // 2. Liquidity Levels & Sweeps Detection (BSL & SSL)
  swings.forEach((swing) => {
    let swept = false;
    let sweepIndex: number | undefined;

    // Look for liquidity sweep in subsequent candles
    for (let j = swing.index + 1; j < n; j++) {
      const nextC = candles[j];
      if (swing.type === 'HIGH') {
        // Buy-side Liquidity: wick pierced swing high, but close remained near/below
        if (nextC.high > swing.price && nextC.close <= swing.price + (swing.price * 0.0008)) {
          swept = true;
          sweepIndex = j;
          break;
        }
      } else {
        // Sell-side Liquidity: wick pierced swing low, but close remained near/above
        if (nextC.low < swing.price && nextC.close >= swing.price - (swing.price * 0.0008)) {
          swept = true;
          sweepIndex = j;
          break;
        }
      }
    }

    liquidityLevels.push({
      type: swing.type === 'HIGH' ? 'BSL' : 'SSL',
      price: swing.price,
      candleIndex: swing.index,
      swept,
      sweepCandleIndex: sweepIndex,
      label: swing.type === 'HIGH' ? `BSL $${swing.price.toFixed(2)}` : `SSL $${swing.price.toFixed(2)}`,
    });
  });

  // 3. Market Structure Breaks: BOS & CHoCH
  let prevHigh = 0;
  let prevLow = Infinity;
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';

  for (let i = 5; i < n; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Find preceding recent swing high
    const recentHighSwing = swings.filter((s) => s.type === 'HIGH' && s.index < i).pop();
    const recentLowSwing = swings.filter((s) => s.type === 'LOW' && s.index < i).pop();

    if (recentHighSwing && c.close > recentHighSwing.price && prevC.close <= recentHighSwing.price) {
      const isCHoCH = trend === 'BEARISH';
      structureBreaks.push({
        type: isCHoCH ? 'CHoCH' : 'BOS',
        direction: 'BULLISH',
        price: recentHighSwing.price,
        candleIndex: i,
        label: isCHoCH ? `Bullish CHoCH $${recentHighSwing.price.toFixed(2)}` : `Bullish BOS $${recentHighSwing.price.toFixed(2)}`,
      });
      trend = 'BULLISH';
    }

    if (recentLowSwing && c.close < recentLowSwing.price && prevC.close >= recentLowSwing.price) {
      const isCHoCH = trend === 'BULLISH';
      structureBreaks.push({
        type: isCHoCH ? 'CHoCH' : 'BOS',
        direction: 'BEARISH',
        price: recentLowSwing.price,
        candleIndex: i,
        label: isCHoCH ? `Bearish CHoCH $${recentLowSwing.price.toFixed(2)}` : `Bearish BOS $${recentLowSwing.price.toFixed(2)}`,
      });
      trend = 'BEARISH';
    }
  }

  // 4. Fair Value Gaps (FVG) Detection
  for (let i = 2; i < n; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: Gap between Candle 1 High and Candle 3 Low
    if (c3.low > c1.high) {
      const gapSize = c3.low - c1.high;
      if (gapSize > 0.4) {
        // Check if mitigated by later candles
        let mitigated = false;
        for (let m = i + 1; m < n; m++) {
          if (candles[m].low <= c1.high) {
            mitigated = true;
            break;
          }
        }
        fairValueGaps.push({
          type: 'BULLISH_FVG',
          top: c3.low,
          bottom: c1.high,
          candleIndex: i - 1,
          mitigated,
          label: `Bullish FVG [$${c1.high.toFixed(2)} - $${c3.low.toFixed(2)}]`,
        });
      }
    }

    // Bearish FVG: Gap between Candle 1 Low and Candle 3 High
    if (c3.high < c1.low) {
      const gapSize = c1.low - c3.high;
      if (gapSize > 0.4) {
        let mitigated = false;
        for (let m = i + 1; m < n; m++) {
          if (candles[m].high >= c1.low) {
            mitigated = true;
            break;
          }
        }
        fairValueGaps.push({
          type: 'BEARISH_FVG',
          top: c1.low,
          bottom: c3.high,
          candleIndex: i - 1,
          mitigated,
          label: `Bearish FVG [$${c3.high.toFixed(2)} - $${c1.low.toFixed(2)}]`,
        });
      }
    }
  }

  // 5. Order Blocks (OB) Detection
  // Triggered when a strong displacement candle leads to structure break or FVG
  fairValueGaps.forEach((fvg) => {
    const triggerIndex = fvg.candleIndex;
    if (triggerIndex > 0) {
      const obCandle = candles[triggerIndex - 1];
      if (fvg.type === 'BULLISH_FVG' && obCandle.close < obCandle.open) {
        // Last down candle before expansion
        const mitigated = candles.slice(triggerIndex + 2).some((c) => c.low <= obCandle.low);
        orderBlocks.push({
          type: 'BULLISH_OB',
          high: obCandle.high,
          low: obCandle.low,
          candleIndex: triggerIndex - 1,
          mitigated,
          label: `Demand OB [$${obCandle.low.toFixed(2)} - $${obCandle.high.toFixed(2)}]`,
        });
      } else if (fvg.type === 'BEARISH_FVG' && obCandle.close > obCandle.open) {
        // Last up candle before distribution
        const mitigated = candles.slice(triggerIndex + 2).some((c) => c.high >= obCandle.high);
        orderBlocks.push({
          type: 'BEARISH_OB',
          high: obCandle.high,
          low: obCandle.low,
          candleIndex: triggerIndex - 1,
          mitigated,
          label: `Supply OB [$${obCandle.low.toFixed(2)} - $${obCandle.high.toFixed(2)}]`,
        });
      }
    }
  });

  return {
    orderBlocks: orderBlocks.slice(-8), // keep most relevant recent blocks
    fairValueGaps: fairValueGaps.slice(-8),
    liquidityLevels: liquidityLevels.slice(-10),
    structureBreaks: structureBreaks.slice(-8),
    currentTrend: trend,
  };
}
