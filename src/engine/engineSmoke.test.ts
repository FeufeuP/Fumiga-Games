/**
 * Smoke test do motor: constroi o GameEngine de verdade e roda a
 * simulação por minutos virtuais. Pega erros de integração que o
 * typecheck não vê (wiring entre engine, mundo, névoa, Rainha e save).
 */
import { describe, beforeAll, afterAll, expect, it } from 'vitest';
import { GameEngine } from './GameEngine';
import { stepSimulation } from './update';

// stubs mínimos de browser (o motor não toca canvas aqui)
const g = globalThis as unknown as Record<string, unknown>;

describe('GameEngine — integração', () => {
  let savedDoc: unknown;
  let savedWin: unknown;
  let savedStorage: unknown;
  let engine: GameEngine;

  beforeAll(() => {
    savedDoc = g.document;
    savedWin = g.window;
    savedStorage = g.localStorage;
    g.document = {
      visibilityState: 'visible',
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    g.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: () => 0,
      clearTimeout: () => {},
      setInterval: () => 0,
      clearInterval: () => {},
    };
    g.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    engine = new GameEngine();
  });

  afterAll(() => {
    g.document = savedDoc;
    g.window = savedWin;
    g.localStorage = savedStorage;
  });

  it('nova partida: população inicial correta e mundo do Campo', () => {
    engine.newGame('campo');
    expect(engine.ants).toHaveLength(6); // 2 op + 2 col + 1 exp + 1 sold
    expect(engine.ants.filter((a) => a.cls === 'worker')).toHaveLength(2);
    expect(engine.ants.filter((a) => a.cls === 'collector')).toHaveLength(2);
    expect(engine.w).toBe(3400);
    expect(engine.h).toBe(2400);
    expect(engine.foodAmount).toBe(20);
  });

  it('2 minutos de simulação: coletoras entregam comida e ninguém explode', () => {
    const food0 = engine.foodAmount;
    for (let i = 0; i < 60 * 120; i++) {
      stepSimulation(engine, 1 / 60);
    }
    // alguma entrega aconteceu (economia viva)
    expect(engine.deliveredTotal).toBeGreaterThan(0);
    // a Rainha não morreu com 2min de jogo normal
    expect(engine.gameOver).toBe(false);
    expect(engine.queen.hp).toBeGreaterThan(0);
    // névoa revelada cresceu com a exploradora
    expect(engine.fog.revealedFraction()).toBeGreaterThan(0.01);
    // comida não é NaN
    expect(Number.isFinite(engine.foodAmount)).toBe(true);
    void food0;
  });

  it('produção via fila: comida vira formiga nova', () => {
    engine.foodAmount = 100;
    const pop0 = engine.ants.length;
    expect(engine.queueAnt('collector')).toBe(true);
    expect(engine.foodAmount).toBe(90); // descontou o custo
    for (let i = 0; i < 60 * 25; i++) {
      stepSimulation(engine, 1 / 60);
      // mantém a Rainha saciada para a produção rodar a 100%
      engine.queen.hunger = 100;
    }
    expect(engine.ants.length).toBe(pop0 + 1);
  });

  it('sem comida: Rainha adoece, entra em inanição e a run termina', () => {
    engine.foodAmount = 0;
    engine.queen.hunger = 0;
    engine.queen.hp = 50;
    for (let i = 0; i < 60 * 30; i++) {
      stepSimulation(engine, 1 / 60);
      engine.queen.hunger = 0; // sem chance de alimentar
    }
    expect(engine.gameOver).toBe(true);
    expect(engine.queen.hp).toBe(0);
  });

  it('população respeita o teto (fila + formigas)', () => {
    const e2 = new GameEngine();
    e2.newGame('campo');
    e2.foodAmount = 9999;
    let queued = 0;
    while (e2.queueAnt('worker')) queued++;
    expect(queued).toBe(2); // 6 formigas + fila até 8
    expect(e2.queen.queue.length).toBe(2);
  });

  it('seed de mapa é fixa por mapa (mundos idênticos entre runs)', () => {
    const e1 = new GameEngine();
    e1.newGame('campo');
    const firstRun = e1.resources.map((r) => `${r.id}:${r.x},${r.y}`).join('|');
    const e2 = new GameEngine();
    e2.newGame('campo');
    const secondRun = e2.resources.map((r) => `${r.id}:${r.x},${r.y}`).join('|');
    expect(firstRun).toBe(secondRun);
  });
});
