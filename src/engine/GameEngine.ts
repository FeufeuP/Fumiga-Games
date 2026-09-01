/**
 * GameEngine — orquestra o loop, a run e a ponte com a interface.
 * Fiel ao original: economia por recurso, loja de 16 melhorias, ondas,
 * chefes, fome da Rainha, desbloqueio de mapas por exploração.
 */
import {
  ANTS, BEHAVIOR, BOSS, ECONOMY, ENGINE, FOG, MAPS, NEST, NEST_COLLAPSE,
  POPULATION, RESOURCES, RALLY, RESOURCE_REGEN, SAVE, SCORE, UPGRADES, WAVES, XP,
  nesthpCost, upgradeCost,
  type AntClass, type EnemyKind, type MapId, type ResourceKind,
} from '../core/constants';
import {
  ACHIEVEMENTS, MISSIONS, trackValue, type MissionTotals,
} from '../systems/missions';
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
import { stepSimulation, makeWaveEnemy, makeBoss, respawnSeconds } from './update';
import { generateWorld } from '../world/world';
import { createAnt, resetAntIds } from '../entities/ants';
import { resetEnemyIds } from '../entities/enemies';
import { createQueenState } from '../systems/queen';
import { emptyUpgrades, modsFrom, upgradeById } from '../systems/shop';
import { Camera } from '../render/Camera';
import { Renderer } from '../render/Renderer';
import { loadSprites, type SpriteSet } from '../render/sprites';
import { AudioManager, type SfxName } from './audio';
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
    rally: { attackCd: 0, collectCd: 0, attackBuff: 0, collectBuff: 0 },
    bossAggro: false,
    missions: { done: 0, total: 0, progress: [] },
    achievements: { done: 0, total: 0, progress: [] },
    rebirths: 0,
    score: 0,
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
  totals = {
    delivered: 0, enemiesKilled: 0, bossesKilled: 0,
    byResource: {} as Partial<Record<ResourceKind, number>>,
    byEnemy: {} as Partial<Record<EnemyKind, number>>,
  };
  upgrades: UpgradeLevels = emptyUpgrades();
  mods: AntMods = modsFrom(emptyUpgrades());
  queen = createQueenState();
  nestHp: number = NEST.HP_MAX;
  wavesByMap: Partial<Record<MapId, number>> = {};

  // ── ciclo A [O] ──────────────────────────────────────────────────
  ownedAnts: Record<AntClass, number> = { worker: 0, soldier: 0, scout: 0 };
  respawnQueue: Array<{ cls: AntClass; t: number }> = [];
  reviveEvents: Array<{ id: number; cls: AntClass; t: number }> = [];
  rally = { attackBuffT: 0, collectBuffT: 0, attackCd: 0, collectCd: 0 };
  bossAggroT = 0;
  bossFirstHit = false;
  bossThrowT = 0;
  smashFx: Array<{ x: number; y: number; t: number }> = [];
  shake = 0;
  /** [O computeFrontier] anel de fronteira que as exploradoras expandem */
  frontierR = FOG.CELL * 2;
  frontierT = 0;
  /** [O tapMarks] marcas do comando CHAMAR (toque/toque duplo) */
  tapMarks: Array<{ x: number; y: number; t: number; color: string }> = [];
  regenT = RESOURCE_REGEN.INTERVAL_SEC;
  nextResourceId = 100000;
  maxRes: Partial<Record<ResourceKind, number>> = {};
  missionsProgress: Record<string, number> = {};
  missionsDone: string[] = [];
  achievementsDone: string[] = [];
  rebirths = 0;

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
    this.totals.byResource[kind] = (this.totals.byResource[kind] ?? 0) + units;
    this.progressResource(kind, units);
    this.checkAchievements();
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

  /** [O nearestEnemyBody] inimigo REVELADO mais próximo (distância ao corpo). */
  nearestVisibleEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (!this.fog.isRevealed(e.x, e.y)) continue;
      const d = Math.max(0, Math.hypot(e.x - x, e.y - y) - this.enemyExtent(e));
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** [O enemyExtent] extensão do corpo (scale/2) */
  enemyExtent(e: Enemy): number {
    return e.scale / 2;
  }

  /** [O pickup] remove o nó de recurso do mapa */
  removeResource(id: number): void {
    this.resources = this.resources.filter((r) => r.id !== id);
  }

  damageEnemy(e: Enemy, dmg: number, _by: AntClass): void {
    e.hp -= dmg;
    if (e.boss && e.hp > 0) {
      // [O] bossAggroT=4 e o smash só começa após o 1º golpe
      this.bossAggroT = BOSS.AGGRO_SEC;
      if (!this.bossFirstHit) {
        this.bossFirstHit = true;
        this.bossThrowT = 15;
      }
    }
    if (e.hp <= 0 && !e.boss) {
      // chefe é contabilizado em onBossDefeated (drops + XP)
      this.xp += e.xp;
      this.totals.enemiesKilled++;
      this.totals.byEnemy[e.kind] = (this.totals.byEnemy[e.kind] ?? 0) + 1;
      this.audio.play('kill');
      this.progressEnemy(e.kind);
      this.checkAchievements();
    }
  }

  antCount(cls: AntClass): number {
    return this.ants.filter((a) => a.cls === cls && a.hp > 0).length;
  }

  playSfx(name: string): void {
    this.audio.play(name as SfxName);
  }

  // ── EnemyHost (IA dos inimigos) ──────────────────────────────────

  damageAnt(antId: number, dmg: number, _by: EnemyKind, fromX?: number, fromY?: number): void {
    const a = this.ants.find((x) => x.id === antId);
    if (!a || a.hp <= 0) return;
    // [O] armadura com piso de 50%
    a.hp -= dmg * Math.max(0.5, 1 - this.mods.armorReduction);
    // [O] não-soldados fogem por 0.9s na direção contrária
    if (a.cls !== 'soldier' && fromX !== undefined && fromY !== undefined) {
      const d = Math.hypot(a.x - fromX, a.y - fromY) || 1;
      a.fearAx = ((a.x - fromX) / d) * 120;
      a.fearAy = ((a.y - fromY) / d) * 120;
      a.fearT = BEHAVIOR.FLEE_SEC;
    }
  }

  damageNest(dmg: number, _fromX?: number, _fromY?: number): void {
    if (this.nestHp <= 0) return; // já colapsado [O]
    const before = this.nestHp;
    this.nestHp = Math.max(0, this.nestHp - dmg);
    this.shake = Math.max(this.shake, 0.7);
    if (before > 0 && this.nestHp <= 0) {
      // [O] colapso: perde 30% das folhas e a onda recomeça
      const lost = Math.floor((this.wallet.leaf ?? 0) * NEST_COLLAPSE.LEAF_LOSS_FRAC);
      this.wallet.leaf = (this.wallet.leaf ?? 0) - lost;
      this.shake = 2;
      if (this.wave.active) {
        this.wave.tSec = WAVES.COMBAT_SEC;
        this.wave.spawned = 0;
        this.wave.spawnT = 0;
      }
      this.pushToast(
        lost > 0
          ? `O formigueiro entrou em colapso! Perdeu ${lost} folhas.`
          : 'O formigueiro entrou em colapso!',
        'warn',
      );
    }
  }

  // ═════════════════════════ SIMHOST ════════════════════════════════

  get boss(): Enemy | null {
    return this.enemies.find((e) => e.boss && e.hp > 0) ?? null;
  }

  /** [O] buffs do rally lidos pelas formigas */
  get buffs(): { collectSpeedMult: number; attackCdMult: number } {
    return {
      collectSpeedMult: this.rally.collectBuffT > 0 ? RALLY.COLLECT_SPEED_MULT : 1,
      attackCdMult: this.rally.attackBuffT > 0 ? RALLY.ATTACK_SPEED_MULT : 1,
    };
  }

  /** [O] placar (Sm): recursos×5 + inimigos×20 + chefes×100 + xp×2 + conquistas×50 + missões×100 + renasc×200 */
  get score(): number {
    return (
      this.totals.delivered * SCORE.PER_RESOURCE +
      this.totals.enemiesKilled * SCORE.PER_ENEMY +
      this.totals.bossesKilled * SCORE.PER_BOSS +
      this.xp * SCORE.PER_XP +
      this.achievementsDone.length * SCORE.PER_ACHIEVEMENT +
      this.missionsDone.length * SCORE.PER_MISSION +
      this.rebirths * SCORE.PER_REBIRTH
    );
  }

  /** [O] qn + upgrades.nesthp × Er */
  nestHpMax(): number {
    return NEST.HP_MAX + (this.upgrades.nesthp ?? 0) * NEST.HP_PER_UPGRADE;
  }

  private scoutSpawnI = 0;

  spawnAnt(cls: AntClass): void {
    const ang = this.rng.next() * Math.PI * 2;
    const dist = 8 + this.rng.next() * 14; // [O] nasce colada ao ninho
    const x = Math.min(this.w - 12, Math.max(12, this.nest.x + Math.cos(ang) * dist));
    const y = Math.min(this.h - 12, Math.max(12, this.nest.y + Math.sin(ang) * dist));
    const ant = createAnt(cls, x, y, () => this.rng.next());
    // [O] hp = pb × (1 + 0.15·hpboost + 0.01·At(r).hpPct)
    const hpPct = this.mods.hpMult;
    ant.hp = ant.hpMax = Math.round(ANTS[cls].hp * hpPct);
    ant.angle = ant.wanderAngle = ang;
    if (cls === 'scout') {
      // [O] exploradoras cobrem ângulos diferentes do anel de fronteira
      const n = Math.max(1, this.ownedAnts.scout + 1);
      ant.scoutA = ((this.scoutSpawnI % n) / n) * Math.PI * 2 + (this.rng.next() - 0.5) * 0.35;
      ant.scoutR = 0.95 + (this.scoutSpawnI % 3) * 0.1 + this.rng.next() * 0.05;
      this.scoutSpawnI++;
    }
    this.ants.push(ant);
  }

  /** [O] killAnt: carga cai no chão + fila do cemitério */
  killAnt(a: Ant): void {
    for (let i = 0; i < a.carrying; i++) {
      this.resources.push({
        id: this.nextResourceId++,
        kind: a.carryKind ?? 'leaf',
        x: a.x + (this.rng.next() - 0.5) * 20,
        y: a.y + (this.rng.next() - 0.5) * 20,
        amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
    }
    this.respawnQueue.push({
      cls: a.cls,
      t: respawnSeconds(this.upgrades.respawn ?? 0),
    });
    this.audio.play('kill');
  }

  onAntRespawned(cls: AntClass): void {
    this.audio.play('respawn');
    this.reviveEvents.push({ id: this.toastSeq, cls, t: 0 });
    if (this.reviveEvents.length > 12) this.reviveEvents.shift();
  }

  /** [O] spawnResource: nasce em área revelada, longe do ninho e de obstáculos */
  spawnResource(kind: ResourceKind): void {
    const minDist = BEHAVIOR.RES_MIN_DIST;
    for (let t = 0; t < 120; t++) {
      const x = 50 + this.rng.next() * (this.w - 100);
      const y = 50 + this.rng.next() * (this.h - 100);
      if (Math.hypot(x - this.nest.x, y - this.nest.y) < minDist) continue;
      if (!this.fog.isRevealed(x, y)) continue;
      if (this.blocked(x, y)) continue;
      this.resources.push({
        id: this.nextResourceId++, kind, x, y, amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
      return;
    }
    // anel ao redor do ninho em ponto revelado [O fallback]
    for (let t = 0; t < 120; t++) {
      const ang = this.rng.next() * Math.PI * 2;
      const dist = minDist + this.rng.next() * 140;
      const x = this.nest.x + Math.cos(ang) * dist;
      const y = this.nest.y + Math.sin(ang) * dist;
      if (x < 30 || y < 30 || x > this.w - 30 || y > this.h - 30) continue;
      if (!this.fog.isRevealed(x, y) || this.blocked(x, y)) continue;
      this.resources.push({
        id: this.nextResourceId++, kind, x, y, amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
      return;
    }
  }

  private blocked(x: number, y: number): boolean {
    for (const p of this.props) {
      if (p.solid && Math.hypot(x - p.x, y - p.y) < p.r + 16) return true;
    }
    return false;
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
    this.audio.play('levelUp');
    this.pushToast(`⭐ A colônia alcançou o nível ${level}!`, 'success');
  }

  onQueenDead(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clock.paused = true;
    this.audio.play('kill');
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
    this.progressBoss();
    this.checkAchievements();
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
    // [O] o original NÃO tem fauna ambiente: inimigos só vêm das ondas
    this.resources = [];
    this.enemies = [];
    this.nest = { x: world.nestX, y: world.nestY, hp: this.nestHp, hpMax: NEST.HP_MAX };
    this.fog = new FogOfWar(world.w, world.h);
    this.camera.setWorldSize(world.w, world.h);
    // [O] maxRes: teto de nós por tipo para a regeneração
    this.maxRes = { [MAPS[mapId].resource]: MAPS[mapId].resourceCount };
    this.rebuildResourceIndex();
  }

  /** [O computeFrontier] menor anel totalmente revelado a partir de 2 células. */
  computeFrontier(): void {
    const cell = FOG.CELL;
    const maxR = Math.hypot(
      Math.max(this.nest.x, this.w - this.nest.x),
      Math.max(this.nest.y, this.h - this.nest.y),
    );
    let r = cell * 2;
    while (r < maxR) {
      let revealed = true;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        if (!this.fog.isRevealed(this.nest.x + Math.cos(a) * r, this.nest.y + Math.sin(a) * r)) {
          revealed = false;
          break;
        }
      }
      if (!revealed) break;
      r += cell;
    }
    this.frontierR = Math.max(cell * 2, r);
  }

  /** [O buildWorld] revela o ninho e semeia os recursos INICIAIS na área
   *  revelada: maxRes × exploredFactor (piso 15%), a ≥170px do ninho. */
  private seedWorld(): void {
    this.fog.reveal(this.nest.x, this.nest.y, FOG.NEST_RADIUS);
    this.computeFrontier();
    this.exploredPct = Math.round(this.fog.revealedFraction() * 100);
    const kind = MAPS[this.mapId].resource;
    const factor = Math.max(RESOURCE_REGEN.FACTOR_MIN, this.exploredPct / 100);
    const n = Math.round((this.maxRes[kind] ?? 0) * factor);
    for (let i = 0; i < n; i++) this.spawnResource(kind);
    this.rebuildResourceIndex();
  }

  private populate(): void {
    this.ants = [];
    this.ownedAnts = { worker: 0, soldier: 0, scout: 0 };
    const add = (cls: AntClass, n: number) => {
      for (let i = 0; i < n; i++) {
        this.ownedAnts[cls] += 1;
        this.spawnAnt(cls);
      }
    };
    for (const [cls, n] of Object.entries(POPULATION.START) as Array<[AntClass, number]>) {
      add(cls, n);
    }
    // formigas extras já compradas na loja
    add('worker', (this.upgrades.antlimit ?? 0) * 5);
    add('soldier', (this.upgrades.soldier ?? 0) * 5);
    add('scout', (this.upgrades.scout ?? 0) * 5);
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
    this.mods = modsFrom(this.upgrades, this.rebirths);
    // [O] totais e conquistas são CUMULATIVOS (persistem entre runs);
    // missões reiniciam a cada run/renascimento
    this.unlockedMaps = ['campo'];
    this.wavesByMap = {};
    this.queen = createQueenState();
    this.nestHp = NEST.HP_MAX;
    this.missionsProgress = {};
    this.missionsDone = [];
    this.respawnQueue = [];
    this.reviveEvents = [];
    this.rally = { attackBuffT: 0, collectBuffT: 0, attackCd: 0, collectCd: 0 };
    this.bossAggroT = 0;
    this.bossFirstHit = false;
    this.bossThrowT = 0;
    this.smashFx = [];
    this.shake = 0;
    this.wave = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
    this.rng = new Rng((Date.now() & 0x7fffffff) || 1);

    this.loadWorld(mapId);
    this.populate();
    this.seedWorld();
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

    // [O] nesthp custa VÁRIOS recursos (ob(l)); os demais, um só
    if (def.multiCost) {
      const costs = nesthpCost(bought);
      if (!costs.every((c) => (this.wallet[c.kind] ?? 0) >= c.amount)) return false;
      for (const c of costs) this.wallet[c.kind] -= c.amount;
    } else {
      const cost = upgradeCost(def, bought);
      if (!this.takeResource(cost.kind, cost.amount)) return false;
    }

    this.upgrades = { ...this.upgrades, [id]: bought + 1 };
    this.mods = modsFrom(this.upgrades, this.rebirths);

    if (def.id === 'antlimit') {
      this.ownedAnts.worker += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('worker');
    }
    if (def.id === 'soldier') {
      this.ownedAnts.soldier += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('soldier');
    }
    if (def.id === 'scout') {
      this.ownedAnts.scout += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('scout');
    }
    if (def.id === 'nesthp') {
      // [O] w.nestHp = qn + upgrades.nesthp × Er
      const max = this.nestHpMax();
      this.nest.hpMax = max;
      this.nestHp = Math.min(max, this.nestHp + NEST.HP_PER_UPGRADE);
    }

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
    this.seedWorld();
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
    return d <= 90 ? 'interior' : null; // [O] toque no ninho < 90
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

  /** [O OPCOES] efeitos sonoros on/off (persiste formigueiro-sound-v1) */
  toggleMute(): void {
    this.audio.setSound(!this.audio.soundOn);
    this.publishHud();
  }

  /** [O OPCOES] musica on/off (persiste formigueiro-music-v1) */
  toggleMusic(): void {
    this.audio.setMusic(!this.audio.musicOn);
    this.publishHud();
  }

  /** [O OPCOES] resetar progresso: apaga save e volta ao zero */
  resetProgress(): void {
    try {
      window.localStorage.removeItem(SAVE.KEY);
    } catch { /* storage indisponível */ }
    this.achievementsDone = [];
    this.missionsDone = [];
    this.rebirths = 0;
    this.publishHud();
  }

  /** [O menu SAIR] he(): Android.exit → window.close → toast */
  exitGame(): void {
    const android = (window as unknown as { Android?: { exit?: () => void } }).Android;
    if (android?.exit) {
      android.exit();
      return;
    }
    window.close();
    // window.close() raramente fecha abas do usuário: confirma e avisa
    window.setTimeout(() => {
      this.pushToast('Use o botão do navegador para fechar.', 'info');
    }, 150);
  }

  /** [O CREDITOS] tela cheia com toasts exatos do original */
  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      this.pushToast(
        document.fullscreenEnabled
          ? 'Tela cheia bloqueada neste preview. Use F11.'
          : 'Este navegador não suporta tela cheia. Use F11.',
        'info',
      );
    }
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

  // ═════════════════════ MISSÕES/CONQUISTAS [O] ═════════════════════

  private missionTotals(): MissionTotals {
    return {
      resources: this.totals.delivered,
      enemies: this.totals.enemiesKilled,
      bosses: this.totals.bossesKilled,
      byResource: this.totals.byResource,
      byEnemy: this.totals.byEnemy,
    };
  }

  /** [O] progressResource: atualiza missões de recurso e completa as prontas */
  progressResource(kind: ResourceKind, units: number): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'resource' || m.track.kind !== kind) continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + units;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  /** [O] progressEnemy */
  progressEnemy(kind: EnemyKind): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'enemy' || m.track.kind !== kind) continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + 1;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  /** [O] progressBoss */
  progressBoss(): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'bosses') continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + 1;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  private completeMission(m: (typeof MISSIONS)[number]): void {
    this.missionsDone.push(m.id);
    this.xp += m.rewardXp;
    this.audio.play('win');
    this.pushToast(`📜 Missão concluída: ${m.title}! +${m.rewardXp} XP`, 'success');
  }

  /** [O] checkAchievements: completam sozinhas, dão XP+recursos+formigas */
  checkAchievements(): void {
    const totals = this.missionTotals();
    for (const a of ACHIEVEMENTS) {
      if (this.achievementsDone.includes(a.id)) continue;
      if (trackValue(a.track, totals) < a.goal) continue;
      this.achievementsDone.push(a.id);
      for (const [kind, n] of Object.entries(a.rewardResources)) {
        this.wallet[kind as ResourceKind] += n ?? 0;
      }
      for (const [cls, n] of Object.entries(a.rewardAnts)) {
        for (let i = 0; i < (n ?? 0); i++) {
          this.ownedAnts[cls as AntClass] += 1;
          this.spawnAnt(cls as AntClass);
        }
      }
      this.xp += a.rewardXp;
      this.audio.play('win');
      this.pushToast(`🏆 Conquista: ${a.title}! +${a.rewardXp} XP`, 'success');
    }
  }

  /** [O advanceWave] adianta a próxima onda em troca de recursos. */
  advanceWave(): boolean {
    if (!this.runActive || this.gameOver || this.wave.active) return false;
    const kind = MAPS[this.mapId].resource;
    const n = 3 + this.wave.num + 1;
    this.wallet[kind] = (this.wallet[kind] ?? 0) + n;
    this.wave.tSec = 0;
    this.audio.play('click');
    this.pushToast(`Onda adiantada! +${n} ${RESOURCES[kind].name}.`, 'success');
    this.publishHud();
    return true;
  }

  // ═════════════════════ COMANDOS DE TOQUE [O] ═════════════════════

  /** [O callScouts] toque simples: exploradoras acorrem ao ponto. */
  callScouts(x: number, y: number): void {
    if (!this.runActive || this.gameOver) return;
    const cx = Math.min(this.w - 30, Math.max(30, x));
    const cy = Math.min(this.h - 30, Math.max(30, y));
    for (const a of this.ants) {
      if (a.cls !== 'scout' || a.z > 0) continue;
      const p = 14 + this.rng.next() * 34;
      const ang = this.rng.next() * Math.PI * 2;
      a.tx = cx + Math.cos(ang) * p;
      a.ty = cy + Math.sin(ang) * p;
      a.state = 'command';
      a.scoutTx = a.tx;
      a.scoutTy = a.ty;
    }
    this.tapMarks.push({ x: cx, y: cy, t: 0.45, color: '102,202,104' });
    this.audio.play('click');
  }

  /** [O callSoldiers] toque duplo: soldados acorrem ao ponto. */
  callSoldiers(x: number, y: number): void {
    if (!this.runActive || this.gameOver) return;
    const cx = Math.min(this.w - 30, Math.max(30, x));
    const cy = Math.min(this.h - 30, Math.max(30, y));
    for (const a of this.ants) {
      if (a.cls !== 'soldier' || a.z > 0) continue;
      const p = 14 + this.rng.next() * 34;
      const ang = this.rng.next() * Math.PI * 2;
      a.tx = cx + Math.cos(ang) * p;
      a.ty = cy + Math.sin(ang) * p;
      a.state = 'command';
      a.targetEnemyId = null;
    }
    this.tapMarks.push({ x: cx, y: cy, t: 0.45, color: '240,101,92' });
    this.audio.play('click');
  }

  // ═════════════════════ RALLY / RENASCER [O] ═══════════════════════

  /** [O] ATACAR!: 6s de buff, soldados partem para o inimigo mais próximo */
  rallyAttack(): boolean {
    if (!this.runActive || this.gameOver || this.rally.attackCd > 0) return false;
    this.rally.attackBuffT = RALLY.ATTACK_BUFF_SEC;
    this.rally.attackCd = RALLY.ATTACK_CD_SEC;
    for (const a of this.ants) {
      if (a.cls !== 'soldier' || a.z > 0) continue;
      const enemy = this.nearestVisibleEnemy(a.x, a.y, 1e5);
      if (enemy) {
        a.targetEnemyId = enemy.id;
        a.tx = enemy.x;
        a.ty = enemy.y;
        a.state = 'command';
        a.targetResId = null;
      }
    }
    this.audio.play('click');
    this.pushToast('⚔️ Soldados convocados ao ataque!', 'info');
    this.publishHud();
    return true;
  }

  /** [O] COLETA!: 8s de velocidade ×1.6 para as operárias */
  rallyCollect(): boolean {
    if (!this.runActive || this.gameOver || this.rally.collectCd > 0) return false;
    this.rally.collectBuffT = RALLY.COLLECT_BUFF_SEC;
    this.rally.collectCd = RALLY.COLLECT_CD_SEC;
    this.audio.play('click');
    this.pushToast('🍃 Operárias em ritmo de colheita!', 'info');
    this.publishHud();
    return true;
  }

  /** [O] Renascimento: zera a run e deixa bônus permanentes */
  rebirth(): boolean {
    if (!this.runActive) return false;
    this.rebirths += 1;
    // [O] x.missions={}, x.missionsDone=[] — conquistas e totais persistem
    const rebirths = this.rebirths;
    this.newGame('campo');
    this.rebirths = rebirths;
    this.mods = modsFrom(this.upgrades, this.rebirths);
    this.audio.play('win');
    this.pushToast(
      `Renascimento ${this.rebirths}! A colônia volta mais forte.`,
      'success',
    );
    this.publishHud();
    return true;
  }

  // ═════════════════════════ HUD ═══════════════════════════════════

  publishHud(): void {
    const antsCount: Record<AntClass, number> = { ...this.ownedAnts };

    const shopCosts: HudState['shopCosts'] = {};
    for (const def of UPGRADES) {
      const bought = this.upgrades[def.id] ?? 0;
      const cost = upgradeCost(def, bought);
      shopCosts[def.id] = {
        kind: cost.kind, amount: cost.amount, maxed: bought >= def.max,
        multi: def.multiCost ? nesthpCost(bought) : undefined,
      };
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
      nestHpMax: this.nestHpMax(),
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
      rally: {
        attackCd: Math.ceil(this.rally.attackCd),
        collectCd: Math.ceil(this.rally.collectCd),
        attackBuff: Math.ceil(this.rally.attackBuffT),
        collectBuff: Math.ceil(this.rally.collectBuffT),
      },
      bossAggro: this.bossAggroT > 0,
      missions: {
        done: this.missionsDone.length,
        total: MISSIONS.length,
        progress: MISSIONS.map((m) => ({
          id: m.id, title: m.title, desc: m.desc,
          value: Math.min(m.goal, this.missionsProgress[m.id] ?? 0),
          goal: m.goal, rewardXp: m.rewardXp,
          done: this.missionsDone.includes(m.id),
        })),
      },
      achievements: {
        done: this.achievementsDone.length,
        total: ACHIEVEMENTS.length,
        progress: ACHIEVEMENTS.map((a) => ({
          id: a.id, title: a.title, desc: a.desc,
          value: Math.min(a.goal, trackValue(a.track, this.missionTotals())),
          goal: a.goal,
          done: this.achievementsDone.includes(a.id),
        })),
      },
      rebirths: this.rebirths,
      score: this.score,
    });
  }
}
