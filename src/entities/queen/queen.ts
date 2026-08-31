/**
 * Rainha — fome, estados, produção serial (docs/02 §L1).
 * Funções puras para faixa/fator facilitam teste; updateQueen usa deps.
 */
import { PRODUCTION, QUEEN } from '../../core/constants';
import type { AntClass, HungerBand, ProductionStage, QueenState } from '../../core/types';

export function hungerBand(hunger: number, hungerMax: number): HungerBand {
  const f = hunger / hungerMax;
  if (f <= 0) return 'starving';
  if (f < QUEEN.CRITICAL_AT) return 'critical';
  if (f < QUEEN.HUNGRY_AT) return 'hungry';
  if (f < QUEEN.SATED_AT) return 'normal';
  return 'sated';
}

/** Multiplicador da VELOCIDADE de produção pela faixa de fome. */
export function productionFactor(band: HungerBand): number {
  switch (band) {
    case 'sated':
      return 1 + QUEEN.PROD_BONUS_SATED; // +10% velocidade
    case 'normal':
      return 1;
    case 'hungry':
      return 1 / (1 + QUEEN.PROD_PENALTY_HUNGRY); // +50% de tempo
    case 'critical':
    case 'starving':
      return 0; // produção parada
  }
}

/** Estágio do item com base no progresso (ovo 6s → larva 8s → pupa 6s). */
export function stageOf(item: { remainingMs: number; totalMs: number }): ProductionStage {
  const done = item.totalMs - item.remainingMs;
  if (done < PRODUCTION.EGG_MS) return 'egg';
  if (done < PRODUCTION.EGG_MS + PRODUCTION.LARVA_MS) return 'larva';
  return 'pupa';
}

export interface QueenDeps {
  /** chamado quando um item termina */
  onProduced: (cls: AntClass) => void;
  /** chamado quando a faixa muda (para toast/evento) */
  onBandChange?: (band: HungerBand) => void;
}

export function createQueen(): QueenState {
  return {
    hp: QUEEN.HP_MAX,
    hpMax: QUEEN.HP_MAX,
    hunger: QUEEN.HUNGER_MAX,
    hungerMax: QUEEN.HUNGER_MAX,
    lastBand: 'sated',
    queue: [],
  };
}

/**
 * Passo de simulação da Rainha. Alimentação é feita pelas operárias
 * (worker.ts chama feedQueen); aqui só drena e produz.
 */
export function updateQueen(q: QueenState, deps: QueenDeps, dt: number): void {
  // ── fome ────────────────────────────────────────────────────────
  q.hunger = Math.max(0, q.hunger - QUEEN.HUNGER_DRAIN * dt);

  const band = hungerBand(q.hunger, q.hungerMax);
  if (band !== q.lastBand) {
    q.lastBand = band;
    deps.onBandChange?.(band);
  }

  // ── dano por inanição (pressão, não morte súbita — docs/02 L1) ──
  if (band === 'starving') {
    q.hp -= QUEEN.DMG_STARVING * dt;
  } else if (band === 'critical') {
    q.hp -= QUEEN.DMG_CRITICAL * dt;
  }
  if (q.hp < 0) q.hp = 0;

  // ── produção serial ─────────────────────────────────────────────
  if (q.queue.length > 0) {
    const item = q.queue[0];
    const factor = productionFactor(band);
    if (factor > 0) {
      item.remainingMs -= factor * 1000 * dt;
      if (item.remainingMs <= 0) {
        q.queue.shift();
        deps.onProduced(item.cls);
      }
    }
  }
}

/** Alimenta a Rainha (chamado pela operária via world). */
export function feedQueen(q: QueenState, foodUnits: number): number {
  const points = foodUnits * QUEEN.FOOD_TO_HUNGER;
  const before = q.hunger;
  q.hunger = Math.min(q.hungerMax, q.hunger + points);
  return q.hunger - before;
}

export function queueAnt(q: QueenState, cls: AntClass): boolean {
  if (q.queue.length >= PRODUCTION.QUEUE_MAX) return false;
  q.queue.push({ cls, remainingMs: PRODUCTION.TOTAL_MS, totalMs: PRODUCTION.TOTAL_MS });
  return true;
}
