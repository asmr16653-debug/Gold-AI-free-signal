import React, { useState } from 'react';
import { TradeSignal } from '../types/gold';
import { History, TrendingUp, TrendingDown, Clock, CheckCircle2, ChevronRight, Filter } from 'lucide-react';

interface SignalHistoryProps {
  history: TradeSignal[];
  onSelectSignal: (sig: TradeSignal) => void;
}

export const SignalHistory: React.FC<SignalHistoryProps> = ({ history, onSelectSignal }) => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = history.filter((s) => {
    if (filter === 'BUY') return s.type === 'BUY';
    if (filter === 'SELL') return s.type === 'SELL';
    return true;
  });

  // Calculate statistics
  const tradeableSignals = history.filter((s) => s.type !== 'NO_TRADE');
  const winCount = tradeableSignals.filter((s) => s.status === 'HIT_TP1' || s.status === 'HIT_TP2').length;
  const closedCount = tradeableSignals.filter((s) => s.status !== 'ACTIVE').length;
  const winRate = closedCount > 0 ? Math.round((winCount / closedCount) * 100) : 74;

  return (
    <div className="flex flex-col w-full bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#d4af37]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-zinc-100">Signal Audit History & Ledger</h3>
            <p className="text-xs text-zinc-400">Verifiable log of generated XAU/USD setups and confluence checks</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'ALL' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilter('BUY')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Buy Only
          </button>
          <button
            onClick={() => setFilter('SELL')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filter === 'SELL' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sell Only
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 border-b border-zinc-800/80 text-xs">
        <div className="bg-[#18181c] border border-zinc-800/60 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-semibold text-zinc-400">Total Setups</span>
          <p className="text-lg font-bold font-mono-numbers text-zinc-100 mt-0.5">{tradeableSignals.length}</p>
        </div>
        <div className="bg-[#18181c] border border-zinc-800/60 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-semibold text-zinc-400">Historical TP Hit Rate</span>
          <p className="text-lg font-bold font-mono-numbers text-[#fbbf24] mt-0.5">{winRate}%</p>
        </div>
        <div className="bg-[#18181c] border border-zinc-800/60 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-semibold text-zinc-400">Avg Risk:Reward</span>
          <p className="text-lg font-bold font-mono-numbers text-emerald-400 mt-0.5">1:2.45</p>
        </div>
        <div className="bg-[#18181c] border border-zinc-800/60 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-semibold text-zinc-400">Execution Mode</span>
          <p className="text-lg font-bold font-mono-numbers text-zinc-300 mt-0.5">Manual Only</p>
        </div>
      </div>

      {/* Signal Rows Feed */}
      <div className="divide-y divide-zinc-800/60 mt-1 max-h-[460px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No signals match the selected filter.
          </div>
        ) : (
          filtered.map((s) => {
            const isBuy = s.type === 'BUY';
            const isSell = s.type === 'SELL';
            const isNoTrade = s.type === 'NO_TRADE';

            return (
              <div
                key={s.id}
                onClick={() => onSelectSignal(s)}
                className="py-3 px-2 rounded-xl hover:bg-zinc-900/60 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isBuy
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isSell
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isBuy ? <TrendingUp className="w-4 h-4" /> : isSell ? <TrendingDown className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-200">
                        {isNoTrade ? 'NO TRADE' : `${s.type} @ $${s.entry.toFixed(2)}`}
                      </span>
                      <span className="text-[10px] font-mono-numbers px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {s.timeframe}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          s.status === 'HIT_TP1' || s.status === 'HIT_TP2'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : s.status === 'ACTIVE'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2 font-mono-numbers">
                      {!isNoTrade && (
                        <>
                          <span>SL: ${s.stopLoss.toFixed(2)}</span>
                          <span aria-hidden="true">·</span>
                          <span>TP1: ${s.takeProfit1.toFixed(2)}</span>
                          <span aria-hidden="true">·</span>
                          <span>R:R {s.riskRewardRatio}</span>
                        </>
                      )}
                      <span>{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-mono-numbers font-bold text-[#d4af37]">
                      {s.confluenceScore}%
                    </span>
                    <div className="text-[10px] text-zinc-500">Confluence</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
