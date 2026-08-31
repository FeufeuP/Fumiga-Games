/**
 * Coletora — procurar → coletar → carregar → voltar → depositar (Fase 2).
 * Foge de ameaças a partir de fleeRange (inimigos chegam na Fase 4).
 */
import { ANTS, BEHAVIOR, RESOURCES } from '../../core/constants';
import { seek } from '../../engine/movement';
import type { Ant, AntWorld } from '../../core/types';

export function updateCollector(a: Ant, w: AntWorld, dt: number): void {
  const stats = ANTS.collector;

  switch (a.state) {
    case 'idle': {
      // procura recurso revelado dentro do alcance de detecção
      const res = w.nearestRevealedResource(a.x, a.y, stats.detect);
      if (res) {
        a.targetResId = res.id;
        a.tx = res.x;
        a.ty = res.y;
        a.state = 'gotoResource';
      } else {
        // nada perto: vagueia em direção a um ponto revelado aleatório
        wanderToRevealed(a, w);
      }
      break;
    }

    case 'gotoResource': {
      if (a.targetResId === null) {
        // vagueio: só caminha até o ponto e volta a procurar
        if (seek(a, a.tx, a.ty, stats.speed, dt)) a.state = 'idle';
        break;
      }
      const res = w.resources.find((r) => r.id === a.targetResId && r.amount > 0);
      if (!res) {
        a.state = 'idle';
        break;
      }
      a.tx = res.x;
      a.ty = res.y;
      if (seek(a, res.x, res.y, stats.speed, dt)) {
        a.state = 'harvest';
        a.timer = BEHAVIOR.HARVEST_SEC_PER_UNIT;
      }
      break;
    }

    case 'harvest': {
      const res = w.resources.find((r) => r.id === a.targetResId && r.amount > 0);
      if (!res) {
        // nó acabou/foi embora — decide entre voltar ou procurar outro
        if (a.carrying > 0) a.state = 'returnNest';
        else a.state = 'idle';
        break;
      }
      a.timer -= dt;
      if (a.timer <= 0) {
        // colheu 1 unidade
        res.amount -= 1;
        a.carrying += 1;
        a.carryKind = res.kind;
        if (res.amount <= 0 && a.carrying < stats.carry) {
          // nó esgotado e ainda tem espaço: tenta outro perto
          const next = w.nearestRevealedResource(a.x, a.y, stats.detect);
          if (next && a.carrying < stats.carry) {
            a.targetResId = next.id;
            a.state = 'gotoResource';
            break;
          }
        }
        if (a.carrying >= stats.carry) {
          a.state = 'returnNest';
        } else {
          a.timer = BEHAVIOR.HARVEST_SEC_PER_UNIT;
        }
      }
      break;
    }

    case 'returnNest': {
      if (seek(a, w.nest.x, w.nest.y, stats.speed, dt)) {
        const kind = a.carryKind;
        const units = a.carrying;
        if (kind && units > 0) {
          w.depositFood(units, kind, 'collector');
        }
        a.carrying = 0;
        a.carryKind = null;
        a.targetResId = null;
        a.state = 'idle';
      }
      break;
    }

    default:
      a.state = 'idle';
  }
}

/** Alvo de vagueio: ponto revelado dentro do mundo, senão perto do ninho. */
function wanderToRevealed(a: Ant, w: AntWorld): void {
  for (let tries = 0; tries < 6; tries++) {
    const tx = w.rng.float(40, w.w - 40);
    const ty = w.rng.float(40, w.h - 40);
    if (w.fog.isRevealed(tx, ty)) {
      a.tx = tx;
      a.ty = ty;
      a.state = 'gotoResource';
      a.targetResId = null; // sem alvo: só caminhada
      return;
    }
  }
  // fallback: orbita o ninho
  const ang = w.rng.next() * Math.PI * 2;
  const dist = w.rng.float(120, 260);
  a.tx = Math.min(w.w - 20, Math.max(20, w.nest.x + Math.cos(ang) * dist));
  a.ty = Math.min(w.h - 20, Math.max(20, w.nest.y + Math.sin(ang) * dist));
  a.state = 'gotoResource';
  a.targetResId = null;
}

/** Comida que a coletora está carregando (para o desenho da carga). */
export function carriedFoodValue(a: Ant): number {
  if (!a.carryKind || a.carrying === 0) return 0;
  return a.carrying * RESOURCES[a.carryKind].food;
}
