/**
 * Soldado — patrulha o anel ao redor do ninho (Parte 4.4).
 * Caça/aggro entra na Fase 4 com os inimigos.
 */
import { ANTS, BEHAVIOR } from '../../core/constants';
import { seek } from '../../engine/movement';
import type { Ant, AntWorld } from '../../core/types';

export function updateSoldier(a: Ant, w: AntWorld, dt: number): void {
  const stats = ANTS.soldier;

  switch (a.state) {
    case 'idle': {
      a.timer -= dt;
      if (a.timer <= 0) pickPatrolPoint(a, w);
      break;
    }

    case 'patrol': {
      if (seek(a, a.tx, a.ty, stats.speed, dt)) {
        a.state = 'idle';
        a.timer = w.rng.float(BEHAVIOR.SOLDIER_PAUSE_SEC[0], BEHAVIOR.SOLDIER_PAUSE_SEC[1]);
      }
      break;
    }

    default:
      pickPatrolPoint(a, w);
  }
}

function pickPatrolPoint(a: Ant, w: AntWorld): void {
  const ang = w.rng.next() * Math.PI * 2;
  const dist = w.rng.float(BEHAVIOR.SOLDIER_PATROL_MIN, BEHAVIOR.SOLDIER_PATROL_MAX);
  a.tx = Math.min(w.w - 20, Math.max(20, w.nest.x + Math.cos(ang) * dist));
  a.ty = Math.min(w.h - 20, Math.max(20, w.nest.y + Math.sin(ang) * dist));
  a.state = 'patrol';
}
