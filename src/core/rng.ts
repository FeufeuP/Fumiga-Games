/**
 * RNG semeado — runs reproduzíveis (regra de engenharia #3 do plano).
 * Nada de Math.random() solto pelos sistemas.
 * Algoritmo: mulberry32 — pequeno, rápido, boa distribuição para jogos.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** float [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** float [a, b) */
  float(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** inteiro [a, b] inclusive */
  int(a: number, b: number): number {
    return Math.floor(this.float(a, b + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)] as T;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Stream independente — não atrapalha a sequência principal. */
  fork(): Rng {
    return new Rng(Math.floor(this.next() * 0xffffffff));
  }
}
