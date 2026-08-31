/**
 * Movimento: seek com chegada suave + wobble orgânico + separação.
 * Serve para qualquer entidade móvel (formiga, inimigo).
 */
import { BEHAVIOR } from '../core/constants';

export interface Movable {
  x: number;
  y: number;
  dir: 1 | -1;
  walkPhase: number;
  seed: number;
}

/** Move a entidade em direção ao alvo. Retorna true quando chegou. */
export function seek(
  m: Movable,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
): boolean {
  const dx = tx - m.x;
  const dy = ty - m.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= BEHAVIOR.ARRIVE_RADIUS) return true;

  // wobble leve: desvia o rumo de forma senoidal e determinística
  const wob = Math.sin(m.walkPhase * 3 + m.seed * 6.283) * 0.25;
  const base = Math.atan2(dy, dx) + wob;
  const step = Math.min(speed * dt, dist);
  m.x += Math.cos(base) * step;
  m.y += Math.sin(base) * step;
  m.dir = dx >= 0 ? 1 : -1;
  m.walkPhase += (step / 10) * 0.35;
  return false;
}

/** Empurra formigas que se empilham — barato com poucas dezenas. */
export function applySeparation<T extends { x: number; y: number }>(items: readonly T[], dt: number, radius: number): void {
  const r = radius;
  const r2 = r * r;
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((r - d) / r) * 30 * dt;
      const nx = d > 0.001 ? dx / d : 1;
      const ny = d > 0.001 ? dy / d : 0;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }
}

/** Mantém a entidade dentro dos limites do mundo. */
export function clampToWorld(m: { x: number; y: number }, w: number, h: number): void {
  if (m.x < 8) m.x = 8;
  if (m.y < 8) m.y = 8;
  if (m.x > w - 8) m.x = w - 8;
  if (m.y > h - 8) m.y = h - 8;
}
