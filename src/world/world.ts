/**
 * Geração de mundo — fiel ao original: seed fixa por mapa (1234, 9876, 3333,
 * 4444, 5555, 6666), contagens de cenário do bundle (árvores, pedras, gramas,
 * flores, moitas, poças). SEM fauna ambiente e SEM recursos espalhados:
 * no original os inimigos vêm só das ondas e os recursos iniciais nascem
 * na área revelada ao redor do ninho (spawnResource × exploredFactor).
 */
import { MAPS, NEST, WORLD, type MapId } from '../core/constants';
import { Rng } from '../core/rng';
import type { Prop } from '../core/types';

export interface WorldData {
  mapId: MapId;
  w: number;
  h: number;
  nestX: number;
  nestY: number;
  props: Prop[];
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

  return { mapId, w, h, nestX: nest.x, nestY: nest.y, props };
}
