/**
 * Operária — vive DENTRO do ninho (Parte 4.1):
 * busca comida no estoque, alimenta a Rainha e repara o ninho.
 */
import { ANTS, BEHAVIOR, QUEEN } from '../../core/constants';
import type { Ant, AntWorld } from '../../core/types';

export function updateWorker(a: Ant, w: AntWorld, dt: number): void {
  const stats = ANTS.worker;

  // ── Alimenta a Rainha enquanto ela não está saciada ─────────────
  a.timer -= dt;
  if (a.timer <= 0) {
    const hungry = w.queen.hunger < QUEEN.SATED_AT * w.queen.hungerMax;
    if (hungry && w.food() >= 1) {
      if (w.takeFood(1)) {
        w.feedQueen(1);
      }
    }
    a.timer = BEHAVIOR.FEED_COOLDOWN_SEC;
  }

  // ── Reparo contínuo do ninho (Parte 4.1: 10 HP/s por operária) ──
  if (w.nest.hp < w.nest.hpMax) {
    w.repairNest(stats.repairPerSec * dt);
  }
}
