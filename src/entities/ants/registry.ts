/**
 * Registro de classes de formiga — stats vivem em core/constants.ts (ANTS).
 * A fábrica cria a entidade; comportamentos ficam um arquivo por classe.
 */
import { ANTS, FOG } from '../../core/constants';
import type { Ant, AntClass } from '../../core/types';

export interface AntClassInfo {
  cls: AntClass;
  name: string;
  desc: string;
  costFood: number;
  costChitin: number;
  unlocked: boolean;
}

export const ANT_CLASSES: Record<AntClass, AntClassInfo> = {
  worker: {
    cls: 'worker', name: 'Operária', desc: 'Alimenta a Rainha e repara o ninho.',
    costFood: ANTS.worker.costFood, costChitin: ANTS.worker.costChitin, unlocked: ANTS.worker.unlocked,
  },
  collector: {
    cls: 'collector', name: 'Coletora', desc: 'Coleta recursos na área descoberta.',
    costFood: ANTS.collector.costFood, costChitin: ANTS.collector.costChitin, unlocked: ANTS.collector.unlocked,
  },
  scout: {
    cls: 'scout', name: 'Exploradora', desc: 'Revela a sombra do mapa por onde passa.',
    costFood: ANTS.scout.costFood, costChitin: ANTS.scout.costChitin, unlocked: ANTS.scout.unlocked,
  },
  soldier: {
    cls: 'soldier', name: 'Soldado', desc: 'Ataca inimigos próximos (Fase 4).',
    costFood: ANTS.soldier.costFood, costChitin: ANTS.soldier.costChitin, unlocked: ANTS.soldier.unlocked,
  },
  defender: {
    cls: 'defender', name: 'Defensora', desc: 'Anel de defesa ao redor do ninho.',
    costFood: ANTS.defender.costFood, costChitin: ANTS.defender.costChitin, unlocked: ANTS.defender.unlocked,
  },
  toxic: {
    cls: 'toxic', name: 'Tóxica', desc: 'Ácido corrosivo à distância.',
    costFood: ANTS.toxic.costFood, costChitin: ANTS.toxic.costChitin, unlocked: ANTS.toxic.unlocked,
  },
  giant: {
    cls: 'giant', name: 'Gigante', desc: 'Tanque de dano em área.',
    costFood: ANTS.giant.costFood, costChitin: ANTS.giant.costChitin, unlocked: ANTS.giant.unlocked,
  },
};

let nextAntId = 1;

export function resetAntIds(): void {
  nextAntId = 1;
}

/** Cria a formiga já no estado inicial do comportamento da classe. */
export function createAnt(cls: AntClass, x: number, y: number, rngFloat: () => number): Ant {
  const stats = ANTS[cls];
  const a: Ant = {
    id: nextAntId++,
    cls,
    x,
    y,
    dir: 1,
    hp: stats.hp,
    hpMax: stats.hp,
    carrying: 0,
    carryKind: null,
    state: 'idle',
    timer: 0,
    targetResId: null,
    tx: x,
    ty: y,
    walkPhase: 0,
    seed: rngFloat(),
    internal: cls === 'worker',
  };
  switch (cls) {
    case 'collector':
      a.state = 'idle'; // procura recurso no primeiro update
      break;
    case 'scout':
      a.state = 'explore';
      break;
    case 'soldier':
      a.state = 'patrol';
      break;
    default:
      a.state = 'idle';
  }
  return a;
}

/** Raio de revelação da formiga na névoa (FOG). */
export function revealRadiusOf(cls: AntClass): number {
  return cls === 'scout' ? FOG.SCOUT_RADIUS : FOG.PASSIVE_RADIUS;
}
