/**
 * Web Audio API synthesizer for instant, zero-latency sound effects.
 * No external audio files needed; 100% reliable in all environments.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('gg_fun_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('gg_fun_muted', String(this.isMuted));
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('gg_fun_muted', String(this.isMuted));
  }

  // Play a short synth tone
  private tone(freq: number, type: OscillatorType, duration: number, gainVal: number = 0.15, pitchDecay: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchDecay !== 0) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freq + pitchDecay),
          this.ctx.currentTime + duration
        );
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio might be blocked before user gesture
    }
  }

  // Connect 4 drop sound (plink)
  public playDrop() {
    this.tone(420, 'sine', 0.12, 0.2, -180);
  }

  // Chess move sound (wooden thud)
  public playMove() {
    this.tone(260, 'triangle', 0.08, 0.22, -60);
  }

  // Chess capture / hit sound
  public playCapture() {
    this.tone(180, 'square', 0.1, 0.2, -80);
    setTimeout(() => this.tone(220, 'triangle', 0.08, 0.15, -40), 40);
  }

  // Check alert sound
  public playCheck() {
    this.tone(600, 'sine', 0.15, 0.2, 50);
    setTimeout(() => this.tone(750, 'sine', 0.2, 0.2, 50), 100);
  }

  // Snake food eat
  public playEat() {
    this.tone(580, 'sine', 0.09, 0.18, 220);
  }

  // Snake game over
  public playGameOver() {
    this.tone(320, 'sawtooth', 0.2, 0.18, -120);
    setTimeout(() => this.tone(220, 'sawtooth', 0.35, 0.18, -100), 150);
  }

  // Victory fanfare
  public playWin() {
    if (this.isMuted) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.tone(freq, 'sine', 0.25, 0.2, 0);
      }, idx * 100);
    });
  }

  // Click / tap
  public playClick() {
    this.tone(800, 'sine', 0.04, 0.08, -300);
  }

  // Correct answer (Logo Quiz)
  public playCorrect() {
    this.tone(523.25, 'sine', 0.1, 0.18, 0);
    setTimeout(() => this.tone(659.25, 'sine', 0.18, 0.2, 0), 90);
  }

  // Incorrect answer
  public playWrong() {
    this.tone(240, 'sawtooth', 0.16, 0.16, -60);
  }

  // Water splash / pour
  public playSplash() {
    this.tone(300 + Math.random() * 200, 'sine', 0.05, 0.04, -150);
  }
}

export const sound = new SoundEngine();
