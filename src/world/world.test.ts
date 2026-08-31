import { describe, expect, it } from 'vitest';
import { MAPS, NEST } from '../core/constants';
import { generateWorld, nestPositionFor } from './world';

describe('geração de mundo', () => {
  it('determinística: mesma seed → mesmo mundo', () => {
    const a = generateWorld('campo', 123);
    const b = generateWorld('campo', 123);
    expect(a.resources).toEqual(b.resources);
    expect(a.props).toEqual(b.props);
    expect(a.nestX).toBe(b.nestX);
  });

  it('Campo tem 100 folhas e mundo 3400×2400 (dados do original)', () => {
    const w = generateWorld('campo', 1);
    expect(MAPS.campo.world.w).toBe(3400);
    expect(MAPS.campo.world.h).toBe(2400);
    expect(w.resources).toHaveLength(100);
    expect(w.resources.every((r) => r.kind === 'leaf')).toBe(true);
  });

  it('ninho no centro do mundo (D2: 0.50, 0.52)', () => {
    const pos = nestPositionFor('campo');
    expect(pos.x).toBeCloseTo(1700, 0);
    expect(pos.y).toBeCloseTo(1248, 0);
  });

  it('recurso nenhum nasce colado no monte do ninho', () => {
    for (const mapId of ['campo', 'pantano', 'selva'] as const) {
      const w = generateWorld(mapId, 99);
      const nest = nestPositionFor(mapId);
      for (const r of w.resources) {
        expect(Math.hypot(r.x - nest.x, r.y - nest.y)).toBeGreaterThan(NEST.MOUND_RADIUS);
      }
    }
  });

  it('props também respeitam a clareira do ninho', () => {
    const w = generateWorld('campo', 5);
    const nest = nestPositionFor('campo');
    for (const p of w.props) {
      expect(Math.hypot(p.x - nest.x, p.y - nest.y)).toBeGreaterThan(NEST.MOUND_RADIUS + 60);
    }
  });

  it('densidade de props na ordem de grandeza certa (~3,6k no Campo)', () => {
    const w = generateWorld('campo', 1);
    expect(w.props.length).toBeGreaterThan(2500);
    expect(w.props.length).toBeLessThan(5000);
  });
});
