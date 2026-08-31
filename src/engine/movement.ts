/**
 * Movimento: seek com chegada suave + wobble orgânico + separação.
 * Simples por ora — pathfinding completo entra quando existirem obstáculos
 * que bloqueiam de verdade (as props atuais são decorativas).
 */
import { BEHAVIOR } from '../core/constants';
import type { Ant } from '../core/types';

/** Move a formiga em direção ao alvo. Retorna true quando chegou. */
export function seek(
  a: Ant,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
): boolean {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= BEHAVIOR.ARRIVE_RADIUS) return true;

  // wobble leve: desvia o rumo de forma senoidal e determinística
  const wob = Math.sin(a.walkPhase * 3 + a.seed * 6.283) * 0.25;
  const base = Math.atan2(dy, dx) + wob;
  const step = Math.min(speed * dt, dist);
  a.x += Math.cos(base) * step;
  a.y += Math.sin(base) * step;
  a.dir = dx >= 0 ? 1 : -1;
  a.walkPhase += (step / 10) * 0.35;
  return false;
}

/** Empurra formigas que se empilham — barato com poucas dezenas. */
export function applySeparation(ants: readonly Ant[], dt: number): void {
  const r = BEHAVIOR.SEPARATION_RADIUS;
  const r2 = r * r;
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i];
    if (a.internal) continue;
    for (let j = i + 1; j < ants.length; j++) {
      const b = ants[j];
      if (b.internal) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((r - d) / r) * 30 * dt; // pressão suave
      const nx = d > 0.001 ? dx / d : 1;
      const ny = d > 0.001 ? dy / d : 0;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }
}

/** Mantém a formiga dentro dos limites do mundo. */
export function clampToWorld(a: Ant, w: number, h: number): void {
  if (a.x < 8) a.x = 8;
  if (a.y < 8) a.y = 8;
  if (a.x > w - 8) a.x = w - 8;
  if (a.y > h - 8) a.y = h - 8;
}
