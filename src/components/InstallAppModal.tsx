import React from 'react';
import { Download, X, Smartphone, CheckCircle, Share2, MoreVertical, ShieldCheck, Sparkles } from 'lucide-react';
import { triggerHaptic, playSignalChime } from '../utils/audio';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  isInstallable: boolean;
  isInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstallable,
  isInstalled,
  isAndroid,
  isIOS,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    playSignalChime('CLICK');
    const result = await onInstall();
    if (result === 'accepted') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#121215] border border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
        {/* Top Gold Accent Line */}
        <div className="h-1 bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b]" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#ffd700] to-[#b8860b] text-zinc-950 flex items-center justify-center shadow-lg shadow-[#d4af37]/25 font-display font-black text-sm">
              AU
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-zinc-100 flex items-center gap-1.5">
                Install Gold AI Pro
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  Android APK / PWA
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Native Android app experience with real-time push signals</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                <strong>App is already installed!</strong> You are running Gold AI Pro in standalone native mode.
              </span>
            </div>
          ) : (
            <>
              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center gap-2 text-zinc-300">
                  <Smartphone className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span>Full Screen Native App</span>
                </div>
                <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center gap-2 text-zinc-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant Push Alerts</span>
                </div>
                <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center gap-2 text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Zero Lag Real-Time Ticks</span>
                </div>
                <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center gap-2 text-zinc-300">
                  <Download className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Offline Chart Cache</span>
                </div>
              </div>

              {/* Install Button if browser supports 1-tap install */}
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b] text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App on this Device</span>
                </button>
              )}

              {/* Step-by-Step Android Guide */}
              <div className="p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-zinc-200 text-xs">
                  <Smartphone className="w-4 h-4 text-[#d4af37]" />
                  <span>How to Install on Android Phone / Tablet:</span>
                </div>

                <div className="space-y-2 text-[11px] text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#ffd700] font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span>
                      In <strong>Google Chrome</strong> or Samsung Internet, tap the <strong>Menu icon</strong> (three vertical dots <MoreVertical className="w-3.5 h-3.5 inline text-zinc-400" />) in the top-right.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#ffd700] font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span>
                      Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#ffd700] font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <span>
                      Confirm <strong>"Install"</strong>. The Gold AI Pro app icon will appear directly on your home screen and Android app drawer!
                    </span>
                  </div>
                </div>
              </div>

              {/* iOS Guide if on Apple device */}
              {isIOS && (
                <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 space-y-1.5">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>On iPhone / iPad (Safari):</span>
                  </div>
                  <p className="text-zinc-400">
                    Tap the <strong>Share</strong> icon at the bottom of Safari, scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#0e0e11] flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono-numbers">v2.4.0 · PWA Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
