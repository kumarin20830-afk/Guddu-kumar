class AudioService {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playTick() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }

  playWin() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      // Play a quick ascending major arpeggio (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50]; 
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use sine for a clean game sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.1));
        
        // Short envelop per note
        gain.gain.setValueAtTime(0, now + (i * 0.1));
        gain.gain.linearRampToValueAtTime(0.15, now + (i * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.1) + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + (i * 0.1));
        osc.stop(now + (i * 0.1) + 0.6);
      });

      // Add a sparkly "ting" at the end
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, now + 0.4); // G6
      osc2.frequency.linearRampToValueAtTime(2093.00, now + 0.8); // C7
      
      gain2.gain.setValueAtTime(0, now + 0.4);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.5);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.4);
      osc2.stop(now + 1.2);

    } catch (e) {
      console.error("Audio play failed", e);
    }
  }

  playError() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }
}

export const audioService = new AudioService();