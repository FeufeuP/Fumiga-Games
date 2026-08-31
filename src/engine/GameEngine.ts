/**
 * GameEngine — orquestra o loop, o estado da run e a ponte com a interface.
 * Regras que ele obedece (plano §4):
 *  · não conhece React — só store/eventos;
 *  · simulação com delta fixo via Clock; visual usa dt do frame;
 *  · RNG semeado; nenhum Math.random daqui pra dentro;
 *  · o motor escreve na store; a UI só lê e chama métodos públicos.
 */
import {
  POPULATION, PRODUCTION, ECONOMY, ENGINE, FOG, MAPS, NEST,
  type MapId,
} from '../core/constants';
import { Rng } from '../core/rng';
import { EventBus } from '../core/events';
import { Store } from '../core/store';
import { Clock } from '../core/clock';
import type {
  Ant, AntWorld, CameraMode, HudState, HungerBand, NestState, Prop,
  ResourceKind, ResourceNode, Scene, Toast, AntClass,
} from '../core/types';
import { SpatialHash } from './spatialHash';
import { FogOfWar } from './fogOfWar';
import { stepSimulation } from './update';
import { generateWorld } from '../world/world';
import { ANT_CLASSES as CLASS_INFO, createAnt, revealRadiusOf, resetAntIds } from '../entities/ants/registry';
import { createQueen, feedQueen as queenFeed, hungerBand, queueAnt as queenQueue, stageOf } from '../entities/queen/queen';
import { depositInto, foodValueOf } from '../systems/economy';
import { repair as nestRepair } from '../systems/nest';
import { Camera } from '../render/Camera';
import { Renderer } from '../render/Renderer';
import { registerAllSprites } from '../render/sprites';
import { hasSprite } from '../render/spriteRegistry';
import { SaveSystem } from '../save/saveSystem';
import { readSave } from '../save/storage';
import { applySave } from '../save/deserializer';

