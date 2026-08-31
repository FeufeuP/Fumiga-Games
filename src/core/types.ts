/**
 * Tipos globais compartilhados. Nenhum sistema define struct próprio fora daqui
 * sem necessidade real — contratos estáveis facilitam a troca de camadas.
 */
import type { MapId } from './constants';
import type { Rng } from './rng';
import type { EventBus } from './events';
import type { FogOfWar } from '../engine/fogOfWar';

// ── Entidades ──────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export type AntClass =
  | 'worker' | 'collector' | 'scout' | 'soldier'
  | 'defender' | 'toxic' | 'giant';

export type ResourceKind = 'leaf' | 'mushroom' | 'cactus' | 'banana' | 'flower' | 'crystal';

export type AntState =
  | 'idle'
  | 'gotoResource' | 'harvest' | 'returnNest'
  | 'explore' | 'patrol';

export interface Ant {
  id: number;
  cls: AntClass;
  x: number;
  y: number;
  dir: 1 | -1;
  hp: number;
  hpMax: number;
  /** unidades de recurso carregando (coletora) */
  carrying: number;
  carryKind: ResourceKind | null;
  state: AntState;
  /** cronômetro do estado atual (colheita, pausa...) */
  timer: number;
  targetResId: number | null;
  /** alvo de movimento em coordenadas de mundo */
  tx: number;
  ty: number;
  /** fase de caminhada acumulada (animação) */
  walkPhase: number;
  /** fase aleatória fixa (wobble/offset orgânico) */
  seed: number;
  /** operárias vivem dentro do ninho — não desenham nem colidem fora */
  internal: boolean;
}

export interface ResourceNode {
  id: number;
  kind: ResourceKind;
  x: number;
  y: number;
  /** unidades restantes */
  amount: number;
}

export type PropKind = 'tree' | 'bush' | 'stone' | 'rock' | 'twig' | 'leafpile' | 'clover';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  /** multiplicador de tamanho [0.8, 1.3] */
  s: number;
}

export type ProductionStage = 'egg' | 'larva' | 'pupa';

export interface ProductionItem {
  cls: AntClass;
  /** ms restantes do item */
  remainingMs: number;
  totalMs: number;
}

export type HungerBand = 'sated' | 'normal' | 'hungry' | 'critical' | 'starving';

export interface QueenState {
  hp: number;
  hpMax: number;
  hunger: number;
  hungerMax: number;
  /** última faixa avisada — evita spam de toast */
  lastBand: HungerBand;
  queue: ProductionItem[];
}

export interface NestState {
  hp: number;
  hpMax: number;
  /** ponto de depósito/entrada em coordenadas de mundo */
  x: number;
  y: number;
}

// ── Câmera / cena ──────────────────────────────────────────────────

export type CameraMode = 'follow' | 'free';

/** O que o renderizador enxerga — GameEngine implementa. */
export interface Scene {
  readonly mapId: MapId;
  readonly w: number;
  readonly h: number;
  readonly props: readonly Prop[];
  readonly resources: readonly ResourceNode[];
  readonly ants: readonly Ant[];
  readonly nest: NestState;
  readonly fog: FogOfWar;
  readonly timeSec: number;
  selectedAntId: number | null;
  gameOver: boolean;
}

// ── Mundo visto pelos comportamentos ───────────────────────────────

/**
 * Contrato entre motor e comportamentos de formiga. Os comportamentos
 * não importam o GameEngine — testam contra um mock disto.
 */
export interface AntWorld {
  readonly w: number;
  readonly h: number;
  readonly nest: NestState;
  readonly queen: QueenState;
  readonly resources: readonly ResourceNode[];
  readonly fog: FogOfWar;
  readonly rng: Rng;
  readonly events: EventBus;

  food(): number;
  /** deposita unidades de recurso → comida (com teto do estoque) */
  depositFood(units: number, kind: ResourceKind, by: AntClass): void;
  takeFood(units: number): boolean;
  /** operária alimenta a Rainha: 1 comida = QUEEN.FOOD_TO_HUNGER pontos */
  feedQueen(foodUnits: number): void;
  repairNest(hp: number): void;
  /** recurso revelado mais próximo dentro de maxDist */
  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null;
  popTotal(): number;
  queueLength(): number;
}

// ── Interface (React) ──────────────────────────────────────────────

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'warn' | 'danger';
  tSec: number;
}

export type ScreenName = 'menu' | 'game' | 'interior';

/** Snapshot raso que o motor publica na store — a HUD inteira deriva disto. */
export interface HudState {
  screen: ScreenName;
  runActive: boolean;
  gameOver: boolean;
  mapId: MapId;
  runSeconds: number;

  food: number;
  foodCap: number;
  chitin: number;
  hunger: number;
  hungerMax: number;
  hungerBand: HungerBand;
  queenHp: number;
  queenHpMax: number;
  nestHp: number;
  nestHpMax: number;

  popByClass: Record<AntClass, number>;
  popTotal: number;
  popCap: number;
  queue: ReadonlyArray<{ cls: AntClass; stage: ProductionStage | 'none'; pct: number }>;

  cameraMode: CameraMode;
  selectedAntId: number | null;
  paused: boolean;

  delivered: number;
  producedTotal: number;
  resourcesLeft: number;

  hasSave: boolean;
  toasts: readonly Toast[];
}
