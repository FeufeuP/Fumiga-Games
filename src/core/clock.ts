/**
 * Tempo, pausa e delta fixo (regra de engenharia #4).
 * Simulação a 60 Hz lógico; interpolação/visual usa o dt real do frame.
 */
import { ENGINE, WORLD } from './constants';

export const FIXED_DT = 1 / WORLD.SIM_HZ;

export class Clock {
  paused = false;
  runSeconds = 0;
  private acc = 0;
  private last = 0;
  private started = false;

  reset(nowMs: number): void {
    this.last = nowMs / 1000;
    this.acc = 0;
    this.runSeconds = 0;
    this.started = true;
  }

  /** Processa um frame; roda `step` N× com dt fixo. Retorna passos executados. */
  frame(nowMs: number, step: (dt: number) => void): number {
    if (!this.started) this.reset(nowMs);
    const now = nowMs / 1000;
    let elapsed = now - this.last;
    this.last = now;
    if (this.paused) {
      this.acc = 0;
      return 0;
    }
    elapsed = Math.min(elapsed, ENGINE.MAX_FRAME_SEC);
    this.acc += elapsed;
    let n = 0;
    while (this.acc >= FIXED_DT && n < ENGINE.MAX_STEPS_PER_FRAME) {
      step(FIXED_DT);
      this.acc -= FIXED_DT;
      this.runSeconds += FIXED_DT;
      n++;
      // painel de cartas/gameOver pode pausar DENTRO do passo — congela já
      if (this.paused) break;
    }
    // Se ainda sobrar dívida (aba voltou do background), descarta — sem spiral.
    if (this.acc > FIXED_DT) this.acc = 0;
    return n;
  }
}
