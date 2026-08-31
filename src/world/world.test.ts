import { describe, expect, it } from 'vitest';
import { MAPS, NEST, type MapId } from '../core/constants';
import { generateWorld, nestPositionFor } from './world';

const ALL_MAPS: MapId[] = ['campo', 'pantano', 'deserto', 'montanha', 'caverna', 'selva'];

describe('geração de mundo (seeds fixas por mapa, como no original)', () => {
  it('determinística: mesmo mapa → mesmo mundo', () => {
    const a = generateWorld('campo');
    const b = generateWorld('campo');
    expect(a.resources).toEqual(b.resources);
    expect(a.props).toEqual(b.props);
    expect(a.nestX).toBe(b.nestX);
  });

  it('Campo tem 100 folhas e mundo 3400×2400 (dados do original)', () => {
    const w = generateWorld('campo');
    expect(MAPS.campo.world.w).toBe(3400);
    expect(MAPS.campo.world.h).toBe(2400);
    expect(w.resources).toHaveLength(100);
    expect(w.resources.every((r) => r.kind === 'leaf')).toBe(true);
  });

  it('cada mapa gera o recurso próprio na quantidade certa', () => {
    for (const id of ALL_MAPS) {
      const w = generateWorld(id);
      const cfg = MAPS[id];
      expect(w.resources).toHaveLength(cfg.resourceCount);
      expect(w.resources.every((r) => r.kind === cfg.resource)).toBe(true);
    }
  });

  it('fauna ambiente respeita as contagens do mapa', () => {
    const w = generateWorld('campo');
    expect(w.ambientEnemies.length).toBe(
      MAPS.campo.enemies.reduce((s, e) => s + e.count, 0),
    );
  });

  it('ninho no centro do mundo', () => {
    const pos = nestPositionFor('campo');
    expect(pos.x).toBeCloseTo(1700, 0);
    expect(pos.y).toBeCloseTo(1248, 0);
  });

  it('recurso nenhum nasce colado no monte do ninho', () => {
    for (const mapId of ALL_MAPS) {
      const w = generateWorld(mapId);
      const nest = nestPositionFor(mapId);
      for (const r of w.resources) {
        expect(Math.hypot(r.x - nest.x, r.y - nest.y)).toBeGreaterThan(NEST.MOUND_RADIUS);
      }
    }
  });

  it('fauna ambiente nasce longe do ninho (>600px)', () => {
    for (const mapId of ALL_MAPS) {
      const w = generateWorld(mapId);
      const nest = nestPositionFor(mapId);
      for (const e of w.ambientEnemies) {
        expect(Math.hypot(e.x - nest.x, e.y - nest.y)).toBeGreaterThan(600);
      }
    }
  });
});
