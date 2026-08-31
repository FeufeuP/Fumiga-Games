import { describe, expect, it } from 'vitest';
import { UPGRADES, upgradeCost, type ResourceKind } from '../core/constants';
import { emptyUpgrades, canBuy, buy, modsFrom, upgradeById } from './shop';

describe('loja (16 melhorias do original)', () => {
  it('tem as 16 melhorias em 4 categorias', () => {
    expect(UPGRADES).toHaveLength(16);
    const cats = new Set(UPGRADES.map((u) => u.category));
    expect(cats.size).toBe(4);
  });

  it('custo dinâmico: amount + step × compras', () => {
    const def = upgradeById('antlimit');
    expect(def).toBeDefined();
    if (!def) return;
    expect(upgradeCost(def, 0).amount).toBe(15);
    expect(upgradeCost(def, 1).amount).toBe(25);
    expect(upgradeCost(def, 3).amount).toBe(45);
    expect(upgradeCost(def, 0).kind).toBe('leaf');
  });

  it('canBuy respeita saldo e nível máximo', () => {
    const def = upgradeById('speed');
    if (!def) return;
    const levels = emptyUpgrades();
    expect(canBuy(def, levels, { leaf: 0 } as Record<ResourceKind, number>)).toBeNull();
    expect(canBuy(def, levels, { leaf: 30 } as Record<ResourceKind, number>)).toEqual({ kind: 'leaf', amount: 30 });
    levels.speed = def.max;
    expect(canBuy(def, levels, { leaf: 9999 } as Record<ResourceKind, number>)).toBeNull();
  });

  it('buy devolve novos níveis e +5 formigas quando aplicável', () => {
    const def = upgradeById('soldier');
    if (!def) return;
    const r = buy(def, emptyUpgrades());
    expect(r.levels.soldier).toBe(1);
    expect(r.antsToAdd).toBe(5);
    const r2 = buy(upgradeById('speed')!, emptyUpgrades());
    expect(r2.antsToAdd).toBe(0);
  });

  it('modsFrom deriva os multiplicadores', () => {
    const m0 = modsFrom(emptyUpgrades());
    expect(m0.speedMult).toBe(1);
    expect(m0.critChance).toBe(0);
    expect(m0.critMult).toBe(2);
    const m = modsFrom({ ...emptyUpgrades(), speed: 2, strength: 3, hpboost: 1, crit: 4 });
    expect(m.speedMult).toBeCloseTo(1.2, 5);
    expect(m.dmgMult).toBeCloseTo(1.3, 5);
    expect(m.hpMult).toBeCloseTo(1.15, 5);
    expect(m.critChance).toBeCloseTo(0.4, 5);
  });
});
