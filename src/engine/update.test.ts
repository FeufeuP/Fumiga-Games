import { describe, expect, it, beforeEach } from 'vitest';
import { ENEMIES, MAPS, WAVES, type MapId, type ResourceKind } from '../core/constants';
import { EventBus } from '../core/events';
import { Rng } from '../core/rng';
import { FogOfWar } from './fogOfWar';
import { createAnt, resetAntIds } from '../entities/ants';
import { resetEnemyIds } from '../entities/enemies';
import { createQueenState } from '../systems/queen';
import { modsFrom, emptyUpgrades } from '../systems/shop';
import { emptyCardMods } from '../roguelike/modifiers';
import { generateWorld } from '../world/world';
import type { Ant, AntClass, Enemy, Prop, ResourceNode, Toast, WaveState } from '../core/types';
import { stepSimulation, makeBoss, makeWaveEnemy, type SimHost } from './update';

class MockHost implements SimHost {
  ants: Ant[] = [];
  enemies: Enemy[] = [];
  resources: ResourceNode[] = [];
  fog: FogOfWar;
  rng = new Rng(42);
  events = new EventBus();
  mods = modsFrom(emptyUpgrades());
  cardMods = emptyCardMods();
  buffs = { collectSpeedMult: 1, attackCdMult: 1 };
  wallet: Record<ResourceKind, number> = { leaf: 0, mushroom: 0, cactus: 0, banana: 0, flower: 0, crystal: 0 };
  mapId: MapId = 'campo';
  w = 3400;
  h = 2400;
  nest = { x: 1700, y: 1248 };
  timeSec = 0;
  tick = 0;
  toasts: Toast[] = [];
  gameOver = false;
  xp = 0;
  level = 1;
  wave: WaveState = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
  exploredPct = 0;
  queen = createQueenState();
  nestHp = 400;
  unlocked: MapId[] = ['campo'];
  levelUps: number[] = [];
  bossKills: string[] = [];

  // ciclo A [O]
  ownedAnts: Record<AntClass, number> = { worker: 0, soldier: 0, scout: 0 };
  respawnQueue: Array<{ cls: AntClass; t: number }> = [];
  rally = { attackBuffT: 0, collectBuffT: 0, attackCd: 0, collectCd: 0 };
  bossAggroT = 0;
  bossFirstHit = false;
  bossThrowT = 0;
  smashFx: Array<{ x: number; y: number; t: number }> = [];
  shake = 0;
  frontierR = 96;
  frontierT = 0;
  tapMarks: Array<{ x: number; y: number; t: number; color: string }> = [];
  regenT = 0.8;
  maxRes: Partial<Record<ResourceKind, number>> = { leaf: 100 };
  props: Prop[] = [];
  worldTexts: import('../core/types').WorldText[] = [];
  dust: import('../core/types').Dust[] = [];
  buffWaves: import('../core/types').BuffWave[] = [];
  tauntRadius = 0;
  cardTimers = { swarmT: 8, acidT: 20, chargeT: 30, guardCd: 0 };
  traps: Array<{ x: number; y: number; cd: number }> = [];
  chests: Array<{ id: number; x: number; y: number }> = [];

  constructor() {
    this.fog = new FogOfWar(this.w, this.h);
    const world = generateWorld('campo');
    this.props = world.props;
    this.fog.reveal(this.nest.x, this.nest.y, 260);
    // semeia recursos iniciais como o motor [O]: revelados, ≥170px do ninho
    for (let i = 0; i < 15; i++) this.spawnResource('leaf');
    resetAntIds();
    resetEnemyIds();
  }

  get boss(): Enemy | null { return this.enemies.find((e) => e.boss && e.hp > 0) ?? null; }

  takeResource(kind: ResourceKind, n: number): boolean {
    if (this.wallet[kind] >= n) { this.wallet[kind] -= n; return true; }
    return false;
  }
  deposit(units: number, kind: ResourceKind): void { this.wallet[kind] += units; this.xp += 3 * units; }
  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bestD2 = maxDist * maxDist;
    for (const r of this.resources) {
      if (r.amount <= 0 || !this.fog.isRevealed(r.x, r.y)) continue;
      const d2 = (r.x - x) ** 2 + (r.y - y) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = r; }
    }
    return best;
  }
  nearestVisibleEnemy(): Enemy | null { return null; }
  enemyExtent(e: Enemy): number { return e.scale / 2; }
  removeResource(id: number): void { this.resources = this.resources.filter((r) => r.id !== id); }
  damageEnemy(e: Enemy, dmg: number): void { e.hp -= dmg; if (e.hp <= 0) this.xp += e.xp; }
  antCount(cls: AntClass): number { return this.ants.filter((a) => a.cls === cls).length; }
  playSfx(): void { /* mock */ }
  damageAnt(): void { /* teste não usa */ }
  damageNest(dmg: number): void { this.nestHp = Math.max(0, this.nestHp - dmg); }
  nestHpMax(): number { return 400; }
  grantResource(kind: ResourceKind, n: number): void { this.wallet[kind] += n; }
  addXp(n: number): void { this.xp += n; }
  spawnAnt(cls: AntClass): void {
    this.ownedAnts[cls] += 1;
    this.ants.push(createAnt(cls, this.nest.x + 30, this.nest.y, () => this.rng.next()));
  }
  killAnt(a: Ant): void {
    this.respawnQueue.push({ cls: a.cls, t: 15 });
  }
  onAntRespawned(): void { /* mock */ }
  spawnResource(kind: ResourceKind): void {
    // nasce no anel revelado ao redor do ninho (como o motor)
    for (let t = 0; t < 120; t++) {
      const ang = this.rng.next() * Math.PI * 2;
      const dist = 170 + this.rng.next() * 88;
      const x = this.nest.x + Math.cos(ang) * dist;
      const y = this.nest.y + Math.sin(ang) * dist;
      if (!this.fog.isRevealed(x, y)) continue;
      this.resources.push({
        id: 90000 + this.resources.length, kind,
        x, y, amount: 1, phase: this.rng.next() * Math.PI * 2,
      });
      return;
    }
  }
  spawnWaveEnemy(power?: number): void { this.enemies.push(makeWaveEnemy(this, power)); }
  spawnBoss(): void { this.enemies.push(makeBoss(this)); }
  pushToast(text: string, kind: Toast['kind']): void { this.toasts.push({ id: 1, text, kind, tSec: 5 }); }
  onLevelUp(level: number, gained: number): void { this.levelUps.push(level, gained); }
  onQueenDead(): void { this.gameOver = true; }
  onBossDefeated(e: Enemy): void { this.bossKills.push(e.kind); }
  onMapUnlocked(mapId: MapId): void { this.unlocked.push(mapId); }
  rebuildResourceIndex(): void { /* mock */ }
  recomputeFogActive(): void { /* mock */ }
}

