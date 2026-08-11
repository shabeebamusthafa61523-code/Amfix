/**
 * Synthesizes a pleasant dual-tone alert chime beep using standard Web Audio API.
 * Works across browsers without external audio asset dependencies.
 */
export const playNotificationBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();

    // Helper to play a single tone
    const playTone = (frequency, startTime, duration, volume = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Friendly 2-pulse alert chime (E5 -> A5 tone sequence)
    playTone(659.25, 0, 0.18, 0.3); // E5
    playTone(880.00, 0.18, 0.35, 0.35); // A5

  } catch (err) {
    console.warn("Could not play notification beep sound:", err.message);
  }
};
