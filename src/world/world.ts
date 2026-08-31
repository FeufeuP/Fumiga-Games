/**
 * Geração de mundo — fiel ao original: seed fixa por mapa (1234, 9876, 3333,
 * 4444, 5555, 6666), contagens de cenário do bundle (árvores, pedras, gramas,
 * flores, moitas, poças), fauna ambiente e recursos em grupos irregulares.
 */
import { MAPS, NEST, WORLD, type MapId } from '../core/constants';
import { Rng } from '../core/rng';
import { createEnemy } from '../entities/enemies';
import type { Enemy, Prop, ResourceNode } from '../core/types';

export interface WorldData {
  mapId: MapId;
  w: number;
  h: number;
  nestX: number;
  nestY: number;
  resources: ResourceNode[];
  props: Prop[];
  ambientEnemies: Enemy[];
}

export function nestPositionFor(mapId: MapId): { x: number; y: number } {
  const m = MAPS[mapId];
  return { x: m.world.w * WORLD.NEST_SPAWN.x, y: m.world.h * WORLD.NEST_SPAWN.y };
}

export function generateWorld(mapId: MapId): WorldData {
  const m = MAPS[mapId];
  const { w, h } = m.world;
  const rng = new Rng(m.seed); // [O] seed fixa por mapa
  const nest = nestPositionFor(mapId);
  const clear = NEST.MOUND_RADIUS + 80;

  // ── Recursos em grupos irregulares ──────────────────────────────
  const resources: ResourceNode[] = [];
  let resId = 1;
  let guard = 0;
  while (resources.length < m.resourceCount && guard < m.resourceCount * 30) {
    guard++;
    const clusterSize = rng.int(2, 6);
    const cx = rng.float(90, w - 90);
    const cy = rng.float(90, h - 90);
    if (Math.hypot(cx - nest.x, cy - nest.y) < clear + 120) continue;
    const spread = rng.float(40, 95);
    for (let i = 0; i < clusterSize && resources.length < m.resourceCount; i++) {
      const ang = rng.next() * Math.PI * 2;
      const dist = rng.next() * spread;
      const x = Math.min(w - 30, Math.max(30, cx + Math.cos(ang) * dist));
      const y = Math.min(h - 30, Math.max(30, cy + Math.sin(ang) * dist));
      if (Math.hypot(x - nest.x, y - nest.y) < clear + 40) continue;
      resources.push({ id: resId++, kind: m.resource, x, y, amount: 1, phase: rng.next() * Math.PI * 2 });
    }
  }

  // ── Cenário com as contagens do original ────────────────────────
  const props: Prop[] = [];
  const place = (kind: Prop['kind'], n: number, solid: boolean, r: number) => {
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ok = false;
      for (let t = 0; t < 20 && !ok; t++) {
        x = rng.float(30, w - 30);
        y = rng.float(30, h - 30);
        ok = Math.hypot(x - nest.x, y - nest.y) > clear;
      }
      if (ok) props.push({ kind, x, y, s: rng.float(0.9, 1.3), solid, r });
    }
  };
  place('tree', m.scenery.trees, true, 26);
  place('stoneBig', Math.round(m.scenery.stones * 0.35), true, 22);
  place('stoneSmall', m.scenery.stones - Math.round(m.scenery.stones * 0.35), false, 0);
  place('grass', m.scenery.grass, false, 0);
  place('flower', m.scenery.flowers, false, 0);
  place('mote', m.scenery.motes, false, 0);
  place('pool', m.scenery.pools, false, 0);
  props.sort((a, b) => a.y - b.y);

  // ── Fauna ambiente (contagens por mapa do original) ─────────────
  const ambientEnemies: Enemy[] = [];
  for (const spec of m.enemies) {
    for (let i = 0; i < spec.count; i++) {
      let x = 0, y = 0, ok = false;
      for (let t = 0; t < 30 && !ok; t++) {
        x = rng.float(60, w - 60);
        y = rng.float(60, h - 60);
        ok = Math.hypot(x - nest.x, y - nest.y) > 600; // não nasce em cima do ninho
      }
      if (ok) ambientEnemies.push(createEnemy(spec.kind, x, y, 1, () => rng.next()));
    }
  }

  return { mapId, w, h, nestX: nest.x, nestY: nest.y, resources, props, ambientEnemies };
}
