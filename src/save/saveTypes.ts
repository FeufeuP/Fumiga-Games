/**
 * Tipos do save — versionado desde o primeiro dia (regra #6).
 * v1: run do Campo com Fase 2 (economia + fome + produção).
 * Campos de fase futura entram como opcionais, nunca removidos.
 */
import type { SAVE } from '../core/constants';

export interface SavedAnt {
  id: number;
  cls: string;
  x: number;
  y: number;
  dir: 1 | -1;
  hp: number;
  carrying: number;
  carryKind: string | null;
  state: string;
  timer: number;
  targetResId: number | null;
  tx: number;
  ty: number;
  walkPhase: number;
  seed: number;
  internal: boolean;
}

export interface SavedResource {
  id: number;
  kind: string;
  x: number;
  y: number;
  amount: number;
}

export interface RunSaveV1 {
  version: typeof SAVE.VERSION;
  savedAt: number;
  mapId: string;
  seed: number;
  runSeconds: number;
  food: number;
  chitin: number;
  delivered: number;
  producedTotal: number;
  queen: { hp: number; hunger: number; lastBand: string };
  queue: ReadonlyArray<{ cls: string; remainingMs: number; totalMs: number }>;
  nest: { hp: number };
  ants: SavedAnt[];
  resources: SavedResource[];
  fogRLE: number[];
  camera: { cx: number; cy: number; mode: string };
  selectedAntId: number | null;
  gameOver: boolean;
}

export interface SaveEnvelope {
  v: number;
  checksum: string;
  data: RunSaveV1;
}
