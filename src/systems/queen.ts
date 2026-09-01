/**
 * Rainha + ninho — números originais do bundle:
 *   fome 100, drena ⅓/s, +8 por item comido (qualquer recurso, ordem fixa),
 *   operárias alimentam a cada 3s cada até fome 90, morre a 0.
 *   Ninho 400 HP, regen 1,2/s sem inimigo a 320px, operárias reparam 10/s.
 */
import { FOOD_ORDER, NEST, QUEEN, type ResourceKind } from '../core/constants';

export interface QueenState {
  hunger: number;
  /** teto de fome — Estômago amplo (carta) aumenta; default 100 [O] */
  hungerMax: number;
  dead: boolean;
  /** cronômetro de alimentação (colônia, escala com nº de operárias) */
  feedT: number;
  warn30: boolean;
  warn10: boolean;
  /** [P 5B] cronômetro do próximo ovo (Postura acelerada/Ninhada dupla) */
  eggT: number;
  /** [P 5B] Saciedade duradoura: fome pausada enquanto >0 */
  satietyT: number;
}

export function createQueenState(hungerMax = QUEEN.HUNGER_MAX): QueenState {
  return { hunger: hungerMax, hungerMax, dead: false, feedT: 0, warn30: false, warn10: false, eggT: 0, satietyT: 0 };
}

export type QueenEvent =
  | { type: 'warn' | 'critical' | 'starving' | 'died' }
  | { type: 'fed'; item: ResourceKind }
  | null;

export interface QueenHost {
  /** retira 1 item de recurso (ordem fixa) — retorna o tipo ou null */
  takeFoodItem(): ResourceKind | null;
  /** nº de operárias vivas */
  workerCount(): number;
  toast(text: string, kind: 'warn' | 'danger' | 'success' | 'info'): void;
  onQueenDead(): void;
}

/** Modificadores de cartas que afetam a Rainha (5A/5B — modifiers.ts). */
export interface QueenOpts {
  /** Apetite contido: ×dreno (1 = neutro) */
  drainMult?: number;
  /** Porção reforçada: +fome por item comido */
  perItemBonus?: number;
  /** Saciedade duradoura: segundos de imunidade após comer */
  satietySec?: number;
}

export function updateQueen(q: QueenState, host: QueenHost, dt: number, opts: QueenOpts = {}): void {
  if (q.dead) return;
  const max = q.hungerMax || QUEEN.HUNGER_MAX;
  const drainMult = opts.drainMult ?? 1;
  const perItem = QUEEN.HUNGER_PER_ITEM + (opts.perItemBonus ?? 0);

  // Saciedade duradoura (carta 5B): imune à fome por um tempo após comer
  if (q.satietyT > 0) {
    q.satietyT = Math.max(0, q.satietyT - dt);
  } else {
    // drena fome [O] ⅓/s (Apetite contido reduz)
    q.hunger = Math.max(0, q.hunger - QUEEN.HUNGER_DRAIN * drainMult * dt);
  }

  // avisos [O] s0=30 e 10 (percentuais do máximo), com histerese
  const warnAt = max * 0.3;
  const warnCrit = max * 0.1;
  if (q.hunger <= warnAt && !q.warn30) {
    q.warn30 = true;
    host.toast('A rainha está com fome! Leve comida ao ninho.', 'warn');
  }
  if (q.hunger > warnAt + max * 0.1) q.warn30 = false;
  if (q.hunger <= warnCrit && q.hunger > 0 && !q.warn10) {
    q.warn10 = true;
    host.toast('A rainha está FAMINTA! Ela vai morrer!', 'warn');
  }
  if (q.hunger > warnCrit + max * 0.1) q.warn10 = false;

  // morte [O]
  if (q.hunger <= 0) {
    q.dead = true;
    host.onQueenDead();
    return;
  }

  // alimentação [O]: feedT -= operárias×dt; a cada 3s come 1 item (+8+bonus)
  const workers = host.workerCount();
  const feedUntil = max * 0.9; // [O] i0=90 de 100
  if (workers > 0 && q.hunger < feedUntil) {
    q.feedT -= workers * dt;
    while (q.feedT < 0 && q.hunger < feedUntil) {
      q.feedT += QUEEN.FEED_INTERVAL_SEC;
      const item = host.takeFoodItem();
      if (!item) {
        q.feedT = 0;
        break;
      }
      q.hunger = Math.min(max, q.hunger + perItem);
      if (opts.satietySec && opts.satietySec > 0) q.satietyT = opts.satietySec;
    }
  } else if (q.feedT < 0) {
    q.feedT = 0;
  }
}

/** Regeneração do ninho fora de combate [O] FA=1.2/s. */
export function nestRegen(hp: number, hpMax: number, enemyNear: boolean, dt: number): number {
  if (hp <= 0 || enemyNear) return hp;
  return Math.min(hpMax, hp + NEST.REGEN_PER_SEC * dt);
}

/** Reparo por operárias com ninho destruído [O] QA=10/s cada. */
export function nestRepair(hp: number, hpMax: number, workers: number, dt: number): { hp: number; rebuilt: boolean } {
  if (hp >= hpMax || workers <= 0) return { hp, rebuilt: false };
  const hp2 = Math.min(hpMax, hp + NEST.REPAIR_PER_WORKER * workers * dt);
  return { hp: hp2, rebuilt: hp2 >= hpMax && hp <= 0 };
}

/** Ordem fixa de recursos comidos [O] f0. */
export function nextFoodItem(resources: Record<ResourceKind, number>): ResourceKind | null {
  for (const kind of FOOD_ORDER) {
    if ((resources[kind] ?? 0) > 0) return kind;
  }
  return null;
}
