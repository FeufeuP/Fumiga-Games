/**
 * GameEngine — orquestra o loop, a run e a ponte com a interface.
 * Fiel ao original: economia por recurso, loja de 16 melhorias, ondas,
 * chefes, fome da Rainha, desbloqueio de mapas por exploração.
 */
import {
  ANTS, ECONOMY, ENGINE, FOG, MAPS, NEST, POPULATION, RESOURCES, SAVE, UPGRADES, WAVES, XP, upgradeCost,
  type AntClass, type EnemyKind, type MapId, type ResourceKind,
} from '../core/constants';
import { Rng } from '../core/rng';
import { EventBus } from '../core/events';
import { Store } from '../core/store';
import { Clock } from '../core/clock';
import type {
  Ant, AntMods, AntWorld, CameraMode, Enemy, HudState, Prop, ResourceNode,
  Resources, Scene, Toast, UpgradeLevels, WaveState,
} from '../core/types';
import { SpatialHash } from './spatialHash';
import { FogOfWar } from './fogOfWar';
import { stepSimulation, makeWaveEnemy, makeBoss } from './update';
import { generateWorld } from '../world/world';
import { createAnt, resetAntIds } from '../entities/ants';
import { resetEnemyIds } from '../entities/enemies';
import { createQueenState } from '../systems/queen';
import { emptyUpgrades, modsFrom, upgradeById } from '../systems/shop';
import { Camera } from '../render/Camera';
import { Renderer } from '../render/Renderer';
import { loadSprites, type SpriteSet } from '../render/sprites';
import { AudioManager } from './audio';
import { loadSave, writeSave, saveExists, serialize, applySave } from '../save';

function emptyResources(): Resources {
  return { leaf: 0, mushroom: 0, cactus: 0, banana: 0, flower: 0, crystal: 0 };
}

function emptyHud(): HudState {
  return {
    screen: 'loading',
    runActive: false,
    gameOver: false,
    mapId: 'campo',
    unlockedMaps: ['campo'],
    exploredPct: 0,
    runSeconds: 0,
    resources: emptyResources(),
    level: 1,
    xp: 0,
    xpToNext: 50,
    queenHunger: 100,
    queenHungerMax: 100,
    nestHp: NEST.HP_MAX,
    nestHpMax: NEST.HP_MAX,
    ants: { worker: 0, soldier: 0, scout: 0 },
    wave: { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 },
    boss: null,
    cameraMode: 'follow',
    selectedAntId: null,
    paused: false,
    totals: { delivered: 0, enemiesKilled: 0, bossesKilled: 0 },
    upgrades: emptyUpgrades(),
    shopCosts: {},
    hasSave: false,
    toasts: [],
  };
}

export class GameEngine implements AntWorld, Scene {
  // ── Scene (o que o renderizador enxerga) ─────────────────────────
  mapId: MapId = 'campo';
  w = MAPS.campo.world.w;
  h = MAPS.campo.world.h;
  props: Prop[] = [];
  resources: ResourceNode[] = [];      // nós de recurso no mapa
  ants: Ant[] = [];
  enemies: Enemy[] = [];
  nest: { x: number; y: number; hp: number; hpMax: number } = {
    x: 0, y: 0, hp: NEST.HP_MAX, hpMax: NEST.HP_MAX,
  };
  fog = new FogOfWar(MAPS.campo.world.w, MAPS.campo.world.h);
  timeSec = 0;
  wave: WaveState = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
  selectedAntId: number | null = null;
  gameOver = false;

  // ── subsistemas ───────────────────────────────────────────────────
  readonly events = new EventBus();
  readonly store = new Store<HudState>(emptyHud());
  readonly camera = new Camera();
  readonly clock = new Clock();
  readonly audio = new AudioManager();
  sprites: SpriteSet | null = null;
  private renderer: Renderer | null = null;
  rng: Rng = new Rng(1);
  private resourceIndex = new SpatialHash<ResourceNode>(ENGINE.SPATIAL_CELL);

