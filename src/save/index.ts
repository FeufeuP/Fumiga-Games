/**
 * Save v2 — serialização da run completa (economia, melhorias, ondas por mapa,
 * Rainha, formigas, recursos do mapa e névoa em RLE).
 * Consolidado: carga, gravação, checksum e storage num arquivo só.
 * v1 é rejeitado (mudança de modelo); USE_CHECKSUM protege contra corrupção.
 */
import { SAVE, type AntClass, type EnemyKind, type MapId, type ResourceKind } from '../core/constants';
import type { AntState, Resources, UpgradeLevels, WaveState } from '../core/types';
import { FogOfWar } from '../engine/fogOfWar';
import { modsFrom, emptyUpgrades } from '../systems/shop';
import { cardModsFrom } from '../roguelike/modifiers';
import { resumeAntIds } from '../entities/ants';
import { resumeEnemyIds } from '../entities/enemies';
import { generateWorld } from '../world/world';
import type { GameEngine } from '../engine/GameEngine';

// ── tipos ───────────────────────────────────────────────────────────

interface SavedAnt {
  id: number; cls: AntClass; x: number; y: number; dir: 1 | -1;
  hp: number; hpMax: number; carrying: number; carryKind: ResourceKind | null;
  state: AntState; timer: number; attackCd: number;
  targetResId: number | null; targetEnemyId: number | null;
  tx: number; ty: number; walkPhase: number; seed: number;
  z: number; vx: number; vy: number; vz: number;
  // IA fiel [O] (ausente em saves antigos → default)
  angle?: number; wanderAngle?: number; wanderT?: number;
  scoutA?: number; scoutR?: number;
  // 5B: guarda temporário (Muralha de defensores)
  tempT?: number;
}

export interface RunSaveV2 {
  version: 2 | 3;
  savedAt: number;
  mapId: MapId;
  runSeconds: number;
  timeSec: number;
  wallet: Resources;
  xp: number;
  level: number;
  upgrades: UpgradeLevels;
  unlockedMaps: MapId[];
  wavesByMap: Partial<Record<MapId, number>>;
  totals: { delivered: number; enemiesKilled: number; bossesKilled: number };
  queen: {
    hunger: number; hungerMax?: number; dead: boolean; feedT: number;
    warn30: boolean; warn10: boolean;
    eggT?: number; satietyT?: number;
  };
  nestHp: number;
  wave: WaveState;
  ants: SavedAnt[];
  resourceNodes: ReadonlyArray<{ id: number; kind: ResourceKind; x: number; y: number; amount: number; phase?: number }>;
  fogRLE: number[];
  camera: { cx: number; cy: number; mode: string };
  selectedAntId: number | null;
  gameOver: boolean;

  // v3 (ciclo A)
  totalsByResource?: Partial<Record<ResourceKind, number>>;
  totalsByEnemy?: Partial<Record<EnemyKind, number>>;
  missionsProgress?: Record<string, number>;
  missionsDone?: string[];
  achievementsDone?: string[];
  rebirths?: number;
  ownedAnts?: Record<AntClass, number>;
  respawnQueue?: Array<{ cls: AntClass; t: number }>;

  // v3 (baralho roguelike 5A — opcionais, retrocompatíveis)
  cards?: Record<string, number>;
  pendingCardPanels?: number | Array<'levelup' | 'bau_comum' | 'bau_chefe' | 'bau_lendario'>;
  queenReviveUsed?: boolean;
  // v3 (baralho roguelike 5B)
  chitin?: number;
  chests?: Array<{ id: number; x: number; y: number }>;
  slotBonus?: Record<'especializacao' | 'comportamento' | 'passiva', number>;
  bossesThisRun?: number;
}

export type RunSaveV3 = RunSaveV2 & Required<Pick<RunSaveV2, 'version'>>;

interface SaveEnvelope {
  v: 2 | 3;
  checksum: string;
  data: RunSaveV2;
}

// ── storage + checksum ─────────────────────────────────────────────

function checksum(json: string): string {
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function storageGet(): string | null {
  try {
    return localStorage.getItem(SAVE.KEY);
  } catch {
    return null;
  }
}

function storageSet(raw: string): void {
  try {
    localStorage.setItem(SAVE.KEY, raw);
  } catch {
    /* modo privado / cota cheia — jogo continua sem save */
  }
}

export function saveExists(): boolean {
  return storageGet() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE.KEY);
  } catch {
    /* ignora */
  }
}

