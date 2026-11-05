import React from 'react';
import { AIInstitutionalBriefing, TradeSignal } from '../types/gold';
import { X, Sparkles, ShieldAlert, Compass, Globe2, AlertOctagon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AIInstitutionalBriefingModalProps {
  briefing: AIInstitutionalBriefing | null;
  signal: TradeSignal;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

export const AIInstitutionalBriefingModal: React.FC<AIInstitutionalBriefingModalProps> = ({
  briefing,
  signal,
  isOpen,
  onClose,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121215] border border-amber-500/40 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        {/* Top Gold Bar */}
        <div className="h-1 bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#ffd700] flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-zinc-100 flex items-center gap-2">
                Institutional AI Gold Synthesis
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-semibold border border-zinc-700">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Smart Money Order Flow & Macro Precious Metals Briefing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">Synthesizing institutional order flow...</p>
              <p className="text-xs text-zinc-400">Processing liquidity pools, market structure shifts, and macroeconomic catalysts.</p>
            </div>
          ) : briefing ? (
            <>
              {/* Institutional Bias Banner */}
              <div className="p-3.5 bg-gradient-to-r from-zinc-900 to-[#18181c] border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">Institutional Bias</div>
                  <div className="text-sm font-bold text-zinc-100 mt-0.5">{briefing.institutionalBias}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-zinc-400">Invalidation Level</div>
                  <div className="text-sm font-bold font-mono-numbers text-rose-400 mt-0.5">
                    ${briefing.invalidationLevel?.toFixed(2) || signal.stopLoss.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Core Takeaway */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                  <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Strategic Executive Summary</span>
                </div>
                <p className="text-zinc-200 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 leading-relaxed">
                  {briefing.keyTakeaway}
                </p>
              </div>

              {/* Smart Money Context */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>ICT / Smart Money Mechanics</span>
                </div>
                <p className="text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                  {briefing.smartMoneyContext}
                </p>
              </div>

              {/* Macro Catalysts */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Macroeconomic Drivers (DXY & Yields)</span>
                </div>
                <p className="text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                  {briefing.macroCatalyst}
                </p>
              </div>

              {/* Trade Execution Advice */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Risk Management Guidance</span>
                </div>
                <p className="text-zinc-300 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl leading-relaxed text-amber-200">
                  {briefing.tradeExecutionAdvice}
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-zinc-400">
              Unable to load briefing. Please try again.
            </div>
          )}

          {/* Compliance notice */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-[10px] text-zinc-400 leading-normal flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Compliance & Risk Disclosure:</strong> Gold AI Pro does not provide financial advice, guarantee profitability, or execute automated trades. All precious metals forex trading entails significant risk of capital loss.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#0e0e11] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
