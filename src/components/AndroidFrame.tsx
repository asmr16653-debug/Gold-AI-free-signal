import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, Smartphone, Monitor } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isAndroidView: boolean;
  onToggleView: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isAndroidView,
  onToggleView,
  onOpenInstall,
  isInstalled,
}) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#070709] text-zinc-100 flex flex-col items-center justify-start p-0 lg:p-4 selection:bg-[#d4af37]/30">
      {/* Top Desktop Global Bar (Switch View & Android Indicator) */}
      <div className="w-full max-w-7xl hidden lg:flex items-center justify-between py-2 px-4 mb-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-zinc-200">Gold AI Pro</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Institutional XAU/USD Android Forex Suite</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenInstall && !isInstalled && (
            <button
              onClick={onOpenInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37]/20 via-[#ffd700]/20 to-[#b8860b]/20 border border-[#d4af37]/40 text-[#ffd700] hover:bg-[#d4af37]/30 font-semibold transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#ffd700]" />
              <span>Install App on Android</span>
            </button>
          )}

          <button
            onClick={onToggleView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium transition-colors"
          >
            {isAndroidView ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Switch to Desktop Terminal Mode</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Switch to Android Mobile Device Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container: Android Smartphone Bezel vs Full-Width Desktop Workspace */}
      {isAndroidView ? (
        <div className="relative w-full max-w-[430px] h-[920px] max-h-[96vh] bg-[#0c0c0e] rounded-none lg:rounded-[48px] border-0 lg:border-[8px] lg:border-[#222226] shadow-2xl flex flex-col overflow-hidden ring-1 ring-zinc-800">
          {/* Android Punch Hole Notch */}
          <div className="hidden lg:flex absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black z-50 ring-1 ring-zinc-800/80 items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#18181b]" />
          </div>

          {/* Android System Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-zinc-300 select-none z-40 bg-[#09090b]/90 backdrop-blur-md">
            <span className="font-mono-numbers">{time || '09:41'}</span>
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-[10px] text-[#fbbf24] font-bold">5G</span>
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono-numbers">98%</span>
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* App Content */}
          <div className="flex-1 overflow-y-auto flex flex-col relative no-scrollbar">
            {children}
          </div>

          {/* Android Bottom Gesture Bar */}
          <div className="w-full py-2 bg-[#09090b] flex items-center justify-center z-40">
            <div className="w-32 h-1 bg-zinc-600 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-7xl flex-1 flex flex-col min-h-screen lg:min-h-[90vh]">
          {children}
        </div>
      )}
    </div>
  );
};
