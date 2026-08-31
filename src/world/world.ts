/**
 * Geração do mundo por mapa — procedural com seed fixa (docs/05: o original
 * usa seed fixa por mapa → mundos idênticos entre runs, explorável de cabeça).
 * Gramado: árvores, arbustos, pedras, rochas, gravetos, folhas caídas e trevos.
 * O ninho é o monte de terra no meio — clicável.
 */
import { MAPS, NEST, WORLD, type MapId } from '../core/constants';
import { Rng } from '../core/rng';
import type { Prop, PropKind, ResourceKind, ResourceNode } from '../core/types';

export interface WorldData {
  mapId: MapId;
  w: number;
  h: number;
  nestX: number;
  nestY: number;
  resources: ResourceNode[];
  props: Prop[];
}

/** Posição do ninho para um mapa (WORLD.NEST_SPAWN normalizado). */
export function nestPositionFor(mapId: MapId): { x: number; y: number } {
  const m = MAPS[mapId];
  return { x: m.world.w * WORLD.NEST_SPAWN.x, y: m.world.h * WORLD.NEST_SPAWN.y };
}

const PROP_KINDS: ReadonlyArray<[PropKind, number]> = [
  ['clover', 45],
  ['leafpile', 12],
  ['twig', 10],
  ['stone', 8],
  ['bush', 15],
  ['tree', 8],
  ['rock', 2],
];

function pickPropKind(rng: Rng): PropKind {
  const total = PROP_KINDS.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const [kind, w] of PROP_KINDS) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return 'clover';
}

export function generateWorld(mapId: MapId, seed: number): WorldData {
  const m = MAPS[mapId];
  const { w, h } = m.world;
  const rng = new Rng(seed);
  const nest = nestPositionFor(mapId);

  // ── Recursos: grupos irregulares (Parte 3.2) ─────────────────────
  const resources: ResourceNode[] = [];
  const kind = m.resource as ResourceKind;
  let resId = 1;
  let guard = 0;
  while (resources.length < m.resourceCount && guard < m.resourceCount * 30) {
    guard++;
    const clusterSize = rng.int(2, 6);
    const cx = rng.float(90, w - 90);
    const cy = rng.float(90, h - 90);
    // não nasce em cima do monte nem colada nele
    if (Math.hypot(cx - nest.x, cy - nest.y) < NEST.MOUND_RADIUS + 140) continue;
    const spread = rng.float(40, 95);
    for (let i = 0; i < clusterSize && resources.length < m.resourceCount; i++) {
      const ang = rng.next() * Math.PI * 2;
      const dist = rng.next() * spread;
      const x = Math.min(w - 30, Math.max(30, cx + Math.cos(ang) * dist));
      const y = Math.min(h - 30, Math.max(30, cy + Math.sin(ang) * dist));
      if (Math.hypot(x - nest.x, y - nest.y) < NEST.MOUND_RADIUS + 60) continue;
      resources.push({ id: resId++, kind, x, y, amount: 1 });
    }
  }

  // ── Props decorativos: densidade ~0,45/1000px² (referência: 3.624 no Campo) ──
  const props: Prop[] = [];
  const targetProps = Math.round((w * h) / 2200);
  const clearRadius = NEST.MOUND_RADIUS + 80;
  let propGuard = 0;
  while (props.length < targetProps && propGuard < targetProps * 4) {
    propGuard++;
    const x = rng.float(20, w - 20);
    const y = rng.float(20, h - 20);
    if (Math.hypot(x - nest.x, y - nest.y) < clearRadius) continue;
    props.push({ kind: pickPropKind(rng), x, y, s: rng.float(0.8, 1.3) });
  }
  // ordem de pintura: o de cima (menor y) primeiro
  props.sort((a, b) => a.y - b.y);

  return { mapId, w, h, nestX: nest.x, nestY: nest.y, resources, props };
}
