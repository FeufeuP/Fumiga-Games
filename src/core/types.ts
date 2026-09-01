/**
 * Tipos globais — modelo fiel ao original: 3 classes de formiga,
 * economia por tipo de recurso, inimigos/ondas/chefes, loja de melhorias.
 */
import type { AntClass, EnemyKind, MapId, ResourceKind, UpgradeDef } from './constants';
import type { Rng } from './rng';
import type { EventBus } from './events';
import type { FogOfWar } from '../engine/fogOfWar';
import type { CardMods } from '../roguelike/modifiers';
import type { CartaPainel } from '../roguelike/cardPool';

export type { AntClass, EnemyKind, MapId, ResourceKind, UpgradeDef };

export interface Vec2 { x: number; y: number }

/** ── efeitos visíveis no mundo (melhorias percebíveis) ───────────── */
/** texto flutuante: dano, XP, recursos, cura */
export interface WorldText {
  x: number; y: number;
  text: string;
  color: string;      // rgb "r,g,b"
  t: number;          // tempo restante (s)
  tMax: number;
}
/** poeira atrás de formigas rápidas (trilha ∝ velocidade) */
export interface Dust {
  x: number; y: number;
  t: number; tMax: number;
}
/** onda de buff: anel que sai do ninho ao comprar/evoluir */
export interface BuffWave {
  x: number; y: number;
  r: number; maxR: number;
  color: string;      // rgb "r,g,b"
  t: number; tMax: number;
}

export type AntState =
  | 'idle' | 'gotoResource' | 'harvest' | 'returnNest'
  | 'explore' | 'patrol' | 'seekEnemy' | 'attack' | 'returnHome'
  | 'command' | 'flee';

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
  z: number;              // altura (0 = no chão) — voa com o smash do chefe
  vx: number;             // impulso horizontal do knockback
  vy: number;
  vz: number;
  // ── IA fiel [O]: direção/medo/comando ──────────────────────────
  angle: number;          // rumo atual (rad)
  wanderAngle: number;    // vagueio: ângulo alvo
  wanderT: number;        // vagueio: tempo até próxima decisão
  fearT: number;          // fugindo (0.9s após dano, não-soldados)
  fearAx: number;         // direção da fuga
  fearAy: number;
  stunT: number;          // atordoado ao aterrissar do smash (0.9s)
  scoutA: number;         // exploradora: ângulo no anel de fronteira
  scoutR: number;         // exploradora: multiplicador do raio de fronteira
  scoutTx: number;        // exploradora: alvo atual
  scoutTy: number;
  scoutDecideT: number;   // exploradora: tempo até repensar alvo
  /** brilho temporário (onda de buff) — undefined = sem brilho */
  glowT?: number;
  glowColor?: string;     // rgb "r,g,b"
  /** [P 5B] guarda temporário (Muralha de defensores): sai ao zerar */
  tempT?: number;
  /** [P 5B] Colônia unida: tem aliado a ≤80px (recalculado) */
  nearAlly?: boolean;
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
  angle: number;          // rumo atual (rad) [O]
  patrolT: number;        // vagueio ambiente [O]
  /** [P 5B] preso em armadilha de resina — não anda nem ataca */
  rootT?: number;
}

export interface ResourceNode {
  id: number;
  kind: ResourceKind;
  x: number;
  y: number;
  amount: number;
  phase: number;          // [O] flutuação senoidal no desenho
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
  /** efeitos do ciclo A [O] */
  readonly smashFx: ReadonlyArray<{ x: number; y: number; t: number }>;
  readonly shake: number;
  /** marcas de toque: comandos CHAMAR EXPLORADORAS/SOLDADOS [O] */
  readonly tapMarks: ReadonlyArray<{ x: number; y: number; t: number; color: string }>;
  /** efeitos visíveis: textos flutuantes, poeira e ondas de buff */
  readonly worldTexts: ReadonlyArray<WorldText>;
  readonly dust: ReadonlyArray<Dust>;
  readonly buffWaves: ReadonlyArray<BuffWave>;
  /** [P 5B] baús de exploração e armadilhas de resina */
  readonly chests: ReadonlyArray<{ id: number; x: number; y: number }>;
  readonly traps: ReadonlyArray<{ x: number; y: number; cd: number }>;
  /** zona de feromônio ativa? (raio 190 do ninho) */
  readonly pheromoneZone: boolean;
}

/** Contrato entre motor e comportamentos (testável com mock). */
export interface AntWorld {
  readonly w: number;
  readonly h: number;
  readonly nest: { x: number; y: number; hp?: number; hpMax?: number };
  readonly ants: readonly Ant[];
  readonly props: readonly Prop[];
  enemies: readonly Enemy[];
  readonly resources: readonly ResourceNode[];
  readonly fog: FogOfWar;
  readonly rng: Rng;
  readonly events: EventBus;
  /** raio do anel de fronteira explorado [O computeFrontier] */
  readonly frontierR: number;
  /** multiplicadores derivados das melhorias compradas */
  readonly mods: AntMods;
  /** modificadores das cartas roguelike (5A — modifiers.ts) */
  readonly cardMods: CardMods;
  /** buffs momentâneos do rally [O] */
  readonly buffs: { collectSpeedMult: number; attackCdMult: number };

  takeResource(kind: ResourceKind, n: number): boolean;
  deposit(units: number, kind: ResourceKind, by: AntClass): void;
  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null;
  /** [O nearestEnemyBody] inimigo revelado mais próximo (distância ao corpo) */
  nearestVisibleEnemy(x: number, y: number, maxDist: number): Enemy | null;
  /** [O enemyExtent] extensão (raio de corpo) do inimigo */
  enemyExtent(e: Enemy): number;
  /** [O pickup] remove o nó de recurso do mapa */
  removeResource(id: number): void;
  damageEnemy(e: Enemy, dmg: number, by: AntClass, crit?: boolean): void;
  antCount(cls: AntClass): number;
  /** efeitos sonoros (motor de áudio) */
  playSfx(name: string): void;
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
  shopCosts: Record<string, { kind: ResourceKind; amount: number; maxed: boolean; multi?: Array<{ kind: ResourceKind; amount: number }> }>;

  hasSave: boolean;
  toasts: readonly Toast[];

  /** rally ATACAR!/COLETA! [O] */
  rally: { attackCd: number; collectCd: number; attackBuff: number; collectBuff: number };
  /** barra do chefe só com aggro recente [O bossAggroT] */
  bossAggro: boolean;
  /** meta progresso */
  missions: { done: number; total: number; progress: Array<{ id: string; title: string; desc: string; value: number; goal: number; rewardXp: number; done: boolean }> };
  achievements: { done: number; total: number; progress: Array<{ id: string; title: string; desc: string; value: number; goal: number; done: boolean }> };
  rebirths: number;
  score: number;
  /** painel de level-up/baú do baralho roguelike — aberto congela o mundo */
  cardPanel: { level: number; origem?: string; choices: CartaPainel[] } | null;
  /** quitina (moeda das classes futuras) */
  chitin: number;
  /** cartas da build (aba CARTAS do pause) */
  cards: Array<{ id: string; nome: string; icone: string; raridade: string; nivel: number; nivelMax: number; categoria: string; eixo: string }>;
  /** uso de slots por categoria */
  slots: Record<string, { usados: number; teto: number }>;
  /** substituição pendente (slot cheio) */
  replaceDialog: { novaId: string; opcoes: Array<{ id: string; nome: string; icone: string; nivel: number; nivelMax: number }> } | null;
}