// ── serialização ───────────────────────────────────────────────────

export function serialize(engine: GameEngine): RunSaveV2 {
  return {
    version: SAVE.VERSION as 3,
    savedAt: Date.now(),
    mapId: engine.mapId,
    runSeconds: engine.clock.runSeconds,
    timeSec: engine.timeSec,
    wallet: { ...engine.wallet },
    xp: engine.xp,
    level: engine.level,
    upgrades: { ...engine.upgrades },
    unlockedMaps: [...engine.unlockedMaps],
    wavesByMap: { ...engine.wavesByMap },
    totals: { ...engine.totals },
    queen: { ...engine.queen },
    nestHp: engine.nestHp,
    wave: { ...engine.wave },
    ants: engine.ants.map((a) => ({
      id: a.id, cls: a.cls, x: Math.round(a.x), y: Math.round(a.y), dir: a.dir,
      hp: Math.round(a.hp), hpMax: a.hpMax, carrying: a.carrying, carryKind: a.carryKind,
      state: a.state, timer: a.timer, attackCd: a.attackCd,
      targetResId: a.targetResId, targetEnemyId: a.targetEnemyId,
      tx: Math.round(a.tx), ty: Math.round(a.ty), walkPhase: a.walkPhase, seed: a.seed,
      z: a.z, vx: a.vx, vy: a.vy, vz: a.vz,
      angle: a.angle, wanderAngle: a.wanderAngle, wanderT: a.wanderT,
      scoutA: a.scoutA, scoutR: a.scoutR,
      tempT: a.tempT,
    })),
    resourceNodes: engine.resources.map((r) => ({
      id: r.id, kind: r.kind, x: Math.round(r.x), y: Math.round(r.y),
      amount: r.amount, phase: r.phase,
    })),
    fogRLE: engine.fog.serializeRLE(),
    camera: { cx: engine.camera.cx, cy: engine.camera.cy, mode: engine.camera.mode },
    selectedAntId: engine.selectedAntId,
    gameOver: engine.gameOver,
    totalsByResource: { ...engine.totals.byResource },
    totalsByEnemy: { ...engine.totals.byEnemy },
    missionsProgress: { ...engine.missionsProgress },
    missionsDone: [...engine.missionsDone],
    achievementsDone: [...engine.achievementsDone],
    rebirths: engine.rebirths,
    ownedAnts: { ...engine.ownedAnts },
    respawnQueue: engine.respawnQueue.map((q) => ({ cls: q.cls, t: q.t })),
    cards: { ...engine.cards },
    pendingCardPanels: [...engine.pendingCardPanels],
    queenReviveUsed: engine.queenReviveUsed,
    chitin: engine.chitin,
    chests: engine.chests.map((c) => ({ ...c })),
    slotBonus: { ...engine.slotBonus },
    bossesThisRun: engine.bossesThisRun,
  };
}

export function writeSave(save: RunSaveV2): void {
  const json = JSON.stringify(save);
  const env: SaveEnvelope = {
    v: 3,
    checksum: SAVE.USE_CHECKSUM ? checksum(json) : '',
    data: save,
  };
  storageSet(JSON.stringify(env));
}

export function loadSave(): RunSaveV2 | null {
  const raw = storageGet();
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as SaveEnvelope;
    if (env.v < 2 || env.v > 3 || !env.data) return null;
    if (SAVE.USE_CHECKSUM && env.checksum && env.checksum !== checksum(JSON.stringify(env.data))) {
      return null;
    }
    return { ...env.data, version: env.data.version === 3 ? 3 : 2 };
  } catch {
    return null;
  }
}

// ── restauração ───────────────────────────────────────────────────

