import { describe, expect, it } from 'vitest';
import { PRODUCTION, QUEEN } from '../../core/constants';
import { createQueen, hungerBand, productionFactor, queueAnt, updateQueen } from './queen';

const DT = 1 / 60;

describe('faixas de fome (docs/02 L1)', () => {
  it('limites corretos', () => {
    expect(hungerBand(100, 100)).toBe('sated');
    expect(hungerBand(75, 100)).toBe('sated');
    expect(hungerBand(50, 100)).toBe('normal');
    expect(hungerBand(25, 100)).toBe('hungry');
    expect(hungerBand(5, 100)).toBe('critical');
    expect(hungerBand(0, 100)).toBe('starving');
  });

  it('fator de produção por faixa', () => {
    expect(productionFactor('sated')).toBeCloseTo(1.1);
    expect(productionFactor('normal')).toBe(1);
    expect(productionFactor('hungry')).toBeCloseTo(1 / 1.5);
    expect(productionFactor('critical')).toBe(0);
    expect(productionFactor('starving')).toBe(0);
  });
});

describe('produção serial', () => {
  it('item demora 20s com Rainha normal', () => {
    const q = createQueen();
    expect(queueAnt(q, 'worker')).toBe(true);
    let produced: string[] = [];
    for (let i = 0; i < Math.ceil(21 / DT); i++) {
      updateQueen(q, { onProduced: (cls) => produced.push(cls) }, DT);
    }
    expect(produced).toEqual(['worker']);
    expect(q.queue).toHaveLength(0);
  });

  it('fila é serial: um por vez, na ordem', () => {
    const q = createQueen();
    queueAnt(q, 'worker');
    queueAnt(q, 'soldier');
    let produced: string[] = [];
    for (let i = 0; i < Math.ceil(41 / DT); i++) {
      updateQueen(q, { onProduced: (cls) => produced.push(cls) }, DT);
    }
    expect(produced).toEqual(['worker', 'soldier']);
  });

  it('fome < 30% deixa a produção 50% mais lenta (30s)', () => {
    const q = createQueen();
    q.hunger = 25; // hungry
    queueAnt(q, 'scout');
    let produced = 0;
    // alimenta a cada passo para manter a faixa "hungry" constante
    for (let i = 0; i < Math.ceil(25 / DT); i++) {
      updateQueen(q, { onProduced: () => produced++ }, DT);
      q.hunger = 25;
    }
    expect(produced).toBe(0); // 25s não bastam (precisa de 30s)
    for (let i = 0; i < Math.ceil(10 / DT); i++) {
      updateQueen(q, { onProduced: () => produced++ }, DT);
      q.hunger = 25;
    }
    expect(produced).toBe(1); // ~30s completam
  });

  it('fome crítica PARA a produção', () => {
    const q = createQueen();
    q.hunger = 5; // critical
    queueAnt(q, 'worker');
    let produced = 0;
    for (let i = 0; i < Math.ceil(60 / DT); i++) {
      updateQueen(q, { onProduced: () => produced++ }, DT);
    }
    expect(produced).toBe(0);
    expect(q.queue).toHaveLength(1);
  });

  it('fila tem teto de 5', () => {
    const q = createQueen();
    for (let i = 0; i < 5; i++) expect(queueAnt(q, 'worker')).toBe(true);
    expect(queueAnt(q, 'worker')).toBe(false);
  });

  it('fome drena 1/s e avisa mudança de faixa', () => {
    const q = createQueen();
    const bands: string[] = [];
    for (let i = 0; i < Math.ceil(75 / DT); i++) {
      updateQueen(q, { onProduced: () => {}, onBandChange: (b) => bands.push(b) }, DT);
    }
    expect(q.hunger).toBeCloseTo(25, 0);
    expect(bands).toContain('normal');
    expect(bands).toContain('hungry');
  });

  it('inanição tira 3 HP/s (pressão, não morte súbita)', () => {
    const q = createQueen();
    q.hunger = 0;
    const hp0 = q.hp;
    for (let i = 0; i < Math.ceil(10 / DT); i++) {
      updateQueen(q, { onProduced: () => {} }, DT);
    }
    expect(q.hp).toBeCloseTo(hp0 - QUEEN.DMG_STARVING * 10, 0);
    expect(q.hp).toBeGreaterThan(0);
  });

  it('tempos dos estágios somam o total', () => {
    expect(PRODUCTION.EGG_MS + PRODUCTION.LARVA_MS + PRODUCTION.PUPA_MS).toBe(PRODUCTION.TOTAL_MS);
  });
});
