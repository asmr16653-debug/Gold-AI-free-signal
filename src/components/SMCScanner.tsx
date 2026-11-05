import React from 'react';
import { Timeframe, TradeSignal, SMCAnalysis } from '../types/gold';
import { Radar, ArrowUpRight, ArrowDownRight, Minus, Layers, ExternalLink } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface TimeframeScanResult {
  timeframe: Timeframe;
  signal: TradeSignal;
  smc: SMCAnalysis;
}

interface SMCScannerProps {
  scanResults: Record<Timeframe, TimeframeScanResult | null>;
  activeTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  onRefreshAll: () => void;
  isScanning: boolean;
}

export const SMCScanner: React.FC<SMCScannerProps> = ({
  scanResults,
  activeTimeframe,
  onSelectTimeframe,
  onRefreshAll,
  isScanning,
}) => {
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h'];

  return (
    <div className="flex flex-col w-full bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Scanner Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-zinc-100">Multi-Timeframe SMC Scanner</h3>
            <p className="text-xs text-zinc-400">Institutional order block & liquidity mapping across all timeframes</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onRefreshAll();
          }}
          disabled={isScanning}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isScanning ? 'Scanning...' : 'Scan All'}
        </button>
      </div>

      {/* Grid of Timeframe Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        {timeframes.map((tf) => {
          const item = scanResults[tf];
          const isSelected = activeTimeframe === tf;

          if (!item) {
            return (
              <div
                key={tf}
                className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col justify-between h-36 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-numbers text-xs font-bold text-zinc-400">{tf}</span>
                  <span className="text-[10px] text-zinc-500">Scanning data...</span>
                </div>
              </div>
            );
          }

          const { signal, smc } = item;
          const isBuy = signal.type === 'BUY';
          const isSell = signal.type === 'SELL';
          const isNoTrade = signal.type === 'NO_TRADE';

          const nearestOB = smc.orderBlocks.find((ob) => !ob.mitigated);
          const nearestFVG = smc.fairValueGaps.find((fvg) => !fvg.mitigated);
          const nearestLiq = smc.liquidityLevels.find((l) => !l.swept);

          return (
            <div
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-900/90 border-[#d4af37] ring-1 ring-[#d4af37]/40 shadow-lg'
                  : 'bg-[#151518] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#18181c]'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-numbers text-sm font-bold text-zinc-100 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50">
                      {tf}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        isBuy
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isSell
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : isSell ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      {signal.type}
                    </span>
                  </div>

                  <span className="text-xs font-mono-numbers font-bold text-[#d4af37]">
                    {signal.confluenceScore}%
                  </span>
                </div>

                {/* SMC Elements Info */}
                <div className="mt-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Structure Trend:</span>
                    <strong className={`font-medium ${smc.currentTrend === 'BULLISH' ? 'text-emerald-400' : smc.currentTrend === 'BEARISH' ? 'text-rose-400' : 'text-zinc-300'}`}>
                      {smc.currentTrend}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Nearest OB:</span>
                    <span className="text-zinc-300 truncate max-w-[140px] font-mono-numbers text-[10px]">
                      {nearestOB ? nearestOB.label : 'None Active'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Liquidity Pool:</span>
                    <span className="text-zinc-300 truncate max-w-[140px] font-mono-numbers text-[10px]">
                      {nearestLiq ? nearestLiq.label : 'In Equilibrium'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">
                  {isNoTrade ? 'Awaiting Confluence' : `Entry: $${signal.entry.toFixed(2)}`}
                </span>
                <span className="text-[#d4af37] flex items-center gap-1 font-medium hover:underline">
                  View Chart <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
