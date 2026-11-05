/**
 * Web Audio API synthesizer for institutional alert tones
 * No external audio files needed - works instantly and reliably
 */
export function playSignalChime(type: 'BUY' | 'SELL' | 'NOTIFICATION' | 'CLICK') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'BUY') {
      // Ascending triumphant dual-chime for BUY
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'SELL') {
      // Descending sharp dual-chime for SELL
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25); // A4

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'NOTIFICATION') {
      // Crisp bell chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.08); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Soft tactile click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (err) {
    // Audio context may be blocked before user gesture
    console.debug('Audio chime skipped:', err);
  }
}

/**
 * Android Device Haptic feedback via Vibration API
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(15);
      } else if (type === 'medium') {
        navigator.vibrate(35);
      } else if (type === 'success') {
        navigator.vibrate([25, 40, 45]);
      } else if (type === 'warning') {
        navigator.vibrate([40, 60, 40, 60]);
      }
    } catch {
      // ignore
    }
  }
}
