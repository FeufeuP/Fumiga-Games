import { describe, expect, it } from 'vitest';
import {
  ANT_RESPAWN, BOSS_SMASH, NEST, RESOURCE_REGEN, RALLY, nesthpCost,
} from '../core/constants';
import { respawnSeconds } from './update';
import { modsFrom, emptyUpgrades, rebirthBonus } from '../systems/shop';

describe('respawn do cemitério [O YA]', () => {
  it('base 15s, −30% por nível, mínimo 3s', () => {
    expect(respawnSeconds(0)).toBe(15);
    expect(respawnSeconds(1)).toBeCloseTo(10.5, 5);
    expect(respawnSeconds(2)).toBeCloseTo(6, 5);
    expect(respawnSeconds(5)).toBe(3);
    expect(respawnSeconds(99)).toBe(3);
    expect(ANT_RESPAWN.BASE_SEC).toBe(15);
  });
});

describe('custo multi-recurso do nesthp [O ob(l)]', () => {
  it('nível 1: só folha 30', () => {
    expect(nesthpCost(0)).toEqual([{ kind: 'leaf', amount: 30 }]);
  });

  it('nível 2: folha 40 + cogumelo 30', () => {
    expect(nesthpCost(1)).toEqual([
      { kind: 'leaf', amount: 40 },
      { kind: 'mushroom', amount: 30 },
    ]);
  });

  it('nível 6+: usa os 6 tipos', () => {
    const c = nesthpCost(5);
    expect(c).toHaveLength(6);
    expect(c[5]).toEqual({ kind: 'crystal', amount: 30 });
  });
});

describe('bônus de renascimento [O At(r)]', () => {
  it('multiplicadores por renascimento', () => {
    const b = rebirthBonus(2);
    expect(b.speedPct).toBe(24);
    expect(b.visionPct).toBe(24);
    expect(b.capacity).toBe(2);
    expect(b.damagePct).toBe(20);
    expect(b.hpPct).toBe(30);
    expect(b.xpPct).toBe(40);
  });

  it('modsFrom incorpora o renascimento', () => {
    const m0 = modsFrom(emptyUpgrades(), 0);
    const m2 = modsFrom(emptyUpgrades(), 2);
    expect(m0.speedMult).toBe(1);
    expect(m2.speedMult).toBeCloseTo(1.24, 5);
    expect(m2.carryCap).toBe(3);
    expect(m2.hpMult).toBeCloseTo(1.3, 5);
  });
});

describe('constantes do ciclo A [O]', () => {
  it('rally: ATACAR 6s/20s ×0.55 · COLETA 8s/25s ×1.6', () => {
    expect(RALLY.ATTACK_BUFF_SEC).toBe(6);
    expect(RALLY.ATTACK_CD_SEC).toBe(20);
    expect(RALLY.ATTACK_SPEED_MULT).toBe(0.55);
    expect(RALLY.COLLECT_BUFF_SEC).toBe(8);
    expect(RALLY.COLLECT_CD_SEC).toBe(25);
    expect(RALLY.COLLECT_SPEED_MULT).toBe(1.6);
  });

  it('smash: 15s, raio 90, arremesso 300–380', () => {
    expect(BOSS_SMASH.INTERVAL_SEC).toBe(15);
    expect(BOSS_SMASH.RADIUS).toBe(90);
    expect(BOSS_SMASH.KNOCKBACK_MIN).toBe(300);
    expect(BOSS_SMASH.KNOCKBACK_RANGE).toBe(80);
  });

  it('regeneração: 0.8s, máx 2/tick, piso 15%', () => {
    expect(RESOURCE_REGEN.INTERVAL_SEC).toBe(0.8);
    expect(RESOURCE_REGEN.MAX_PER_TICK).toBe(2);
    expect(RESOURCE_REGEN.FACTOR_MIN).toBe(0.15);
  });

  it('ninho: 400 base +100 por upgrade', () => {
    expect(NEST.HP_MAX).toBe(400);
    expect(NEST.HP_PER_UPGRADE).toBe(100);
  });
});
