import { describe, expect, it } from 'vitest';
import { xpToNextLevel } from './constants';

describe('curva de XP (D3b — 10n + 8n²)', () => {
  it('nível 1 = 18 XP', () => {
    expect(xpToNextLevel(1)).toBe(18);
  });

  it('nível 5 = 250 XP', () => {
    expect(xpToNextLevel(5)).toBe(250);
  });

  it('nível 9 = 738 XP (meta: nível 9 na onda 10)', () => {
    expect(xpToNextLevel(9)).toBe(738);
  });

  it('nível 20 = 3.400 XP (6,5× mais lenta que a linear do original)', () => {
    expect(xpToNextLevel(20)).toBe(3400);
  });

  it('é estritamente crescente', () => {
    for (let n = 1; n < 40; n++) {
      expect(xpToNextLevel(n + 1)).toBeGreaterThan(xpToNextLevel(n));
    }
  });
});
