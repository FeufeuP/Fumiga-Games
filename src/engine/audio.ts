/**
 * Áudio — WebAudio sintetizado, zero arquivos (técnica do original: createOscillator).
 */
type SfxName = 'click' | 'levelup' | 'wave' | 'boss' | 'dead' | 'deposit' | 'win';

export class AudioManager {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (name) {
      case 'click':
        this.beep(osc, gain, t, 660, 0.05, 0.06, 'square');
        break;
      case 'deposit':
        this.beep(osc, gain, t, 880, 0.06, 0.04, 'triangle');
        break;
      case 'levelup':
        this.beep(osc, gain, t, 523, 0.09, 0.06, 'square');
        this.beep(osc, gain, t + 0.1, 659, 0.09, 0.06, 'square');
        this.beep(osc, gain, t + 0.2, 784, 0.12, 0.06, 'square');
        break;
      case 'wave':
        this.beep(osc, gain, t, 220, 0.18, 0.05, 'sawtooth');
        this.beep(osc, gain, t + 0.18, 220, 0.18, 0.05, 'sawtooth');
        break;
      case 'boss':
        this.beep(osc, gain, t, 110, 0.35, 0.07, 'sawtooth');
        this.beep(osc, gain, t + 0.3, 98, 0.4, 0.07, 'sawtooth');
        break;
      case 'dead':
        this.beep(osc, gain, t, 330, 0.2, 0.06, 'triangle');
        this.beep(osc, gain, t + 0.2, 220, 0.3, 0.06, 'triangle');
        this.beep(osc, gain, t + 0.5, 147, 0.45, 0.06, 'triangle');
        break;
      case 'win':
        this.beep(osc, gain, t, 523, 0.1, 0.06, 'square');
        this.beep(osc, gain, t + 0.12, 784, 0.18, 0.06, 'square');
        break;
    }
  }

  private beep(
    osc: OscillatorNode, gain: GainNode, t: number,
    freq: number, dur: number, vol: number, type: OscillatorType,
  ): void {
    osc.frequency.setValueAtTime(freq, t);
    osc.type = type;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
