import React, { useState } from 'react';
import { Settings, Bell, Database, ShieldAlert, Volume2, VolumeX, Smartphone, Key, Info, CheckCircle2 } from 'lucide-react';
import { playSignalChime, triggerHaptic } from '../utils/audio';

interface SettingsViewProps {
  isDemo: boolean;
  onToggleDemo: (val: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (val: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (val: boolean) => void;
  onSendTestNotification: () => void;
  dataSource: string;
  onOpenInstall: () => void;
  isInstalled: boolean;
  isInstallable: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDemo,
  onToggleDemo,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onSendTestNotification,
  dataSource,
  onOpenInstall,
  isInstalled,
  isInstallable,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    setKeySaved(true);
    triggerHaptic('success');
    setTimeout(() => setKeySaved(false), 2500);
  };

  return (
    <div className="flex flex-col w-full bg-[#111114] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5 text-xs text-zinc-300">
      {/* Settings Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-800/80">
        <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-zinc-100">Gold AI Pro Preferences & Config</h3>
          <p className="text-xs text-zinc-400">Market data feeds, push notifications, and risk parameters</p>
        </div>
      </div>

      {/* 0. Install App Option */}
      <div className="p-4 bg-gradient-to-r from-zinc-900 to-[#18181c] rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#ffd700] flex items-center justify-center border border-amber-500/30 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-sm">Install Gold AI Pro App</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                {isInstalled ? 'Installed' : 'Ready'}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-0.5">
              Add to Android home screen for full-screen view, push alerts & offline support.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenInstall}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#b8860b] text-zinc-950 font-bold text-xs shadow-md shadow-[#d4af37]/20 hover:brightness-110 active:scale-[0.98] transition-all shrink-0"
        >
          {isInstalled ? 'App Installed' : 'Install App'}
        </button>
      </div>

      {/* 1. Market Data Connection */}
      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#d4af37]" />
            <span className="font-semibold text-zinc-100">Live Market Data Connection</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isDemo ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isDemo ? 'DEMO MODE' : 'LIVE FEED'}
          </span>
        </div>

        <p className="text-zinc-400 text-[11px] leading-relaxed">
          Active Source: <strong className="text-zinc-200">{dataSource}</strong>
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <div>
            <span className="text-zinc-200 font-medium">Demo Mode Simulation</span>
            <p className="text-[10px] text-zinc-500">
              When enabled or when external feeds are unreachable, synthetic OTC market ticks are used.
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleDemo(!isDemo);
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              isDemo ? 'bg-[#d4af37]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-zinc-950 transition-transform ${
                isDemo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Push Notifications & Alert Signals */}
      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#d4af37]" />
            <span className="font-semibold text-zinc-100">Real-time Push Notifications</span>
          </div>
          <button
            onClick={() => {
              playSignalChime('NOTIFICATION');
              triggerHaptic('medium');
              onSendTestNotification();
            }}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-medium transition-colors"
          >
            Test Alert
          </button>
        </div>

        <p className="text-zinc-400 text-[11px] leading-relaxed">
          Receive instant browser and Android OS notifications when the algorithm detects a $\ge 75\%$ confluence BUY or SELL setup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
          <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              <span>Audio Chimes</span>
            </div>
            <button
              onClick={() => onToggleSound(!soundEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                soundEnabled ? 'bg-[#d4af37]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  soundEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Android Haptics</span>
            </div>
            <button
              onClick={() => onToggleHaptics(!hapticsEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                hapticsEnabled ? 'bg-[#d4af37]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  hapticsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. API Security & Credentials */}
      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[#d4af37]" />
          <span className="font-semibold text-zinc-100">External Market Data Key (Optional)</span>
        </div>
        <p className="text-zinc-400 text-[11px]">
          By default, Gold AI Pro connects to Binance PAXG 1:1 physical gold feed. You can optionally supply your own TwelveData or GoldAPI key:
        </p>
        <div className="flex gap-2 pt-1">
          <input
            type="password"
            placeholder="Optional external API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-[#d4af37]"
          />
          <button
            onClick={handleSaveKey}
            className="px-3 py-1.5 bg-[#d4af37] text-zinc-950 font-bold rounded-lg hover:brightness-110 transition-all text-xs"
          >
            {keySaved ? 'Saved' : 'Save'}
          </button>
        </div>
        {keySaved && (
          <p className="text-emerald-400 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> External key securely saved.
          </p>
        )}
      </div>

      {/* 4. Institutional Compliance & Strict Risk Disclaimer */}
      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldAlert className="w-4 h-4" />
          <span>Institutional Transparency & Risk Disclosure</span>
        </div>
        <p className="leading-relaxed">
          Forex and precious metals (XAU/USD) margin trading carries substantial risk and can result in the loss of your invested capital. 
          Gold AI Pro is an analytical and educational intelligence system designed to detect Smart Money Concepts (SMC) and technical patterns.
        </p>
        <p className="leading-relaxed">
          <strong>Non-Automated Execution:</strong> This application does NOT connect to your brokerage to place automated trades. You retain 100% control over trade decisions and position sizing.
        </p>
        <p className="leading-relaxed">
          <strong>No Accuracy Guarantees:</strong> Past performance and statistical win rates do not guarantee future results. In the event of market closure or feed disruption, Demo Mode will be explicitly indicated.
        </p>
      </div>
    </div>
  );
};