/** Seed fixa por mapa — mundos idênticos entre runs (docs/05). */
export function mapSeedFor(mapId: MapId): number {
  let h = 2166136261;
  for (let i = 0; i < mapId.length; i++) {
    h ^= mapId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function emptyHud(): HudState {
  return {
    screen: 'menu',
    runActive: false,
    gameOver: false,
    mapId: 'campo',
    runSeconds: 0,
    food: ECONOMY.START_FOOD,
    foodCap: NEST.STORAGE,
    chitin: 0,
    hunger: 100,
    hungerMax: 100,
    hungerBand: 'sated',
    queenHp: 500,
    queenHpMax: 500,
    nestHp: NEST.HP_MAX,
    nestHpMax: NEST.HP_MAX,
    popByClass: { worker: 0, collector: 0, scout: 0, soldier: 0, defender: 0, toxic: 0, giant: 0 },
    popTotal: 0,
    popCap: POPULATION.MAX_INITIAL,
    queue: [],
    cameraMode: 'follow',
    selectedAntId: null,
    paused: false,
    delivered: 0,
    producedTotal: 0,
    resourcesLeft: 0,
    hasSave: false,
    toasts: [],
  };
}

export class GameEngine implements AntWorld, Scene {
  // ── Scene ─────────────────────────────────────────────────────────
  mapId: MapId = 'campo';
  w: number = MAPS.campo.world.w;
  h: number = MAPS.campo.world.h;
  props: Prop[] = [];
  resources: ResourceNode[] = [];
  ants: Ant[] = [];
  nest: NestState = { hp: NEST.HP_MAX, hpMax: NEST.HP_MAX, x: 0, y: 0 };
  fog = new FogOfWar(MAPS.campo.world.w, MAPS.campo.world.h);
  timeSec = 0;
  selectedAntId: number | null = null;
  gameOver = false;

  // ── subsistemas ───────────────────────────────────────────────────
  readonly events = new EventBus();
  readonly store = new Store<HudState>(emptyHud());
  readonly camera = new Camera();
  readonly clock = new Clock();
  readonly save: SaveSystem;
  private renderer: Renderer | null = null;
  rng: Rng = new Rng(1);
  private resourceIndex = new SpatialHash<ResourceNode>(ENGINE.SPATIAL_CELL);

  // ── estado da run ─────────────────────────────────────────────────
  seed = 1;
  runActive = false;
  tick = 0;
  toasts: Toast[] = [];
  foodAmount: number = ECONOMY.START_FOOD;
  chitinAmount: number = ECONOMY.START_CHITIN;
  deliveredTotal = 0;
  producedTotal = 0;
  queen = createQueen();

  // ── loop ──────────────────────────────────────────────────────────
  private running = false;
  private raf = 0;
  private lastFrameMs = 0;
  private lastHudMs = 0;
  private toastSeq = 1;
  private lastRepairEmitTick = -999;
  readonly keys = new Set<string>();

  constructor() {
    if (!hasSprite('ant:worker')) registerAllSprites();
    this.save = new SaveSystem(this);
    this.save.bind();
    this.publishHud();
  }

  // ═════════════════════════ ANTWORLD (simulação) ═══════════════════

  food(): number {
    return this.foodAmount;
  }

  depositFood(units: number, kind: ResourceKind, by: AntClass): void {
    const value = foodValueOf(kind, units);
    const res = depositInto(this.foodAmount, value);
    this.foodAmount = res.food;
    this.deliveredTotal += units;
    this.events.emit('food_deposited', { units, food: res.accepted, by });
  }

  takeFood(units: number): boolean {
    if (this.foodAmount >= units) {
      this.foodAmount -= units;
      return true;
    }
    return false;
  }

  feedQueen(foodUnits: number): void {
    queenFeed(this.queen, foodUnits);
    this.events.emit('queen_fed', { food: foodUnits });
  }

  repairNest(hp: number): void {
    const r = nestRepair(this.nest.hp, this.nest.hpMax, hp);
    if (r.repaired > 0) {
      this.nest.hp = r.hp;
      if (this.tick - this.lastRepairEmitTick > 60) {
        this.lastRepairEmitTick = this.tick;
        this.events.emit('nest_repaired', { amount: r.repaired });
      }
    }
  }

  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null {
    const candidates = this.resourceIndex.query(x, y, maxDist);
    let best: ResourceNode | null = null;
    let bestD2 = maxDist * maxDist;
    for (const r of candidates) {
      if (r.amount <= 0) continue;
      if (!this.fog.isRevealed(r.x, r.y)) continue;
      const dx = r.x - x;
      const dy = r.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = r;
      }
    }
    return best;
  }

  popTotal(): number {
    return this.ants.length + this.queen.queue.length;
  }

  queueLength(): number {
    return this.queen.queue.length;
  }

  // ═════════════════════════ SIMHOST ════════════════════════════════

  spawnAntAtNest(cls: AntClass): void {
    const ant = this.createAntAroundNest(cls);
    this.ants.push(ant);
    this.producedTotal++;
    this.events.emit('ant_produced', { cls, id: ant.id });
  }

  pushToast(text: string, kind: Toast['kind']): void {
    this.toasts.push({ id: this.toastSeq++, text, kind, tSec: ENGINE.TOAST_SEC });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  onQueenBandChange(band: HungerBand): void {
    if (band === 'hungry') {
      this.pushToast('A rainha está com fome! Leve comida ao ninho.', 'warn');
    } else if (band === 'critical') {
      this.pushToast('A rainha está FAMINTA! Ela vai morrer!', 'danger');
    } else if (band === 'starving') {
      this.pushToast('A rainha está em inanição — sem comida ela cai!', 'danger');
    } else if (band === 'sated') {
      this.pushToast('A rainha está saciada — produção acelerada.', 'info');
    }
  }

  onQueenDead(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clock.paused = true;
    this.pushToast('A Rainha caiu. A colônia se dispersa...', 'danger');
    this.events.emit('queen_dead', undefined);
    this.events.emit('run_end', { reason: 'queen_hp_zero' });
    this.publishHud();
  }

  rebuildResourceIndex(): void {
    this.resourceIndex.clear();
    for (const r of this.resources) {
      if (r.amount > 0) this.resourceIndex.insert(r);
    }
  }

  // ═════════════════════════ CICLO DE VIDA ═════════════════════════

  attach(canvas: HTMLCanvasElement): void {
    this.renderer = new Renderer(canvas, this.camera);
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
  };

  private followTarget(): { x: number; y: number } {
    const sel = this.ants.find((a) => a.id === this.selectedAntId && !a.internal);
    if (sel) return { x: sel.x, y: sel.y };
    return { x: this.nest.x, y: this.nest.y };
  }

  // ═════════════════════════ PARTIDA ═══════════════════════════════

  loadWorld(mapId: MapId, runSeed: number): void {
    this.mapId = mapId;
    this.seed = runSeed;
    this.rng = new Rng(runSeed);
    const world = generateWorld(mapId, mapSeedFor(mapId));
    this.w = world.w;
    this.h = world.h;
    this.props = world.props;
    this.resources = world.resources;
    this.nest = { hp: NEST.HP_MAX, hpMax: NEST.HP_MAX, x: world.nestX, y: world.nestY };
    this.fog = new FogOfWar(world.w, world.h);
    this.camera.setWorldSize(world.w, world.h);
    this.rebuildResourceIndex();
  }

  newGame(mapId: MapId = 'campo'): void {
    resetAntIds();
    this.runActive = true;
    this.gameOver = false;
    this.toasts = [];
    this.selectedAntId = null;
    this.producedTotal = 0;
    this.deliveredTotal = 0;
    this.tick = 0;
    this.timeSec = 0;
    this.queen = createQueen();
    this.foodAmount = ECONOMY.START_FOOD;
    this.chitinAmount = ECONOMY.START_CHITIN;

    this.loadWorld(mapId, (Date.now() & 0x7fffffff) || 1);

    // população inicial (POPULATION.START)
    this.ants = [];
    for (const [cls, n] of Object.entries(POPULATION.START) as Array<[AntClass, number]>) {
      for (let i = 0; i < n; i++) {
        this.ants.push(this.createAntAroundNest(cls));
      }
    }

    // névoa: área do ninho já revelada
    this.fog.reveal(this.nest.x, this.nest.y, FOG.NEST_RADIUS);
    this.fog.recomputeActive(this.fogSources());

    this.camera.mode = 'follow';
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();

    this.clock.reset(performance.now());
    this.clock.paused = false;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    this.events.emit('run_start', { seed: this.seed, mapId });
  }

  continueGame(): boolean {
    const save = readSave();
    if (!save) return false;
    if (!applySave(this, save)) return false;
    this.runActive = true;
    this.clock.paused = this.gameOver;
    this.fog.recomputeActive(this.fogSources());
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    return true;
  }

  backToMenu(): void {
    if (this.runActive) this.save.save('menu');
    this.runActive = false;
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'menu' });
    this.publishHud();
  }

  restart(): void {
    this.newGame(this.mapId);
  }

  // ═════════════════════════ AÇÕES DA UI ═══════════════════════════

  /** Enfileira produção de formiga (Sala da Rainha na Fase 3; botões por ora). */
  queueAnt(cls: AntClass): boolean {
    if (!this.runActive || this.gameOver) return false;
    const info = CLASS_INFO[cls];
    if (!info.unlocked) return false;
    if (this.queen.queue.length >= PRODUCTION.QUEUE_MAX) return false;
    if (this.popTotal() >= POPULATION.MAX_INITIAL) return false;
    if (this.foodAmount < info.costFood) return false;
    if (!queenQueue(this.queen, cls)) return false;
    this.foodAmount -= info.costFood;
    this.events.emit('production_queued', { cls });
    this.publishHud();
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
    const externals = this.ants.filter((a) => !a.internal);
    if (externals.length === 0) {
      this.selectedAntId = null;
      this.publishHud();
      return;
    }
    const idx = externals.findIndex((a) => a.id === this.selectedAntId);
    const next = externals[(idx + 1) % externals.length] as Ant;
    this.selectedAntId = next.id;
    this.camera.mode = 'follow';
    this.publishHud();
  }

  /** Arrasto da tela (px de tela) → pan no modo livre. */
  panCamera(dxScreen: number, dyScreen: number): void {
    this.camera.mode = 'free';
    this.camera.pan(dxScreen / this.camera.zoom, dyScreen / this.camera.zoom);
    this.publishHud();
  }

  /** Clique no mundo — retorna 'interior' se acertou o monte do ninho. */
  clickWorld(worldX: number, worldY: number): 'interior' | null {
    const d = Math.hypot(worldX - this.nest.x, worldY - this.nest.y);
    if (d <= NEST.MOUND_RADIUS + 20) return 'interior';
    return null;
  }

  enterInterior(): void {
    if (!this.runActive || this.gameOver) return;
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'interior' });
    this.events.emit('interior_enter', undefined);
    this.publishHud();
  }

  exitInterior(): void {
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.clock.paused = this.gameOver;
    this.events.emit('interior_exit', undefined);
    this.publishHud();
  }

  keyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  keyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  togglePause(): void {
    this.clock.paused = !this.clock.paused;
    this.publishHud();
  }

  // ═════════════════════════ HELPERS ═══════════════════════════════

  private createAntAroundNest(cls: AntClass): Ant {
    let x = this.nest.x;
    let y = this.nest.y;
    if (cls !== 'worker') {
      const ang = this.rng.next() * Math.PI * 2;
      const dist = this.rng.float(26, 60);
      x = Math.min(this.w - 12, Math.max(12, this.nest.x + Math.cos(ang) * dist));
      y = Math.min(this.h - 12, Math.max(12, this.nest.y + Math.sin(ang) * dist));
    }
    return createAnt(cls, x, y, () => this.rng.next());
  }

  private fogSources(): Array<{ x: number; y: number; r: number }> {
    const sources = this.ants
      .filter((a) => !a.internal)
      .map((a) => ({ x: a.x, y: a.y, r: revealRadiusOf(a.cls) }));
    sources.push({ x: this.nest.x, y: this.nest.y, r: FOG.NEST_RADIUS });
    return sources;
  }

  // ═════════════════════════ HUD ═══════════════════════════════════

  publishHud(): void {
    const q = this.queen;
    const band = hungerBand(q.hunger, q.hungerMax);
    const popByClass: Record<AntClass, number> = {
      worker: 0, collector: 0, scout: 0, soldier: 0, defender: 0, toxic: 0, giant: 0,
    };
    for (const a of this.ants) popByClass[a.cls]++;

    this.store.publish({
      screen: this.store.getSnapshot().screen,
      runActive: this.runActive,
      gameOver: this.gameOver,
      mapId: this.mapId,
      runSeconds: this.clock.runSeconds,
      food: this.foodAmount,
      foodCap: NEST.STORAGE,
      chitin: this.chitinAmount,
      hunger: q.hunger,
      hungerMax: q.hungerMax,
      hungerBand: band,
      queenHp: q.hp,
      queenHpMax: q.hpMax,
      nestHp: this.nest.hp,
      nestHpMax: this.nest.hpMax,
      popByClass,
      popTotal: this.popTotal(),
      popCap: POPULATION.MAX_INITIAL,
      queue: q.queue.map((item) => ({
        cls: item.cls,
        stage: stageOf(item),
        pct: Math.max(0, Math.min(1, 1 - item.remainingMs / item.totalMs)),
      })),
      cameraMode: this.camera.mode,
      selectedAntId: this.selectedAntId,
      paused: this.clock.paused,
      delivered: this.deliveredTotal,
      producedTotal: this.producedTotal,
      resourcesLeft: this.resources.reduce((n, r) => n + (r.amount > 0 ? 1 : 0), 0),
      hasSave: SaveSystem.exists(),
      toasts: [...this.toasts],
    });
  }

  /** Referência estável de classes para a UI (custos, nomes). */
  get classInfo(): typeof CLASS_INFO {
    return CLASS_INFO;
  }
}