describe('ciclo de ondas (20s combate / 90s calmaria)', () => {
  beforeEach(() => { resetAntIds(); resetEnemyIds(); });

  it('primeira onda dispara após 90s de calmaria', () => {
    const host = new MockHost();
    for (let i = 0; i < Math.ceil(90.5 * 60); i++) stepSimulation(host, 1 / 60);
    expect(host.wave.num).toBe(1);
    expect(host.wave.active).toBe(true);
    expect(host.toasts.some((t) => t.text.includes('ONDA 1'))).toBe(true);
  });

  it('onda tem 2N inimigos, em lotes de 2', () => {
    const host = new MockHost();
    host.wave = { num: 3, active: true, tSec: WAVES.COMBAT_SEC, spawned: 0, spawnT: 0 };
    for (let i = 0; i < Math.ceil(21 * 60); i++) stepSimulation(host, 1 / 60);
    expect(host.wave.spawned).toBe(6); // 2×3
    const waveEnemies = host.enemies.filter((e) => e.wave);
    expect(waveEnemies.length).toBeGreaterThan(0);
    expect(waveEnemies.length).toBeLessThanOrEqual(WAVES.MAX_CONCURRENT);
  });

  it('recompensa ao repelir: 3+2N folhas, XP e cura do ninho', () => {
    const host = new MockHost();
    host.enemies = []; // nada para matar — onda expira
    host.wave = { num: 2, active: true, tSec: 0.01, spawned: 4, spawnT: 0 };
    host.nestHp = 200;
    stepSimulation(host, 1 / 60);
    expect(host.wave.active).toBe(false);
    expect(host.wave.tSec).toBeCloseTo(WAVES.CALM_SEC, 0);
    expect(host.wallet.leaf).toBe(3 + 2 * 2);
    expect(host.nestHp).toBeGreaterThanOrEqual(200 + Math.round(400 * 0.2));
  });

  it('chefe aparece a cada 15 ondas com 2 escoltas', () => {
    const host = new MockHost();
    host.wave = { num: 14, active: false, tSec: 0.01, spawned: 0, spawnT: 0 };
    stepSimulation(host, 1 / 60);
    expect(host.wave.num).toBe(15);
    const boss = host.enemies.find((e) => e.boss);
    expect(boss).toBeDefined();
    expect(boss?.hp).toBe(MAPS.campo.boss.hp);
    const escorts = host.enemies.filter((e) => e.wave && !e.boss);
    expect(escorts.length).toBe(2);
    // [O] escoltas com poder 0.5 — a espécie é sorteada por inimigo
    expect(escorts.every((e) => e.hpMax === Math.round(ENEMIES[e.kind].hp * 0.5))).toBe(true);
  });
});

describe('simulação integrada', () => {
  it('formigas coletam e depositam: carteira cresce com o tempo', () => {
    const host = new MockHost();
    for (let i = 0; i < 3; i++) host.spawnAnt('worker');
    host.spawnAnt('scout');
    // 240s: operárias vagueiam até encontrar folhas (detecção 150px [O N0])
    for (let i = 0; i < 240 * 60; i++) stepSimulation(host, 1 / 60);
    const deposited = host.wallet.leaf + host.xp / 3;
    expect(deposited).toBeGreaterThan(0);
  });

  it('rainha morre sem comida → gameOver', () => {
    const host = new MockHost();
    host.spawnAnt('worker');
    host.queen.hunger = 2;
    // mundo sem recursos e sem regeneração: ela definha
    host.resources = [];
    host.maxRes = {};
    for (let i = 0; i < 30 * 60 && !host.gameOver; i++) stepSimulation(host, 1 / 60);
    expect(host.gameOver).toBe(true);
  });

  it('exploração revela % e destrava o mapa seguinte a 30%', () => {
    const host = new MockHost();
    // revela 35% do mapa de uma vez
    for (let row = 0; row < host.fog.rows; row++) {
      for (let col = 0; col < Math.floor(host.fog.cols * 0.35); col++) {
        host.fog.reveal(col * host.fog.cell + 24, row * host.fog.cell + 24, 1);
      }
    }
    stepSimulation(host, 1 / 60); // tick 31 não, mas o cálculo roda a cada 30 ticks
    for (let i = 0; i < 31; i++) stepSimulation(host, 1 / 60);
    expect(host.unlocked).toContain('pantano');
  });
});
