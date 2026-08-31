/**
 * Áudio — valores EXATOS do bundle (Wt/c0/kb/Or/yb):
 *  · SFX: osciladores com rampa exponencial 1e-4;
 *  · Música: sequenciador de 32 passos — melodia (square), baixo (triangle,
 *    tempos pares) e percussão de ruído branco (tempos ímpares), Sr=0.19s,
 *    scheduler de 90ms com lookahead de 0.25s.
 * Persistência [O]: formigueiro-sound-v1 / formigueiro-music-v1.
 */

const KEY_SOUND = 'formigueiro-sound-v1';
const KEY_MUSIC = 'formigueiro-music-v1';

/** [O] melodia r0 — 32 notas */
const MELODY = [
  523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 587.33,
  523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25,
  587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25,
  493.88, 587.33, 698.46, 783.99, 659.25, 587.33, 523.25, 493.88,
];

/** [O] baixo mb — 32 notas */
const BASS = [
  130.81, 130.81, 174.61, 174.61, 196, 196, 146.83, 146.83,
  130.81, 130.81, 174.61, 174.61, 196, 146.83, 130.81, 130.81,
  146.83, 146.83, 196, 196, 146.83, 146.83, 130.81, 130.81,
  123.47, 123.47, 174.61, 174.61, 146.83, 130.81, 123.47, 123.47,
];

const SR = 0.19; // [O] duração do passo

export type SfxName =
  | 'click' | 'collect' | 'deposit' | 'attack' | 'kill'
  | 'win' | 'levelUp' | 'error'
  | 'wave' | 'boss' | 'smash' | 'respawn'; // extras [P] além do original

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicNextT = 0;
  private musicRunning = false;

  soundOn = true;
  musicOn = true;

  constructor() {
    this.soundOn = this.readFlag(KEY_SOUND, true);
    this.musicOn = this.readFlag(KEY_MUSIC, true);
  }

  private readFlag(key: string, def: boolean): boolean {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v === '1';
    } catch {
      return def;
    }
  }

  private writeFlag(key: string, v: boolean): void {
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* ignora */
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ── SFX [O Wt] ───────────────────────────────────────────────────

  play(name: SfxName): void {
    if (!this.soundOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'click': this.wt(ctx, 600, 0.05, 'square', 0.06, t); break;
      case 'collect': this.wt(ctx, 760, 0.06, 'triangle', 0.09, t); break;
      case 'deposit': this.wt(ctx, 440, 0.09, 'sine', 0.10, t); break;
      case 'attack': this.wt(ctx, 180, 0.07, 'sawtooth', 0.08, t); break;
      case 'kill':
        this.wt(ctx, 200, 0.1, 'sawtooth', 0.09, t);
        this.wt(ctx, 120, 0.14, 'sawtooth', 0.09, t + 0.06);
        break;
      case 'win':
        this.wt(ctx, 523, 0.1, 'sine', 0.09, t);
        this.wt(ctx, 659, 0.1, 'sine', 0.09, t + 0.1);
        this.wt(ctx, 784, 0.14, 'sine', 0.09, t + 0.2);
        break;
      case 'levelUp':
        this.wt(ctx, 523, 0.08, 'sine', 0.08, t);
        this.wt(ctx, 659, 0.09, 'sine', 0.08, t + 0.09);
        this.wt(ctx, 880, 0.12, 'sine', 0.08, t + 0.18);
        break;
      case 'error': this.wt(ctx, 140, 0.14, 'square', 0.07, t); break;
      // extras [P] — o original não tinha
      case 'wave':
        this.wt(ctx, 220, 0.18, 'sawtooth', 0.05, t);
        this.wt(ctx, 220, 0.18, 'sawtooth', 0.05, t + 0.18);
        break;
      case 'boss':
        this.wt(ctx, 110, 0.35, 'sawtooth', 0.07, t);
        this.wt(ctx, 98, 0.4, 'sawtooth', 0.07, t + 0.3);
        break;
      case 'smash':
        this.wt(ctx, 90, 0.25, 'sawtooth', 0.10, t);
        this.wt(ctx, 60, 0.3, 'square', 0.08, t + 0.05);
        break;
      case 'respawn': this.wt(ctx, 700, 0.08, 'triangle', 0.05, t); break;
    }
  }

  /** [O Wt] nota com rampa exponencial */
  private wt(
    ctx: AudioContext, freq: number, dur: number,
    type: OscillatorType, vol: number, at: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(1e-4, at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.06);
  }

  // ── Música [O Or/yb/xb] ──────────────────────────────────────────

  setSound(on: boolean): void {
    this.soundOn = on;
    this.writeFlag(KEY_SOUND, on);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    this.writeFlag(KEY_MUSIC, on);
    if (on) this.startMusic();
    else this.stopMusic();
  }

  /** Liga a música se o usuário quiser (primeiro gesto). */
  ensureMusic(): void {
    if (this.musicOn && !this.musicRunning) this.startMusic();
  }

  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicRunning) return;
    this.musicRunning = true;
    this.musicStep = 0;
    this.musicNextT = ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 90);
  }

  stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** [O xb] agenda notas até currentTime+0.25s */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicRunning) return;
    while (this.musicNextT < ctx.currentTime + 0.25) {
      const l = this.musicStep % MELODY.length;
      const i = l % 4;
      // melodia em todo passo
      this.note(ctx, MELODY[l] as number, this.musicNextT, SR * 0.9, 'square', 0.035);
      // baixo nos tempos pares
      if (i % 2 === 0) this.note(ctx, BASS[l] as number, this.musicNextT, SR * 1.8, 'triangle', 0.05);
      // percussão de ruído nos ímpares
      if (i % 2 === 1) this.noise(ctx, this.musicNextT, 0.03, 0.012);
      this.musicNextT += SR;
      this.musicStep++;
    }
  }

  /** [O c0] nota com ataque rápido */
  private note(
    ctx: AudioContext, freq: number, at: number,
    dur: number, type: OscillatorType, vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(1e-4, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(1e-4, at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** [O kb] rajada de ruído branco com decaimento */
  private noise(ctx: AudioContext, at: number, dur: number, vol: number): void {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(at);
  }

  dispose(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}
