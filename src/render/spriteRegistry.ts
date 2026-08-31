/**
 * spriteRegistry — o ÚNICO lugar que conhece arte (regra de engenharia #1).
 * Contrato da Parte 12.5: id, dimensões, âncora, hitbox, frames, escala.
 * Hoje cada sprite é um drawer procedural (Parte 12.4 — formas geométricas);
 * quando a arte oficial chegar, troca-se `path` e o loader, nunca a lógica.
 */
import type { Rect } from './placeholderShapes';

export interface SpriteContract {
  id: string;
  path: string | null; // null = placeholder procedural
  width: number;
  height: number;
  anchorX: number; // 0..1
  anchorY: number; // 0..1
  hitbox: Rect;
  frames: number;
  frameDuration: number; // ms
  scale: number;
  role: string;
}

export interface DrawOpts {
  x: number;
  y: number;
  dir?: 1 | -1;
  walkPhase?: number;
  carrying?: boolean;
  highlight?: boolean;
}

export type SpriteDrawer = (ctx: CanvasRenderingContext2D, opts: DrawOpts) => void;

export interface Sprite {
  contract: SpriteContract;
  draw: SpriteDrawer;
}

const registry = new Map<string, Sprite>();

export function registerSprite(contract: SpriteContract, draw: SpriteDrawer): void {
  registry.set(contract.id, { contract, draw });
}

export function getSprite(id: string): Sprite {
  const s = registry.get(id);
  if (!s) throw new Error(`Sprite não registrado: ${id}`);
  return s;
}

export function hasSprite(id: string): boolean {
  return registry.has(id);
}

/** Hitbox padrão: 70% do sprite centrado (docs/06 risco 6). */
export function defaultHitbox(w: number, h: number): Rect {
  return { x: w * 0.15, y: h * 0.15, width: w * 0.7, height: h * 0.7 };
}

export function contractOf(
  id: string,
  width: number,
  height: number,
  role: string,
  opts: Partial<SpriteContract> = {},
): SpriteContract {
  return {
    id,
    path: null,
    width,
    height,
    anchorX: 0.5,
    anchorY: 0.5,
    hitbox: defaultHitbox(width, height),
    frames: 1,
    frameDuration: 120,
    scale: 1,
    role,
    ...opts,
  };
}
