import React, { useState } from 'react';
import { TradeSignal } from '../types/gold';
import { ShieldAlert, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Copy, Check, Sparkles, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { playSignalChime, triggerHaptic } from '../utils/audio';

interface SignalCardProps {
  signal: TradeSignal;
  onOpenAIBriefing: () => void;
  isAILoading: boolean;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, onOpenAIBriefing, isAILoading }) => {
  const [copied, setCopied] = useState(false);
  const [showRulesBreakdown, setShowRulesBreakdown] = useState(false);

  const isBuy = signal.type === 'BUY';
  const isSell = signal.type === 'SELL';
  const isNoTrade = signal.type === 'NO_TRADE';

  const handleCopy = () => {
    if (isNoTrade) return;
    const text = `XAU/USD Gold Signal (${signal.timeframe})\nAction: ${signal.type}\nEntry: $${signal.entry.toFixed(2)}\nStop Loss: $${signal.stopLoss.toFixed(2)}\nTP 1: $${signal.takeProfit1.toFixed(2)}\nTP 2: $${signal.takeProfit2.toFixed(2)}\nTP 3: $${signal.takeProfit3.toFixed(2)}\nR:R: ${signal.riskRewardRatio}\nConfluence: ${signal.confluenceScore}%\nGenerated via Gold AI Pro`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHaptic('success');
    playSignalChime('CLICK');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full bg-[#111114] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Ambient background glow based on signal */}
      <div
        className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg shadow-inner ${
              isBuy
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                : isSell
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {isBuy ? <TrendingUp className="w-5 h-5" /> : isSell ? <TrendingDown className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base tracking-tight text-zinc-100">
                {isNoTrade ? 'NO TRADE · WAIT FOR SETUP' : `${signal.type} XAU/USD`}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-mono-numbers">
                {signal.timeframe}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
              <span>Smart Money Confluence</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Confluence Badge */}
        <div className="text-right">
          <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Confluence</div>
          <div
            className={`text-lg font-bold font-mono-numbers ${
              signal.confluenceScore >= 75
                ? 'text-[#fbbf24]'
                : signal.confluenceScore >= 50
                ? 'text-amber-300/80'
                : 'text-zinc-500'
            }`}
          >
            {signal.confluenceScore}%
          </div>
        </div>
      </div>

      {/* Signal Metric Grid */}
      {!isNoTrade ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 border-b border-zinc-800/80">
          {/* Entry */}
          <div className="bg-[#18181b]/80 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-400">Entry Price</span>
            <span className="text-sm sm:text-base font-bold font-mono-numbers text-zinc-100 mt-0.5">
              ${signal.entry.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#d4af37] mt-0.5">Market Order</span>
          </div>

          {/* Stop Loss */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-rose-300">Stop Loss</span>
            <span className="text-sm sm:text-base font-bold font-mono-numbers text-rose-400 mt-0.5">
              ${signal.stopLoss.toFixed(2)}
            </span>
            <span className="text-[10px] text-rose-300/70 mt-0.5 font-mono-numbers">
              {signal.riskDistance.toFixed(2)} pts ({signal.isDemo ? 'Demo' : 'Live'})
            </span>
          </div>

          {/* Take Profit 1 */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-emerald-300">Take Profit 1</span>
            <span className="text-sm sm:text-base font-bold font-mono-numbers text-emerald-400 mt-0.5">
              ${signal.takeProfit1.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-300/70 mt-0.5 font-mono-numbers">R:R {signal.riskRewardRatio}</span>
          </div>

          {/* Take Profit 2 & 3 */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-emerald-300">TP 2 / TP 3</span>
            <span className="text-sm sm:text-base font-bold font-mono-numbers text-emerald-400 mt-0.5">
              ${signal.takeProfit2.toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 font-mono-numbers">TP3: ${signal.takeProfit3.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        /* No Trade State Explanation */
        <div className="py-4 border-b border-zinc-800/80">
          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-100">Trade Conditions Incomplete</p>
              <p className="text-zinc-400 mt-1 leading-relaxed">
                Algorithm requires at least 75% mathematical confluence across Structure, Liquidity Sweeps, and Order Blocks. No high-probability institutional setup currently active on {signal.timeframe}. Capital preservation is active.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Reasons & SMC Checklist */}
      <div className="py-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300">Analysis Rationale & Rules</span>
          <button
            onClick={() => setShowRulesBreakdown(!showRulesBreakdown)}
            className="text-[11px] font-medium text-[#d4af37] hover:underline flex items-center gap-1"
          >
            {showRulesBreakdown ? 'Hide Checklist' : 'Inspect All Rules'}
            {showRulesBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <ul className="space-y-1.5 text-xs text-zinc-300">
          {signal.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-1.5 shrink-0" />
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>

        {/* Expandable Rules Breakdown */}
        {showRulesBreakdown && signal.rules && (
          <div className="mt-3 p-3 bg-zinc-950/70 border border-zinc-800/90 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Institutional Evaluation Matrix
            </div>
            {signal.rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-900 last:border-0">
                <div className="flex items-center gap-2">
                  {rule.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                  )}
                  <div>
                    <span className={rule.passed ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
                      {rule.name}
                    </span>
                    <p className="text-[10px] text-zinc-500 leading-tight">{rule.description}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-mono-numbers font-semibold ${rule.passed ? 'text-[#d4af37]' : 'text-zinc-600'}`}>
                  +{rule.weight}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800/80">
        {!isNoTrade && (
          <button
            onClick={handleCopy}
            className="flex-1 min-h-[44px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            <span>{copied ? 'Signal Copied' : 'Copy Parameters'}</span>
          </button>
        )}

        {/* AI Institutional Briefing Button */}
        <button
          onClick={onOpenAIBriefing}
          disabled={isAILoading}
          className="flex-1 min-h-[44px] px-4 py-2 bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b] hover:brightness-110 active:scale-[0.98] text-zinc-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-zinc-950" />
          <span>{isAILoading ? 'Synthesizing...' : 'AI Institutional Briefing'}</span>
        </button>
      </div>

      {/* Regulatory & Safety Notice */}
      <div className="mt-3 pt-2 text-[10px] text-zinc-500 border-t border-zinc-900/60 flex items-center justify-between">
        <span>Automatic execution disabled · Analytical intelligence only</span>
        <span>Risk:Reward $\ge$ 1:2.0 Filter</span>
      </div>
    </div>
  );
};
