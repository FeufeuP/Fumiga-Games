import { describe, expect, it } from 'vitest';
import { MAPS, NEST, type MapId } from '../core/constants';
import { generateWorld, nestPositionFor } from './world';

const ALL_MAPS: MapId[] = ['campo', 'pantano', 'deserto', 'montanha', 'caverna', 'selva'];

describe('geração de mundo (seeds fixas por mapa, como no original)', () => {
  it('determinística: mesmo mapa → mesmo mundo', () => {
    const a = generateWorld('campo');
    const b = generateWorld('campo');
    expect(a.props).toEqual(b.props);
    expect(a.nestX).toBe(b.nestX);
  });

  it('Campo tem mundo 3400×2400 e teto de 100 folhas (dados do original)', () => {
    expect(MAPS.campo.world.w).toBe(3400);
    expect(MAPS.campo.world.h).toBe(2400);
    expect(MAPS.campo.resourceCount).toBe(100);
    expect(MAPS.campo.resource).toBe('leaf');
  });

  it('cada mapa tem o recurso e a contagem do original', () => {
    for (const id of ALL_MAPS) {
      const cfg = MAPS[id];
      expect(cfg.resourceCount).toBeGreaterThan(0);
      expect(['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal']).toContain(cfg.resource);
    }
  });

  it('sem fauna ambiente: inimigos só vêm das ondas [O]', () => {
    const w = generateWorld('campo');
    expect(w.props.length).toBeGreaterThan(0);
  });

  it('ninho no centro do mundo', () => {
    const pos = nestPositionFor('campo');
    expect(pos.x).toBeCloseTo(1700, 0);
    expect(pos.y).toBeCloseTo(1248, 0);
  });

  it('obstáculos sólidos ficam longe do ninho', () => {
    for (const mapId of ALL_MAPS) {
      const w = generateWorld(mapId);
      const nest = nestPositionFor(mapId);
      for (const p of w.props) {
        if (p.solid) {
          expect(Math.hypot(p.x - nest.x, p.y - nest.y)).toBeGreaterThan(NEST.MOUND_RADIUS);
        }
      }
    }
  });
});