  // ── estado ────────────────────────────────────────────────────────
  runActive = false;
  tick = 0;
  toasts: Toast[] = [];
  wallet: Resources = emptyResources();  // carteira da colônia
  xp = 0;
  level = 1;
  exploredPct = 0;
  unlockedMaps: MapId[] = ['campo'];
  totals = { delivered: 0, enemiesKilled: 0, bossesKilled: 0 };
  upgrades: UpgradeLevels = emptyUpgrades();
  mods: AntMods = modsFrom(emptyUpgrades());
  queen = createQueenState();
  nestHp: number = NEST.HP_MAX;
  wavesByMap: Partial<Record<MapId, number>> = {};

  // ── loop ──────────────────────────────────────────────────────────
  private running = false;
  private raf = 0;
  private lastFrameMs = 0;
  private lastHudMs = 0;
  private lastSaveMs = 0;
  private toastSeq = 1;
  readonly keys = new Set<string>();

  private constructor() {}

  /** Cria o motor carregando os sprites originais (tela de loading antes). */
  static async create(): Promise<GameEngine> {
    const engine = new GameEngine();
    engine.sprites = await loadSprites();
    engine.store.publish({ ...engine.store.getSnapshot(), screen: 'menu' });
    engine.publishHud();
    return engine;
  }

  // ═════════════════════════ ANTWORLD ═══════════════════════════════

  takeResource(kind: ResourceKind, n: number): boolean {
    if ((this.wallet[kind] ?? 0) >= n) {
      this.wallet[kind] -= n;
      return true;
    }
    return false;
  }

  deposit(units: number, kind: ResourceKind, by: AntClass): void {
    const xpPer = XP.PER_DEPOSIT + this.mods.xpBoost;
    for (let i = 0; i < units; i++) {
      this.wallet[kind] += 1;
      this.xp += xpPer;
      // [O] sorte: 10% × nível → recurso extra
      if (this.rng.chance(ECONOMY.LUCK_BONUS_CHANCE * this.mods.luck)) {
        this.wallet[kind] += 1;
        this.xp += 1;
      }
    }
    this.totals.delivered += units;
    this.audio.play('deposit');
    this.events.emit('food_deposited', { units, food: units * RESOURCES[kind].food, by });
  }

  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null {
    const candidates = this.resourceIndex.query(x, y, maxDist);
    let best: ResourceNode | null = null;
    let bestD2 = maxDist * maxDist;
    for (const r of candidates) {
      if (r.amount <= 0) continue;
      if (!this.fog.isRevealed(r.x, r.y)) continue;
      const d2 = (r.x - x) ** 2 + (r.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = r;
      }
    }
    return best;
  }

  nearestVisibleEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD2 = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (!this.fog.isActive(e.x, e.y)) continue;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  damageEnemy(e: Enemy, dmg: number, _by: AntClass): void {
    e.hp -= dmg;
    if (e.hp <= 0 && !e.boss) {
      // chefe é contabilizado em onBossDefeated (drops + XP)
      this.xp += e.xp;
      this.totals.enemiesKilled++;
    }
  }

  antCount(cls: AntClass): number {
    return this.ants.filter((a) => a.cls === cls && a.hp > 0).length;
  }

  // ── EnemyHost (IA dos inimigos) ──────────────────────────────────

  damageAnt(antId: number, dmg: number, _by: EnemyKind): void {
    const a = this.ants.find((x) => x.id === antId);
    if (!a || a.hp <= 0) return;
    a.hp -= dmg * (1 - this.mods.armorReduction);
  }

  damageNest(dmg: number): void {
    const before = this.nestHp;
    this.nestHp = Math.max(0, this.nestHp - dmg);
    if (before > 0 && this.nestHp <= 0) {
      this.pushToast('O formigueiro entrou em colapso!', 'danger');
    }
  }

  // ═════════════════════════ SIMHOST ════════════════════════════════

  get boss(): Enemy | null {
    return this.enemies.find((e) => e.boss && e.hp > 0) ?? null;
  }

