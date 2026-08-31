/**
 * Tipos globais — modelo fiel ao original: 3 classes de formiga,
 * economia por tipo de recurso, inimigos/ondas/chefes, loja de melhorias.
 */
import type { AntClass, EnemyKind, MapId, ResourceKind, UpgradeDef } from './constants';
import type { Rng } from './rng';
import type { EventBus } from './events';
import type { FogOfWar } from '../engine/fogOfWar';

export type { AntClass, EnemyKind, MapId, ResourceKind, UpgradeDef };

export interface Vec2 { x: number; y: number }

export type AntState =
  | 'idle' | 'gotoResource' | 'harvest' | 'returnNest'
  | 'explore' | 'patrol' | 'seekEnemy' | 'attack' | 'returnHome';

export interface Ant {
  id: number;
  cls: AntClass;
  x: number;
  y: number;
  dir: 1 | -1;
  hp: number;
  hpMax: number;
  carrying: number;
  carryKind: ResourceKind | null;
  state: AntState;
  timer: number;          // cronômetro do estado (colheita/ataque)
  attackCd: number;       // recarga de ataque
  targetResId: number | null;
  targetEnemyId: number | null;
  tx: number;
  ty: number;
  walkPhase: number;
  seed: number;
}

export type EnemyState = 'wander' | 'chase' | 'attack';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  dir: 1 | -1;
  hp: number;
  hpMax: number;
  dmg: number;
  speed: number;
  aggro: number;
  r: number;              // raio de colisão/ataque
  scale: number;          // tamanho de desenho
  xp: number;
  wave: boolean;          // veio de uma onda
  boss: boolean;
  state: EnemyState;
  targetAntId: number | null;
  tx: number;
  ty: number;
  attackCd: number;
  walkPhase: number;
  seed: number;
}

export interface ResourceNode {
  id: number;
  kind: ResourceKind;
  x: number;
  y: number;
  amount: number;
}

export type PropKind =
  | 'tree' | 'stoneBig' | 'stoneSmall' | 'grass' | 'flower'
  | 'mote' | 'pool' | 'mushroomProp';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  s: number;         // escala
  solid: boolean;    // obstáculo (árvore/pedra)
  r: number;         // raio de colisão quando sólido
}

export type CameraMode = 'follow' | 'free';

export type ToastKind = 'info' | 'success' | 'warn' | 'danger';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  tSec: number;
}

export interface WaveState {
  num: number;
  active: boolean;
  tSec: number;          // tempo restante da fase atual
  spawned: number;
  spawnT: number;
}

export type Resources = Record<ResourceKind, number>;
export type UpgradeLevels = Record<string, number>;

/** O que o renderizador enxerga — GameEngine implementa. */
export interface Scene {
  readonly mapId: MapId;
  readonly w: number;
  readonly h: number;
  readonly props: readonly Prop[];
  readonly resources: readonly ResourceNode[];
  readonly ants: readonly Ant[];
  readonly enemies: readonly Enemy[];
  readonly nest: { x: number; y: number; hp: number; hpMax: number };
  readonly fog: FogOfWar;
  readonly timeSec: number;
  readonly wave: WaveState;
  selectedAntId: number | null;
  gameOver: boolean;
}

/** Contrato entre motor e comportamentos (testável com mock). */
export interface AntWorld {
  readonly w: number;
  readonly h: number;
  readonly nest: { x: number; y: number };
  enemies: readonly Enemy[];
  readonly resources: readonly ResourceNode[];
  readonly fog: FogOfWar;
  readonly rng: Rng;
  readonly events: EventBus;
  /** multiplicadores derivados das melhorias compradas */
  readonly mods: AntMods;

  takeResource(kind: ResourceKind, n: number): boolean;
  deposit(units: number, kind: ResourceKind, by: AntClass): void;
  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null;
  nearestVisibleEnemy(x: number, y: number, maxDist: number): Enemy | null;
  damageEnemy(e: Enemy, dmg: number, by: AntClass): void;
  antCount(cls: AntClass): number;
}

/** Multiplicadores aplicados às formigas (loja). */
export interface AntMods {
  speedMult: number;
  dmgMult: number;
  hpMult: number;
  attackSpeedMult: number;
  critChance: number;
  critMult: number;
  armorReduction: number;
  healPerSec: number;
  carryCap: number;
  visionMult: number;
  luck: number;
  xpBoost: number;
}

export type ScreenName = 'loading' | 'menu' | 'game' | 'interior';

export interface HudState {
  screen: ScreenName;
  runActive: boolean;
  gameOver: boolean;
  mapId: MapId;
  unlockedMaps: MapId[];
  exploredPct: number;
  runSeconds: number;

  resources: Resources;
  level: number;
  xp: number;
  xpToNext: number;

  queenHunger: number;
  queenHungerMax: number;
  nestHp: number;
  nestHpMax: number;

  ants: Record<AntClass, number>;
  wave: WaveState;
  boss: { name: string; hp: number; hpMax: number } | null;

  cameraMode: CameraMode;
  selectedAntId: number | null;
  paused: boolean;

  totals: { delivered: number; enemiesKilled: number; bossesKilled: number };
  upgrades: UpgradeLevels;
  shopCosts: Record<string, { kind: ResourceKind; amount: number; maxed: boolean }>;

  hasSave: boolean;
  toasts: readonly Toast[];
}
