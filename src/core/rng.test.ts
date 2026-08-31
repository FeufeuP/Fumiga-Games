import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('RNG semeado', () => {
  it('mesma seed → mesma sequência (runs reproduzíveis)', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes → sequências diferentes', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() fica em [0, 1)', () => {
    const r = new Rng(999);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() respeita os limites inclusive', () => {
    const r = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.has(2)).toBe(true);
    expect(seen.has(5)).toBe(true);
  });

  it('fork() consome exatamente um número da sequência principal', () => {
    const a = new Rng(42);
    const first = a.next();
    a.fork(); // fork avança o estado interno em 1
    const rest = [a.next(), a.next(), a.next()];
    const b = new Rng(42);
    const seq = [b.next(), b.next(), b.next(), b.next(), b.next()];
    expect(first).toBe(seq[0]);
    expect(rest).toEqual([seq[2], seq[3], seq[4]]);
  });
});