  spawnAnt(cls: AntClass): void {
    const ang = this.rng.next() * Math.PI * 2;
    const dist = 24 + this.rng.next() * 36;
    const x = Math.min(this.w - 12, Math.max(12, this.nest.x + Math.cos(ang) * dist));
    const y = Math.min(this.h - 12, Math.max(12, this.nest.y + Math.sin(ang) * dist));
    const ant = createAnt(cls, x, y, () => this.rng.next());
    ant.hp = ant.hpMax = Math.round(ANTS[cls].hp * this.mods.hpMult);
    this.ants.push(ant);
  }

  spawnWaveEnemy(power?: number): void {
    this.enemies.push(makeWaveEnemy(this, power));
  }

  spawnBoss(): void {
    this.enemies.push(makeBoss(this));
    this.audio.play('boss');
  }

  pushToast(text: string, kind: Toast['kind']): void {
    this.toasts.push({ id: this.toastSeq++, text, kind, tSec: ENGINE.TOAST_SEC });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  onLevelUp(level: number): void {
    this.audio.play('levelup');
    this.pushToast(`⭐ A colônia alcançou o nível ${level}!`, 'success');
  }

  onQueenDead(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clock.paused = true;
    this.audio.play('dead');
    this.pushToast('A rainha morreu de fome...', 'danger');
    this.events.emit('run_end', { reason: 'queen_hunger_zero' });
    this.publishHud();
  }

  onBossDefeated(e: Enemy): void {
    const cfg = MAPS[this.mapId].boss;
    for (const [kind, n] of Object.entries(cfg.drops)) {
      this.wallet[kind as ResourceKind] += n ?? 0;
    }
    this.xp += e.xp;
    this.totals.bossesKilled++;
    this.audio.play('win');
    this.pushToast(`🏆 ${cfg.name} derrotado! +${e.xp} XP e recursos!`, 'success');
  }

  onMapUnlocked(mapId: MapId): void {
    if (this.unlockedMaps.includes(mapId)) return;
    this.unlockedMaps.push(mapId);
    this.audio.play('win');
    this.pushToast(`🗺️ NOVO MAPA LIBERADO: ${MAPS[mapId].name}!`, 'success');
    writeSave(serialize(this));
  }

  rebuildResourceIndex(): void {
    this.resourceIndex.clear();
    for (const r of this.resources) {
      if (r.amount > 0) this.resourceIndex.insert(r);
    }
  }

  recomputeFogActive(): void {
    const sources: Array<{ x: number; y: number; r: number }> = this.ants.map((a) => ({
      x: a.x, y: a.y,
      r: a.cls === 'scout' ? FOG.SCOUT_RADIUS : FOG.PASSIVE_RADIUS,
    }));
    sources.push({ x: this.nest.x, y: this.nest.y, r: FOG.NEST_RADIUS });
    this.fog.recomputeActive(sources);
  }

  // ═════════════════════════ CICLO DE VIDA ═════════════════════════

  attach(canvas: HTMLCanvasElement): void {
    this.renderer = new Renderer(canvas, this.camera, this.sprites);
    if (!this.running) {
      this.running = true;
      this.lastFrameMs = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  detach(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.renderer?.dispose();
    this.renderer = null;
  }

  private loop = (nowMs: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, ENGINE.MAX_FRAME_SEC);
    this.lastFrameMs = nowMs;

    this.clock.frame(nowMs, (dt) => stepSimulation(this, dt));
    if (!this.clock.paused) {
      this.camera.update(frameDt, this.followTarget(), this.keys);
    }
    this.renderer?.draw(this);

    if (nowMs - this.lastHudMs >= 1000 / ENGINE.HUD_PUBLISH_HZ) {
      this.lastHudMs = nowMs;
      this.publishHud();
    }
    if (this.runActive && !this.gameOver && nowMs - this.lastSaveMs >= SAVE.PERIODIC_MS) {
      this.lastSaveMs = nowMs;
      writeSave(serialize(this));
    }
  };

  private followTarget(): { x: number; y: number } {
    const sel = this.ants.find((a) => a.id === this.selectedAntId);
    if (sel) return { x: sel.x, y: sel.y };
    return { x: this.nest.x, y: this.nest.y };
  }

  // ═════════════════════════ PARTIDA ═══════════════════════════════

  private loadWorld(mapId: MapId): void {
    this.mapId = mapId;
    const world = generateWorld(mapId);
    this.w = world.w;
    this.h = world.h;
    this.props = world.props;
    this.resources = world.resources;
    this.enemies = world.ambientEnemies;
    this.nest = { x: world.nestX, y: world.nestY, hp: this.nestHp, hpMax: NEST.HP_MAX };
    this.fog = new FogOfWar(world.w, world.h);
    this.camera.setWorldSize(world.w, world.h);
    this.rebuildResourceIndex();
  }

  private populate(): void {
    this.ants = [];
    for (const [cls, n] of Object.entries(POPULATION.START) as Array<[AntClass, number]>) {
      for (let i = 0; i < n; i++) this.spawnAnt(cls);
    }
    // formigas extras já compradas na loja
    for (let i = 0; i < (this.upgrades.antlimit ?? 0) * 5; i++) this.spawnAnt('worker');
    for (let i = 0; i < (this.upgrades.soldier ?? 0) * 5; i++) this.spawnAnt('soldier');
    for (let i = 0; i < (this.upgrades.scout ?? 0) * 5; i++) this.spawnAnt('scout');
  }

  newGame(mapId: MapId = 'campo'): void {
    resetAntIds();
    resetEnemyIds();
    this.runActive = true;
    this.gameOver = false;
    this.toasts = [];
    this.selectedAntId = null;
    this.tick = 0;
    this.timeSec = 0;
    this.xp = 0;
    this.level = 1;
    this.wallet = emptyResources();
    for (const [k, v] of Object.entries(ECONOMY.START_RESOURCES)) {
      this.wallet[k as ResourceKind] = v ?? 0;
    }
    this.upgrades = emptyUpgrades();
    this.mods = modsFrom(this.upgrades);
    this.totals = { delivered: 0, enemiesKilled: 0, bossesKilled: 0 };
    this.unlockedMaps = ['campo'];
    this.wavesByMap = {};
    this.queen = createQueenState();
    this.nestHp = NEST.HP_MAX;
    this.wave = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
    this.rng = new Rng((Date.now() & 0x7fffffff) || 1);

    this.loadWorld(mapId);
    this.populate();

    this.fog.reveal(this.nest.x, this.nest.y, FOG.NEST_RADIUS);
    this.recomputeFogActive();

    this.camera.mode = 'follow';
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();

    this.clock.reset(performance.now());
    this.clock.paused = false;
    this.audio.play('click');
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    this.events.emit('run_start', { seed: 0, mapId });
    writeSave(serialize(this));
  }

  continueGame(): boolean {
    const save = loadSave();
    if (!save) return false;
    if (!applySave(this, save)) return false;
    this.runActive = true;
    this.clock.paused = this.gameOver;
    this.recomputeFogActive();
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    return true;
  }

  backToMenu(): void {
    if (this.runActive) writeSave(serialize(this));
    this.runActive = false;
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'menu' });
    this.publishHud();
  }

