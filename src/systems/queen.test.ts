import { describe, expect, it } from 'vitest';
import { QUEEN, type ResourceKind } from '../core/constants';
import {
  createQueenState, updateQueen, nestRegen, nestRepair, nextFoodItem,
} from './queen';

function makeHost(resources: Partial<Record<ResourceKind, number>>, workers = 3) {
  const h = {
    stock: { ...resources } as Record<ResourceKind, number>,
    toasts: [] as string[],
    dead: false,
    takeFoodItem(): ResourceKind | null {
      const item = nextFoodItem(h.stock);
      if (item) h.stock[item] -= 1;
      return item;
    },
    workerCount: () => workers,
    toast(text: string) { h.toasts.push(text); },
    onQueenDead() { h.dead = true; },
  };
  return h;
}

describe('fome da rainha (números do original)', () => {
  it('drena ⅓/s', () => {
    const q = createQueenState();
    updateQueen(q, makeHost({}, 0), 3);
    expect(q.hunger).toBeCloseTo(100 - 1, 1);
  });

  it('avisa aos 30 e fica crítica aos 10 (histerese)', () => {
    const q = createQueenState();
    const host = makeHost({ leaf: 0 }, 0);
    q.hunger = 31;
    updateQueen(q, host, 1);
    expect(q.warn30).toBe(false);
    q.hunger = 29;
    updateQueen(q, host, 1);
    expect(q.warn30).toBe(true);
    q.hunger = 9;
    updateQueen(q, host, 1);
    expect(q.warn10).toBe(true);
  });

  it('morre a 0 e chama onQueenDead', () => {
    const q = createQueenState();
    const host = makeHost({}, 0);
    q.hunger = 0.2;
    updateQueen(q, host, 1);
    expect(q.dead).toBe(true);
    expect(host.dead).toBe(true);
  });

  it('operárias alimentam: come 1 item a cada 3s (+8 fome) até 90', () => {
    const q = createQueenState();
    const host = makeHost({ leaf: 10 }, 1);
    q.hunger = 50;
    // 3s → 1 item comido
    updateQueen(q, host, 3);
    expect(host.stock.leaf).toBe(9);
    expect(q.hunger).toBeCloseTo(50 - 1 + 8, 1);
    // alimentada até 90: para de comer
    q.hunger = 89;
    updateQueen(q, host, 3);
    expect(host.stock.leaf).toBe(8);
    q.hunger = 92; // drena para ~91: ainda ≥90, não come
    updateQueen(q, host, 3);
    expect(host.stock.leaf).toBe(8);
    q.hunger = 90; // drena para 89: come de novo
    updateQueen(q, host, 3);
    expect(host.stock.leaf).toBe(7);
  });

  it('ordem fixa de comida: folha → cogumelo → cacto…', () => {
    expect(nextFoodItem({ leaf: 0, mushroom: 2, cactus: 5 } as Record<ResourceKind, number>)).toBe('mushroom');
    expect(nextFoodItem({ banana: 1, crystal: 1 } as Record<ResourceKind, number>)).toBe('banana');
    expect(nextFoodItem({} as Record<ResourceKind, number>)).toBeNull();
  });
});

describe('ninho (regen/reparo do original)', () => {
  it('regenera 1,2/s sem inimigo por perto', () => {
    expect(nestRegen(100, 400, false, 1)).toBeCloseTo(101.2, 5);
  });

  it('não regenera com inimigo por perto nem em ruína', () => {
    expect(nestRegen(100, 400, true, 1)).toBe(100);
    expect(nestRegen(0, 400, false, 1)).toBe(0);
  });

  it('operárias reconstroem ninho destruído a 10/s cada', () => {
    const r = nestRepair(0, 400, 3, 1);
    expect(r.hp).toBeCloseTo(30, 5);
    expect(r.rebuilt).toBe(false);
    const done = nestRepair(399, 400, 1, 1);
    expect(done.hp).toBe(400);
  });
});

describe('constantes da rainha', () => {
  it('valores do bundle', () => {
    expect(QUEEN.HUNGER_MAX).toBe(100);
    expect(QUEEN.HUNGER_DRAIN).toBeCloseTo(1 / 3, 5);
    expect(QUEEN.HUNGER_PER_ITEM).toBe(8);
    expect(QUEEN.FEED_INTERVAL_SEC).toBe(3);
    expect(QUEEN.FEED_UNTIL).toBe(90);
  });
});
