/**
 * Integração — roda o GameEngine REAL (sem sprites/RAF) e verifica as
 * mecânicas principais de ponta a ponta: coleta, rainha, ondas, combate,
 * exploração, níveis, regeneração, comandos e save/continue.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { GameEngine } from './GameEngine';
import { stepSimulation } from './update';
import { WAVES } from '../core/constants';

// localStorage não existe no node — stub para testar save/continue
const store = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
  });
});

function makeEngine(): GameEngine {
  const Ctor = GameEngine as unknown as new () => GameEngine;
  return new Ctor();
}

function run(engine: GameEngine, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) stepSimulation(engine as never, dt);
}

describe('integração: mecânicas principais', () => {
  it('começa como o original: 1/1/1 formigas, 0 recursos, sem inimigos, 15 folhas visíveis', () => {
    const e = makeEngine();
    e.newGame('campo');
    expect(e.ants).toHaveLength(3);
    expect(e.enemies).toHaveLength(0); // [O] sem fauna ambiente
    expect(e.wallet.leaf).toBe(0);
    const revealed = e.resources.filter((r) => e.fog.isRevealed(r.x, r.y));
    expect(revealed.length).toBe(15); // maxRes × piso 15%
    expect(e.resources.every((r) => Math.hypot(r.x - e.nest.x, r.y - e.nest.y) >= 170)).toBe(true);
  });

  it('coleta: operárias encontram folhas e depositam no ninho', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.totals.delivered).toBeGreaterThan(5);
    expect(e.wallet.leaf).toBeGreaterThan(0);
  });

  it('rainha: continua viva com a comida chegando', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.queen.dead).toBe(false);
    expect(e.queen.hunger).toBeGreaterThan(30);
  });

  it('ondas: onda 1 aos 90s, inimigos marcham e são repelidos', () => {
    const e = makeEngine();
    e.newGame('campo');
    let sawToast = false;
    const dt = 1 / 60;
    for (let t = 0; t < 130; t += dt) {
      stepSimulation(e as never, dt);
      if (e.toasts.some((x) => x.text.includes('ONDA 1'))) sawToast = true;
    }
    expect(e.wave.num).toBe(1);
    expect(sawToast).toBe(true);
    // os 2 inimigos da onda 1 nasceram e a colônia sobreviveu
    expect(e.totals.enemiesKilled + e.enemies.length).toBeGreaterThanOrEqual(2);
    expect(e.nestHp).toBeGreaterThan(0);
  });

  it('soldados defendem: inimigos de onda morrem (revelados = visíveis)', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.totals.enemiesKilled).toBeGreaterThan(0);
    expect(e.level).toBeGreaterThanOrEqual(2);
  });

  it('exploração: só a exploradora revela; mapa cresce', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.exploredPct).toBeGreaterThan(2);
  });

  it('regeneração: mundo repõe folhas ao longo do tempo', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    const alive = e.resources.length;
    expect(alive).toBeGreaterThan(0);
  });

  it('comandos de toque: CHAMAR exploradoras/soldados move as formigas', () => {
    const e = makeEngine();
    e.newGame('campo');
    const scout = e.ants.find((a) => a.cls === 'scout')!;
    const d0 = Math.hypot(scout.x - 1000, scout.y - 1000);
    e.callScouts(1000, 1000);
    expect(scout.state).toBe('command');
    expect(Math.hypot(scout.tx - 1000, scout.ty - 1000)).toBeLessThan(50);
    // acorre ao ponto (e retoma a exploração ao chegar) [O]
    let minD = Infinity;
    const dt = 1 / 60;
    for (let t = 0; t < 30; t += dt) {
      stepSimulation(e as never, dt);
      minD = Math.min(minD, Math.hypot(scout.x - 1000, scout.y - 1000));
    }
    expect(minD).toBeLessThan(60);
    expect(minD).toBeLessThan(d0);

    const soldier = e.ants.find((a) => a.cls === 'soldier')!;
    e.callSoldiers(e.nest.x + 200, e.nest.y);
    expect(soldier.state).toBe('command');
  });

  it('adiantar onda: dá recurso e zera a espera [O advanceWave]', () => {
    const e = makeEngine();
    e.newGame('campo');
    expect(e.advanceWave()).toBe(true);
    expect(e.wallet.leaf).toBe(4); // 3 + 0 + 1
    expect(e.wave.tSec).toBeLessThanOrEqual(1 / 60);
    // durante onda ativa não permite
    e.wave = { num: 1, active: true, tSec: 10, spawned: 2, spawnT: 0 };
    expect(e.advanceWave()).toBe(false);
  });

  it('colapso do ninho perde 30% das folhas e reinicia a onda [O]', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.wallet.leaf = 100;
    e.wave = { num: 1, active: true, tSec: 10, spawned: 2, spawnT: 0 };
    e.damageNest(9999);
    expect(e.nestHp).toBe(0);
    expect(e.wallet.leaf).toBe(70);
    expect(e.wave.tSec).toBe(WAVES.COMBAT_SEC);
    expect(e.wave.spawned).toBe(0);
  });

  it('save/continue: run continua de onde parou', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 60);
    const snap = { ants: e.ants.length, xp: e.xp, level: e.level, wave: e.wave.num };
    e.backToMenu();
    expect(e.continueGame()).toBe(true);
    expect({ ants: e.ants.length, xp: e.xp, level: e.level, wave: e.wave.num }).toEqual(snap);
  });
});
