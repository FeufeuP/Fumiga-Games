/**
 * Save v2 — serialização da run completa (economia, melhorias, ondas por mapa,
 * Rainha, formigas, recursos do mapa e névoa em RLE).
 * Consolidado: carga, gravação, checksum e storage num arquivo só.
 * v1 é rejeitado (mudança de modelo); USE_CHECKSUM protege contra corrupção.
 */
import { SAVE, type AntClass, type MapId, type ResourceKind } from '../core/constants';
import type { AntState, Resources, UpgradeLevels, WaveState } from '../core/types';
import { FogOfWar } from '../engine/fogOfWar';
import { modsFrom, emptyUpgrades } from '../systems/shop';
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
}

export interface RunSaveV2 {
  version: 2;
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
  queen: { hunger: number; dead: boolean; feedT: number; warn30: boolean; warn10: boolean };
  nestHp: number;
  wave: WaveState;
  ants: SavedAnt[];
  resourceNodes: ReadonlyArray<{ id: number; kind: ResourceKind; x: number; y: number; amount: number }>;
  fogRLE: number[];
  camera: { cx: number; cy: number; mode: string };
  selectedAntId: number | null;
  gameOver: boolean;
}

interface SaveEnvelope {
  v: 2;
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
    version: 2,
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
    })),
    resourceNodes: engine.resources.map((r) => ({
      id: r.id, kind: r.kind, x: Math.round(r.x), y: Math.round(r.y), amount: r.amount,
    })),
    fogRLE: engine.fog.serializeRLE(),
    camera: { cx: engine.camera.cx, cy: engine.camera.cy, mode: engine.camera.mode },
    selectedAntId: engine.selectedAntId,
    gameOver: engine.gameOver,
  };
}

export function writeSave(save: RunSaveV2): void {
  const json = JSON.stringify(save);
  const env: SaveEnvelope = {
    v: 2,
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
    if (env.v !== 2 || !env.data || env.data.version !== 2) return null;
    if (SAVE.USE_CHECKSUM && env.checksum && env.checksum !== checksum(JSON.stringify(env.data))) {
      return null;
    }
    return env.data;
  } catch {
    return null;
  }
}

// ── restauração ───────────────────────────────────────────────────

export function applySave(engine: GameEngine, save: RunSaveV2): boolean {
  if (save.version !== 2) return false;

  engine.gameOver = save.gameOver;
  engine.wallet = { ...save.wallet };
  engine.xp = save.xp;
  engine.level = save.level;
  engine.upgrades = { ...emptyUpgrades(), ...save.upgrades };
  engine.mods = modsFrom(engine.upgrades);
  engine.unlockedMaps = [...save.unlockedMaps];
  engine.wavesByMap = { ...save.wavesByMap };
  engine.totals = { ...save.totals };
  engine.queen = { ...save.queen };
  engine.nestHp = save.nestHp;
  engine.wave = { ...save.wave };
  engine.timeSec = save.timeSec;
  engine.clock.runSeconds = save.runSeconds;
  engine.selectedAntId = save.selectedAntId;

  // mundo: props/fauna regenerados pela seed fixa; nós de recurso restaurados
  const world = generateWorld(save.mapId);
  engine.mapId = save.mapId;
  engine.w = world.w;
  engine.h = world.h;
  engine.props = world.props;
  engine.enemies = world.ambientEnemies;
  engine.nest = { x: world.nestX, y: world.nestY, hp: save.nestHp, hpMax: 400 };
  engine.resources = save.resourceNodes.map((r) => ({ ...r }));
  engine.fog = FogOfWar.fromRLE(world.w, world.h, save.fogRLE);
  engine.camera.setWorldSize(world.w, world.h);
  engine.camera.cx = save.camera.cx;
  engine.camera.cy = save.camera.cy;
  engine.camera.mode = save.camera.mode === 'free' ? 'free' : 'follow';
  engine.camera.clamp();

  engine.ants = save.ants.map((a) => ({ ...a }));
  resumeAntIds(save.ants.reduce((m, a) => Math.max(m, a.id), 0));
  resumeEnemyIds(engine.enemies.reduce((m, e) => Math.max(m, e.id), 0));

  engine.rebuildResourceIndex();
  engine.recomputeFogActive();
  engine.exploredPct = Math.round(engine.fog.revealedFraction() * 100);
  return true;
}
