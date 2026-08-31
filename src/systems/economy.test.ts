import { describe, expect, it } from 'vitest';
import { NEST, RESOURCES } from '../core/constants';
import { depositInto, foodValueOf } from './economy';

describe('economia', () => {
  it('folha vale 2 de comida por unidade', () => {
    expect(foodValueOf('leaf', 1)).toBe(RESOURCES.leaf.food);
    expect(foodValueOf('leaf', 3)).toBe(6);
  });

  it('valor médio dos recursos ≈ 2,33 (docs/02 arredonda para ~2,2)', () => {
    const values = Object.values(RESOURCES).map((r) => r.food);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    expect(avg).toBeCloseTo(2.33, 1);
  });

  it('depósito respeita o teto do estoque', () => {
    expect(depositInto(0, 50)).toEqual({ food: 50, accepted: 50 });
    expect(depositInto(190, 20)).toEqual({ food: 200, accepted: 10 });
    expect(depositInto(200, 5)).toEqual({ food: 200, accepted: 0 });
  });

  it('teto é o STORAGE do ninho', () => {
    expect(NEST.STORAGE).toBe(200);
  });
});