export function applySave(engine: GameEngine, save: RunSaveV2): boolean {
  if (save.version !== 2 && save.version !== 3) return false;

  engine.gameOver = save.gameOver;
  engine.wallet = { ...save.wallet };
  engine.xp = save.xp;
  engine.level = save.level;
  engine.upgrades = { ...emptyUpgrades(), ...save.upgrades };
  engine.mods = modsFrom(engine.upgrades);
  engine.unlockedMaps = [...save.unlockedMaps];
  engine.wavesByMap = { ...save.wavesByMap };
  engine.totals = {
    ...save.totals,
    byResource: { ...(save.totalsByResource ?? {}) },
    byEnemy: { ...(save.totalsByEnemy ?? {}) },
  };
  engine.missionsProgress = { ...(save.missionsProgress ?? {}) };
  engine.missionsDone = [...(save.missionsDone ?? [])];
  engine.achievementsDone = [...(save.achievementsDone ?? [])];
  engine.rebirths = save.rebirths ?? 0;
  engine.ownedAnts = { ...(save.ownedAnts ?? { worker: 0, soldier: 0, scout: 0 }) };
  engine.respawnQueue = (save.respawnQueue ?? []).map((q) => ({ cls: q.cls, t: q.t }));
  // baralho roguelike 5A+5B: restaura e recalcula os modificadores
  engine.cards = { ...(save.cards ?? {}) };
  engine.cardMods = cardModsFrom(engine.cards);
  const pend = save.pendingCardPanels;
  engine.pendingCardPanels = Array.isArray(pend) ? [...pend] : pend ? ['levelup'] : [];
  engine.queenReviveUsed = save.queenReviveUsed ?? false;
  engine.cardPanel = null;
  engine.replaceDialog = null;
  engine.chitin = save.chitin ?? 0;
  engine.chests = (save.chests ?? []).map((c) => ({ ...c }));
  engine.slotBonus = { ...(save.slotBonus ?? { especializacao: 0, comportamento: 0, passiva: 0 }) };
  engine.bossesThisRun = save.bossesThisRun ?? 0;
  engine.queen = {
    ...save.queen,
    hungerMax: save.queen.hungerMax ?? Math.round(100 * engine.cardMods.hungerMaxMult),
    eggT: save.queen.eggT ?? 0,
    satietyT: save.queen.satietyT ?? 0,
  };
  engine.nestHp = save.nestHp;
  engine.wave = { ...save.wave };
  engine.timeSec = save.timeSec;
  engine.clock.runSeconds = save.runSeconds;
  engine.selectedAntId = save.selectedAntId;

  // mundo: props regenerados pela seed fixa; nós de recurso restaurados
  const world = generateWorld(save.mapId);
  engine.mapId = save.mapId;
  engine.w = world.w;
  engine.h = world.h;
  engine.props = world.props;
  engine.enemies = [];
  engine.nest = { x: world.nestX, y: world.nestY, hp: save.nestHp, hpMax: engine.nestHpMax() };
  // armadilhas de resina: posições fixas recalculadas se a carta estiver ativa
  engine.traps = engine.cardMods.trapCdSec > 0
    ? [0, 1, 2].map((i) => {
        const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
        return { x: world.nestX + Math.cos(ang) * 130, y: world.nestY + Math.sin(ang) * 130, cd: 0 };
      })
    : [];
  engine.resources = save.resourceNodes.map((r) => ({
    ...r, phase: r.phase ?? 0,
  }));
  engine.fog = FogOfWar.fromRLE(world.w, world.h, save.fogRLE);
  engine.camera.setWorldSize(world.w, world.h);
  engine.camera.cx = save.camera.cx;
  engine.camera.cy = save.camera.cy;
  engine.camera.mode = save.camera.mode === 'free' ? 'free' : 'follow';
  engine.camera.clamp();

  engine.ants = save.ants.map((a) => ({
    angle: a.wanderAngle ?? 0,
    wanderAngle: a.wanderAngle ?? 0,
    wanderT: a.wanderT ?? 0,
    fearT: 0,
    fearAx: 0,
    fearAy: 0,
    stunT: 0,
    scoutA: a.scoutA ?? a.wanderAngle ?? 0,
    scoutR: a.scoutR ?? 1,
    scoutTx: a.x,
    scoutTy: a.y,
    scoutDecideT: 0,
    ...a,
  }));
  resumeAntIds(save.ants.reduce((m, a) => Math.max(m, a.id), 0));
  resumeEnemyIds(engine.enemies.reduce((m, e) => Math.max(m, e.id), 0));

  engine.rebuildResourceIndex();
  engine.recomputeFogActive();
  engine.exploredPct = Math.round(engine.fog.revealedFraction() * 100);
  engine.computeFrontier();
  return true;
}
