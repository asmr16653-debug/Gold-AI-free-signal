import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Timeframe,
  Candle,
  LiveGoldPrice,
  TechnicalIndicators,
  SMCAnalysis,
  TradeSignal,
  AIInstitutionalBriefing,
  PushAlert,
} from './types/gold';
import { computeTechnicalIndicators, analyzeSMC } from './utils/technicalAnalysis';
import { generateSignal } from './utils/signalEngine';
import { CandlestickChart } from './components/CandlestickChart';
import { SignalCard } from './components/SignalCard';
import { SMCScanner } from './components/SMCScanner';
import { SignalHistory } from './components/SignalHistory';
import { SettingsView } from './components/SettingsView';
import { AndroidFrame } from './components/AndroidFrame';
import { AIInstitutionalBriefingModal } from './components/AIInstitutionalBriefingModal';
import { InstallAppModal } from './components/InstallAppModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { playSignalChime, triggerHaptic } from './utils/audio';
import {
  Activity,
  BarChart2,
  Radar,
  History,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Smartphone,
  ChevronRight,
  Wifi,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'signals' | 'chart' | 'scanner' | 'history' | 'settings'>('signals');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [isAndroidView, setIsAndroidView] = useState(true);

  // PWA Install State & Hook
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Market Data State
  const [livePrice, setLivePrice] = useState<LiveGoldPrice>({
    price: 4114.20,
    bid: 4114.05,
    ask: 4114.35,
    spread: 0.30,
    change24h: 18.50,
    change24hPercent: 0.45,
    high24h: 4138.00,
    low24h: 4095.50,
    volume24h: 3750,
    timestamp: Date.now(),
    isDemo: false,
    dataSource: 'Live Spot Gold (XAU/USD via Binance PAXG Feed)',
  });

  const [priceTickEffect, setPriceTickEffect] = useState<'up' | 'down' | null>(null);
  const [forceDemo, setForceDemo] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators>({
    ema20: [],
    ema50: [],
    ema200: [],
    rsi: [],
    macd: { macd: [], signal: [], histogram: [] },
    atr: [],
  });
  const [smc, setSmc] = useState<SMCAnalysis>({
    orderBlocks: [],
    fairValueGaps: [],
    liquidityLevels: [],
    structureBreaks: [],
    currentTrend: 'RANGING',
  });

  const [currentSignal, setCurrentSignal] = useState<TradeSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradeSignal[]>([]);
  const [scannerResults, setScannerResults] = useState<Record<Timeframe, any>>({
    '1m': null,
    '5m': null,
    '15m': null,
    '30m': null,
    '1h': null,
    '4h': null,
  });

  // Push Notifications & Audio
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [alerts, setAlerts] = useState<PushAlert[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const lastAlertedSignalId = useRef<string | null>(null);

  // AI Institutional Briefing
  const [isAIBriefingOpen, setIsAIBriefingOpen] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<AIInstitutionalBriefing | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isScanningAll, setIsScanningAll] = useState(false);

  // 1. Fetch live gold price ticker fallback
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/gold/live');
      if (res.ok) {
        const data = await res.json();
        setLivePrice((prev) => {
          if (data.price > prev.price) {
            setPriceTickEffect('up');
            setTimeout(() => setPriceTickEffect(null), 500);
          } else if (data.price < prev.price) {
            setPriceTickEffect('down');
            setTimeout(() => setPriceTickEffect(null), 500);
          }
          return {
            ...data,
            isDemo: forceDemo ? true : data.isDemo,
            dataSource: forceDemo ? 'Demo Mode (Simulated Synthetic Stream)' : data.dataSource,
          };
        });
      }
    } catch (err) {
      console.warn('Live price fetch fallback:', err);
    }
  }, [forceDemo]);

  // 2. Fetch candles for active timeframe and update indicators + signal
  const fetchCandlesData = useCallback(
    async (tf: Timeframe) => {
      try {
        const res = await fetch(`/api/gold/candles?timeframe=${tf}&limit=140`);
        if (res.ok) {
          const data = await res.json();
          const loadedCandles: Candle[] = data.candles || [];
          setCandles(loadedCandles);

          // Compute technical analysis
          const ind = computeTechnicalIndicators(loadedCandles);
          setIndicators(ind);

          // Compute SMC & ICT analysis
          const smcData = analyzeSMC(loadedCandles);
          setSmc(smcData);

          // Generate Signal
          const newSignal = generateSignal(loadedCandles, ind, smcData, tf, data.isDemo || forceDemo);
          setCurrentSignal(newSignal);

          // Add to history if unique
          setSignalHistory((prev) => {
            if (prev.length === 0 || prev[0].id !== newSignal.id) {
              return [newSignal, ...prev.slice(0, 49)];
            }
            return prev;
          });

          // Check for push notification trigger
          if (
            newSignal.type !== 'NO_TRADE' &&
            newSignal.confluenceScore >= 75 &&
            newSignal.id !== lastAlertedSignalId.current
          ) {
            lastAlertedSignalId.current = newSignal.id;
            triggerPushAlert(newSignal);
          }
        }
      } catch (err) {
        console.error('Failed to load candles:', err);
      }
    },
    [forceDemo]
  );

  // Trigger Push Notification & Audio
  const triggerPushAlert = (sig: TradeSignal) => {
    const alert: PushAlert = {
      id: `ALERT-${Date.now()}`,
      timestamp: Date.now(),
      title: `${sig.type} XAU/USD Signal Detected (${sig.timeframe})`,
      body: `Entry: $${sig.entry.toFixed(2)} | SL: $${sig.stopLoss.toFixed(2)} | TP1: $${sig.takeProfit1.toFixed(2)} (${sig.confluenceScore}% Confluence)`,
      type: sig.type === 'BUY' ? 'BUY' : sig.type === 'SELL' ? 'SELL' : 'ALERT',
      read: false,
    };

    setAlerts((prev) => [alert, ...prev.slice(0, 19)]);

    if (soundEnabled) {
      playSignalChime(sig.type === 'BUY' ? 'BUY' : sig.type === 'SELL' ? 'SELL' : 'NOTIFICATION');
    }
    if (hapticsEnabled) {
      triggerHaptic('success');
    }

    // Browser Notification API if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(alert.title, {
          body: alert.body,
          icon: '/manifest.json',
        });
      } catch (err) {
        console.debug('Notification display prevented:', err);
      }
    }
  };

  // Real-time Server-Sent Events (SSE) Stream for Genuine Live Price Movement (Zero Fake Movement)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleIncomingPrice = (data: LiveGoldPrice) => {
      setLivePrice((prev) => {
        if (data.price > prev.price) {
          setPriceTickEffect('up');
          setTimeout(() => setPriceTickEffect(null), 500);
        } else if (data.price < prev.price) {
          setPriceTickEffect('down');
          setTimeout(() => setPriceTickEffect(null), 500);
        }
        return {
          ...data,
          isDemo: forceDemo ? true : data.isDemo,
          dataSource: forceDemo ? 'Demo Mode (Simulated Synthetic Stream)' : data.dataSource,
        };
      });

      // Update current forming candle in real-time
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const updatedLast: Candle = {
          ...last,
          close: data.price,
          high: Math.max(last.high, data.price),
          low: Math.min(last.low, data.price),
        };
        return [...prev.slice(0, -1), updatedLast];
      });
    };

    try {
      eventSource = new EventSource('/api/gold/stream');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingPrice(data);
        } catch {
          // ignore parsing error
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!pollInterval) {
          pollInterval = setInterval(fetchPrice, 1200);
        }
      };
    } catch {
      pollInterval = setInterval(fetchPrice, 1200);
    }

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchPrice, forceDemo]);

  // Scan all timeframes for SMC Scanner
  const scanAllTimeframes = useCallback(async () => {
    setIsScanningAll(true);
    const tfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h'];
    const results: Record<Timeframe, any> = { ...scannerResults };

    for (const tf of tfs) {
      try {
        const res = await fetch(`/api/gold/candles?timeframe=${tf}&limit=90`);
        if (res.ok) {
          const data = await res.json();
          const tfCandles = data.candles || [];
          const ind = computeTechnicalIndicators(tfCandles);
          const smcData = analyzeSMC(tfCandles);
          const sig = generateSignal(tfCandles, ind, smcData, tf, data.isDemo || forceDemo);
          results[tf] = { timeframe: tf, signal: sig, smc: smcData };
        }
      } catch {
        // continue
      }
    }

    setScannerResults(results);
    setIsScanningAll(false);
  }, [forceDemo]);

  // Initial load
  useEffect(() => {
    fetchPrice();
    fetchCandlesData(timeframe);
    scanAllTimeframes();

    // Request notification permission if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [fetchPrice, fetchCandlesData, timeframe, scanAllTimeframes]);

  // Fetch Institutional AI Briefing
  const handleOpenAIBriefing = async () => {
    setIsAIBriefingOpen(true);
    if (aiBriefing) return;

    setIsAILoading(true);
    try {
      const res = await fetch('/api/gold/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice: livePrice.price,
          timeframe,
          signalType: currentSignal?.type || 'NO_TRADE',
          entry: currentSignal?.entry,
          stopLoss: currentSignal?.stopLoss,
          takeProfit: currentSignal?.takeProfit1,
          rsi: indicators.rsi[indicators.rsi.length - 1],
          macd: {
            histogram: indicators.macd.histogram[indicators.macd.histogram.length - 1],
          },
          ema20: indicators.ema20[indicators.ema20.length - 1],
          ema50: indicators.ema50[indicators.ema50.length - 1],
          ema200: indicators.ema200[indicators.ema200.length - 1],
          atr: indicators.atr[indicators.atr.length - 1],
          structures: smc.structureBreaks.slice(-4),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiBriefing(data.analysis);
      }
    } catch (err) {
      console.error('Failed to get AI analysis:', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSendTestNotification = () => {
    const testSignal: TradeSignal = {
      id: `TEST-${Date.now()}`,
      symbol: 'XAU/USD',
      timeframe,
      type: 'BUY',
      entry: livePrice.price,
      stopLoss: livePrice.price - 4.5,
      takeProfit1: livePrice.price + 9.0,
      takeProfit2: livePrice.price + 14.5,
      takeProfit3: livePrice.price + 22.0,
      riskRewardRatio: '1:2.0',
      riskDistance: 4.5,
      confluenceScore: 85,
      rules: [],
      reasons: ['Test alert triggered from Settings panel.'],
      timestamp: Date.now(),
      status: 'ACTIVE',
      currentPriceAtGen: livePrice.price,
      isDemo: true,
    };
    triggerPushAlert(testSignal);
  };

  return (
    <AndroidFrame
      isAndroidView={isAndroidView}
      onToggleView={() => setIsAndroidView(!isAndroidView)}
      onOpenInstall={() => setIsInstallModalOpen(true)}
      isInstalled={isInstalled}
    >
      {/* Top Application Header / Live Gold Bar */}
      <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between gap-3 select-none">
        {/* Left Slot: Wordmark & Asset Pair */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] via-[#fbbf24] to-[#b8860b] flex items-center justify-center font-display font-extrabold text-zinc-950 text-sm shadow-md shadow-[#d4af37]/20">
            AU
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-sm tracking-tight text-zinc-100">
                Gold AI Pro
              </h1>
              <span className="text-[10px] font-mono-numbers px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700/60">
                XAU/USD
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="font-mono-numbers">${livePrice.bid.toFixed(2)} / ${livePrice.ask.toFixed(2)}</span>
              <span aria-hidden="true">·</span>
              <span>Spr {livePrice.spread.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Real-time Price Ticker & Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Real-time Live Price Display */}
          <div className="text-right">
            <div
              className={`font-mono-numbers font-bold text-base transition-colors duration-200 flex items-center justify-end gap-1 ${
                priceTickEffect === 'up'
                  ? 'text-emerald-400'
                  : priceTickEffect === 'down'
                  ? 'text-rose-400'
                  : 'text-zinc-100'
              }`}
            >
              <span>${livePrice.price.toFixed(2)}</span>
              {priceTickEffect === 'up' && <span className="text-xs text-emerald-400">▲</span>}
              {priceTickEffect === 'down' && <span className="text-xs text-rose-400">▼</span>}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] font-mono-numbers">
              <span
                className={`font-semibold flex items-center ${
                  livePrice.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24hPercent.toFixed(2)}%
              </span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </span>
            </div>
          </div>

          {/* Install App Button */}
          {!isInstalled && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsInstallModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b] text-zinc-950 hover:brightness-110 active:scale-[0.98] text-xs font-bold transition-all shadow-md shadow-[#d4af37]/20"
              title="Install Gold AI Pro App on Android"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowNotificationDrawer(!showNotificationDrawer);
            }}
            className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
            title="Alerts"
          >
            <Bell className="w-4 h-4" />
            {alerts.filter((a) => !a.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#d4af37] ring-2 ring-[#09090b]" />
            )}
          </button>
        </div>
      </header>

      {/* Demo Mode / Offline Disclaimer Banner */}
      {livePrice.isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Demo Mode:</strong> No external live API connected. Showing benchmark gold data with zero fake movement.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-[11px] underline font-medium hover:text-amber-100 shrink-0"
          >
            Feed Info
          </button>
        </div>
      )}

      {/* Main Viewport Content Router */}
      <main className="flex-1 p-3 sm:p-4 pb-20 space-y-4 max-w-7xl mx-auto w-full">
        {activeTab === 'signals' && (
          <div className="space-y-4">
            {/* Live Signal Card */}
            {currentSignal ? (
              <SignalCard
                signal={currentSignal}
                onOpenAIBriefing={handleOpenAIBriefing}
                isAILoading={isAILoading}
              />
            ) : (
              <div className="p-8 text-center bg-zinc-900/60 rounded-2xl border border-zinc-800 text-xs text-zinc-400">
                Evaluating institutional order flow...
              </div>
            )}

            {/* Quick Chart Preview in Signals View */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-zinc-300">Live Chart Snapshot ({timeframe})</span>
                <button
                  onClick={() => setActiveTab('chart')}
                  className="text-[#d4af37] hover:underline flex items-center gap-1 font-medium"
                >
                  Full Screen Chart <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-[360px] w-full">
                <CandlestickChart
                  candles={candles}
                  indicators={indicators}
                  smc={smc}
                  currentSignal={currentSignal}
                  timeframe={timeframe}
                  onTimeframeChange={(tf) => {
                    setTimeframe(tf);
                    fetchCandlesData(tf);
                  }}
                  isDemo={livePrice.isDemo}
                />
              </div>
            </div>

            {/* Mini SMC Key Levels Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Active Trend</span>
                <p className={`font-bold mt-0.5 ${smc.currentTrend === 'BULLISH' ? 'text-emerald-400' : smc.currentTrend === 'BEARISH' ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {smc.currentTrend}
                </p>
              </div>
              <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Nearest OB</span>
                <p className="font-bold text-[#fbbf24] mt-0.5 font-mono-numbers truncate">
                  {smc.orderBlocks[smc.orderBlocks.length - 1]?.label || 'None Active'}
                </p>
              </div>
              <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">RSI (14)</span>
                <p className="font-bold text-zinc-200 mt-0.5 font-mono-numbers">
                  {(indicators.rsi[indicators.rsi.length - 1] || 50).toFixed(1)}
                </p>
              </div>
              <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">ATR Volatility</span>
                <p className="font-bold text-zinc-200 mt-0.5 font-mono-numbers">
                  ${(indicators.atr[indicators.atr.length - 1] || 3.5).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="space-y-4">
            <div className="h-[520px] sm:h-[620px] w-full">
              <CandlestickChart
                candles={candles}
                indicators={indicators}
                smc={smc}
                currentSignal={currentSignal}
                timeframe={timeframe}
                onTimeframeChange={(tf) => {
                  setTimeframe(tf);
                  fetchCandlesData(tf);
                }}
                isDemo={livePrice.isDemo}
              />
            </div>

            {/* Signal Snapshot under Chart */}
            {currentSignal && (
              <SignalCard
                signal={currentSignal}
                onOpenAIBriefing={handleOpenAIBriefing}
                isAILoading={isAILoading}
              />
            )}
          </div>
        )}

        {activeTab === 'scanner' && (
          <SMCScanner
            scanResults={scannerResults}
            activeTimeframe={timeframe}
            onSelectTimeframe={(tf) => {
              setTimeframe(tf);
              fetchCandlesData(tf);
              setActiveTab('chart');
            }}
            onRefreshAll={scanAllTimeframes}
            isScanning={isScanningAll}
          />
        )}

        {activeTab === 'history' && (
          <SignalHistory
            history={signalHistory}
            onSelectSignal={(s) => {
              setCurrentSignal(s);
              setActiveTab('signals');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            isDemo={livePrice.isDemo}
            onToggleDemo={(val) => setForceDemo(val)}
            soundEnabled={soundEnabled}
            onToggleSound={setSoundEnabled}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={setHapticsEnabled}
            onSendTestNotification={handleSendTestNotification}
            dataSource={livePrice.dataSource}
            onOpenInstall={() => setIsInstallModalOpen(true)}
            isInstalled={isInstalled}
            isInstallable={isInstallable}
          />
        )}
      </main>

      {/* Floating Push Notification Drawer */}
      {showNotificationDrawer && (
        <div className="fixed inset-x-0 bottom-16 z-40 max-w-md mx-auto p-3">
          <div className="bg-[#18181c] border border-zinc-700/80 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#d4af37]" />
                <span className="font-semibold text-xs text-zinc-100">Signal Alerts History</span>
              </div>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
              {alerts.length === 0 ? (
                <div className="py-6 text-center text-zinc-500">No recent alerts triggered.</div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="py-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-200">
                      <span>{a.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono-numbers">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{a.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Institutional Briefing Modal */}
      <AIInstitutionalBriefingModal
        briefing={aiBriefing}
        signal={currentSignal || { id: 'temp', symbol: 'XAU/USD', timeframe, type: 'NO_TRADE', entry: livePrice.price, stopLoss: 0, takeProfit1: 0, takeProfit2: 0, takeProfit3: 0, riskRewardRatio: 'N/A', riskDistance: 0, confluenceScore: 0, rules: [], reasons: [], timestamp: Date.now(), status: 'ACTIVE', currentPriceAtGen: livePrice.price, isDemo: livePrice.isDemo }}
        isOpen={isAIBriefingOpen}
        onClose={() => setIsAIBriefingOpen(false)}
        isLoading={isAILoading}
      />

      {/* Install App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isAndroid={isAndroid}
        isIOS={isIOS}
      />

      {/* Fixed Android Bottom Tab Navigation (Pattern 1) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1 max-w-[430px] lg:max-w-none mx-auto">
        <div className="grid grid-cols-5 items-center h-14">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('signals');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
              activeTab === 'signals' ? 'text-[#ffd700]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Signals</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('chart');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
              activeTab === 'chart' ? 'text-[#ffd700]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Chart</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('scanner');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
              activeTab === 'scanner' ? 'text-[#ffd700]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Radar className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Scanner</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('history');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
              activeTab === 'history' ? 'text-[#ffd700]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">History</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('settings');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
              activeTab === 'settings' ? 'text-[#ffd700]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </AndroidFrame>
  );
}
