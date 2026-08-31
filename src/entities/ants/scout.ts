/**
 * Exploradora — revela a sombra por onde passa (Parte 4.3).
 * Escolhe destinos preferindo células ainda não reveladas.
 */
import { ANTS, BEHAVIOR } from '../../core/constants';
import { seek } from '../../engine/movement';
import type { Ant, AntWorld } from '../../core/types';

export function updateScout(a: Ant, w: AntWorld, dt: number): void {
  const stats = ANTS.scout;

  switch (a.state) {
    case 'idle': {
      // pausa entre destinos
      a.timer -= dt;
      if (a.timer <= 0) pickNextDestination(a, w);
      break;
    }

    case 'explore': {
      if (seek(a, a.tx, a.ty, stats.speed, dt)) {
        a.state = 'idle';
        a.timer = w.rng.float(BEHAVIOR.SCOUT_IDLE_SEC[0], BEHAVIOR.SCOUT_IDLE_SEC[1]);
      }
      break;
    }

    default:
      pickNextDestination(a, w);
  }
}

function pickNextDestination(a: Ant, w: AntWorld): void {
  const candidate = () => {
    const ang = w.rng.next() * Math.PI * 2;
    const dist = w.rng.float(BEHAVIOR.SCOUT_TRIP_MIN, BEHAVIOR.SCOUT_TRIP_MAX);
    const x = Math.min(w.w - 30, Math.max(30, a.x + Math.cos(ang) * dist));
    const y = Math.min(w.h - 30, Math.max(30, a.y + Math.sin(ang) * dist));
    // prefere não revelado (score baixo); revelado ganha 1 + ruído
    const score = w.fog.isRevealed(x, y) ? 1 + w.rng.next() : w.rng.next() * 0.5;
    return { x, y, score };
  };
  let best = candidate();
  for (let i = 1; i < BEHAVIOR.SCOUT_CANDIDATES; i++) {
    const c = candidate();
    if (c.score < best.score) best = c;
  }
  a.tx = best.x;
  a.ty = best.y;
  a.state = 'explore';
}