  restart(): void {
    this.newGame(this.mapId);
  }

  // ═════════════════════════ AÇÕES DA UI ═══════════════════════════

  buyUpgrade(id: string): boolean {
    const def = upgradeById(id);
    if (!def || !this.runActive || this.gameOver) return false;
    const bought = this.upgrades[id] ?? 0;
    if (bought >= def.max) return false;
    const cost = upgradeCost(def, bought);
    if (!this.takeResource(cost.kind, cost.amount)) return false;

    this.upgrades = { ...this.upgrades, [id]: bought + 1 };
    this.mods = modsFrom(this.upgrades);

    if (def.id === 'antlimit') for (let i = 0; i < 5; i++) this.spawnAnt('worker');
    if (def.id === 'soldier') for (let i = 0; i < 5; i++) this.spawnAnt('soldier');
    if (def.id === 'scout') for (let i = 0; i < 5; i++) this.spawnAnt('scout');

    this.audio.play('click');
    this.pushToast(`${def.name} — nível ${bought + 1}!`, 'success');
    this.publishHud();
    writeSave(serialize(this));
    return true;
  }

  selectMap(mapId: MapId): boolean {
    if (!this.unlockedMaps.includes(mapId) || mapId === this.mapId) return false;
    this.wavesByMap[this.mapId] = this.wave.num;
    resetAntIds();
    resetEnemyIds();
    this.wave = {
      num: this.wavesByMap[mapId] ?? 0,
      active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0,
    };
    this.selectedAntId = null;
    this.loadWorld(mapId);
    this.populate();
    this.fog.reveal(this.nest.x, this.nest.y, FOG.NEST_RADIUS);
    this.recomputeFogActive();
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();
    this.pushToast(`${MAPS[mapId].name} — boa exploração!`, 'info');
    this.publishHud();
    writeSave(serialize(this));
    return true;
  }

