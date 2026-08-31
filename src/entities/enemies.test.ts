import { describe, expect, it } from 'vitest';
import { ENEMIES, MAPS } from '../core/constants';
import type { Enemy } from '../core/types';
import { createEnemy, createBoss, updateEnemy, resetEnemyIds, type EnemyHost } from './enemies';

const rnd = () => 0.42;

describe('createEnemy (stats do bundle × poder da onda)', () => {
  it('poder 1 = stats base da espécie', () => {
    const e = createEnemy('spider', 100, 100, 1, rnd, { wave: true });
    expect(e.hp).toBe(ENEMIES.spider.hp);
    expect(e.hpMax).toBe(ENEMIES.spider.hp);
    expect(e.dmg).toBe(ENEMIES.spider.damage);
    expect(e.speed).toBe(ENEMIES.spider.speed);
    expect(e.wave).toBe(true);
    expect(e.boss).toBe(false);
  });

  it('poder 2 dobra vida e dano, mantém velocidade', () => {
    const e = createEnemy('spider', 0, 0, 2, rnd, { wave: true });
    expect(e.hp).toBe(ENEMIES.spider.hp * 2);
    expect(e.dmg).toBe(ENEMIES.spider.damage * 2);
    expect(e.speed).toBe(ENEMIES.spider.speed);
  });

  it('xp da espécie é fixo (não escala com poder)', () => {
    const e = createEnemy('mosquito', 0, 0, 3, rnd, { wave: true });
    expect(e.xp).toBe(ENEMIES.mosquito.xp);
  });
});

describe('createBoss (stats próprios por mapa)', () => {
  it('chefe do Campo: Formiga Vermelha Rei', () => {
    const cfg = MAPS.campo.boss;
    const b = createBoss(cfg.kind, cfg.name, 0, 0, cfg, rnd);
    expect(b.boss).toBe(true);
    expect(b.hp).toBe(cfg.hp);
    expect(b.dmg).toBe(cfg.damage);
    expect(b.xp).toBe(cfg.xp);
  });
});

function makeHost(ants: Array<{ id: number; x: number; y: number; hp: number }> = []): EnemyHost & {
  nestDamage: number[]; antDamage: Array<{ id: number; dmg: number }>;
} {
  const h = {
    w: 3400,
    h: 2400,
    nest: { x: 1700, y: 1248 },
    ants,
    rng: { next: () => 0.5, float: (a: number, b: number) => (a + b) / 2 },
    damageAnt(id: number, dmg: number) { h.antDamage.push({ id, dmg }); },
    damageNest(dmg: number) { h.nestDamage.push(dmg); },
    nestDamage: [] as number[],
    antDamage: [] as Array<{ id: number; dmg: number }>,
  };
  return h;
}

describe('updateEnemy (IA vagueia→persegue→ataca)', () => {
  it('marcha em direção ao ninho sem formigas por perto', () => {
    resetEnemyIds();
    const host = makeHost();
    const e = createEnemy('spider', 100, 100, 1, rnd, { wave: true });
    const dist0 = Math.hypot(e.x - host.nest.x, e.y - host.nest.y);
    for (let i = 0; i < 60; i++) updateEnemy(e, host, 1 / 60);
    const dist1 = Math.hypot(e.x - host.nest.x, e.y - host.nest.y);
    expect(dist1).toBeLessThan(dist0);
  });

  it('persegue formiga dentro do aggro e ataca no alcance', () => {
    const ant = { id: 7, x: 200, y: 100, hp: 30 };
    const host = makeHost([ant]);
    const e = createEnemy('spider', 100, 100, 1, rnd, { wave: true });
    for (let i = 0; i < 600; i++) updateEnemy(e, host, 1 / 60);
    expect(host.antDamage.length).toBeGreaterThan(0);
    expect(host.antDamage[0]?.dmg).toBe(ENEMIES.spider.damage);
  });

  it('dano no ninho quando chega perto dele', () => {
    const host = makeHost();
    const nest = host.nest;
    const e: Enemy = createEnemy('beetle', nest.x + 60, nest.y, 1, rnd, { wave: true });
    for (let i = 0; i < 30; i++) updateEnemy(e, host, 1 / 60);
    expect(host.nestDamage.length).toBeGreaterThan(0);
  });
});
