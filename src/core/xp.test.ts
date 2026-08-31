import { describe, expect, it } from 'vitest';
import { levelFromXp, xpToNextLevel } from './constants';

describe('curva de XP original (nível n = 50 + 25(n−1))', () => {
  it('nível 1 precisa de 50 XP', () => {
    expect(xpToNextLevel(1)).toBe(50);
  });

  it('nível 5 precisa de 150 XP', () => {
    expect(xpToNextLevel(5)).toBe(150);
  });

  it('é estritamente crescente', () => {
    for (let n = 1; n < 40; n++) {
      expect(xpToNextLevel(n + 1)).toBeGreaterThan(xpToNextLevel(n));
    }
  });

  it('levelFromXp acumulado: 0 XP = nível 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(50 + 75)).toBe(3);
  });
});
