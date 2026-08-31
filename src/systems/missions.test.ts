import { describe, expect, it } from 'vitest';
import { MISSIONS, ACHIEVEMENTS, trackValue, type MissionTotals } from './missions';

const totals: MissionTotals = {
  resources: 25,
  enemies: 7,
  bosses: 2,
  byResource: { leaf: 12, mushroom: 5 },
  byEnemy: { spider: 3, wasp: 2 },
};

describe('dados de missões e conquistas (exatos do bundle)', () => {
  it('44 missões com recompensa em XP', () => {
    expect(MISSIONS).toHaveLength(44);
    expect(MISSIONS.every((m) => m.rewardXp > 0 && m.goal > 0)).toBe(true);
    expect(MISSIONS[0]?.title).toBe('Primeira colheita');
    expect(MISSIONS[0]?.rewardXp).toBe(30);
  });

  it('27 conquistas com recompensas (XP/recursos/formigas — ids pulam a24/a25/a28 [O])', () => {
    expect(ACHIEVEMENTS).toHaveLength(27);
    const a1 = ACHIEVEMENTS.find((a) => a.id === 'a1');
    expect(a1?.rewardResources).toEqual({ leaf: 10 });
    const a10 = ACHIEVEMENTS.find((a) => a.id === 'a10');
    expect(a10?.rewardAnts).toEqual({ worker: 2, soldier: 1, scout: 1 });
  });
});

describe('trackValue [O _0]', () => {
  it('totaliza por tipo de meta', () => {
    expect(trackValue({ type: 'anyResource' }, totals)).toBe(25);
    expect(trackValue({ type: 'anyEnemy' }, totals)).toBe(7);
    expect(trackValue({ type: 'bosses' }, totals)).toBe(2);
    expect(trackValue({ type: 'resource', kind: 'leaf' }, totals)).toBe(12);
    expect(trackValue({ type: 'enemy', kind: 'spider' }, totals)).toBe(3);
    expect(trackValue({ type: 'resource', kind: 'cactus' }, totals)).toBe(0);
  });
});