  setCameraMode(mode: CameraMode): void {
    this.camera.mode = mode;
    this.publishHud();
  }

  centerCamera(): void {
    this.selectedAntId = null;
    this.camera.mode = 'follow';
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();
    this.publishHud();
  }

  cycleAnt(): void {
    if (this.ants.length === 0) {
      this.selectedAntId = null;
      this.publishHud();
      return;
    }
    const idx = this.ants.findIndex((a) => a.id === this.selectedAntId);
    const next = this.ants[(idx + 1) % this.ants.length] as Ant;
    this.selectedAntId = next.id;
    this.camera.mode = 'follow';
    this.publishHud();
  }

  clickWorld(worldX: number, worldY: number): 'interior' | null {
    const d = Math.hypot(worldX - this.nest.x, worldY - this.nest.y);
    return d <= NEST.MOUND_RADIUS + 20 ? 'interior' : null;
  }

  enterInterior(): void {
    if (!this.runActive || this.gameOver) return;
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'interior' });
    this.publishHud();
  }

  exitInterior(): void {
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.clock.paused = this.gameOver;
    this.publishHud();
  }

  togglePause(): void {
    this.clock.paused = !this.clock.paused;
    this.publishHud();
  }

  toggleMute(): void {
    this.audio.muted = !this.audio.muted;
    this.publishHud();
  }

  panCamera(dxScreen: number, dyScreen: number): void {
    this.camera.mode = 'free';
    this.camera.pan(dxScreen / this.camera.zoom, dyScreen / this.camera.zoom);
  }

  keyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  keyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  // ═════════════════════════ HUD ═══════════════════════════════════

  publishHud(): void {
    const antsCount: Record<AntClass, number> = { worker: 0, soldier: 0, scout: 0 };
    for (const a of this.ants) antsCount[a.cls]++;

    const shopCosts: HudState['shopCosts'] = {};
    for (const def of UPGRADES) {
      const bought = this.upgrades[def.id] ?? 0;
      const cost = upgradeCost(def, bought);
      shopCosts[def.id] = { kind: cost.kind, amount: cost.amount, maxed: bought >= def.max };
    }

    const boss = this.boss;

    this.store.publish({
      screen: this.store.getSnapshot().screen,
      runActive: this.runActive,
      gameOver: this.gameOver,
      mapId: this.mapId,
      unlockedMaps: [...this.unlockedMaps],
      exploredPct: this.exploredPct,
      runSeconds: this.clock.runSeconds,
      resources: { ...this.wallet },
      level: this.level,
      xp: this.xp,
      xpToNext: 50 + 25 * (this.level - 1),
      queenHunger: this.queen.hunger,
      queenHungerMax: 100,
      nestHp: this.nestHp,
      nestHpMax: NEST.HP_MAX,
      ants: antsCount,
      wave: { ...this.wave },
      boss: boss ? { name: MAPS[this.mapId].boss.name, hp: boss.hp, hpMax: boss.hpMax } : null,
      cameraMode: this.camera.mode,
      selectedAntId: this.selectedAntId,
      paused: this.clock.paused,
      totals: { ...this.totals },
      upgrades: { ...this.upgrades },
      shopCosts,
      hasSave: saveExists(),
      toasts: [...this.toasts],
    });
  }
}
