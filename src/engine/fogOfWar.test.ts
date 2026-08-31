import { describe, expect, it } from 'vitest';
import { FogOfWar } from './fogOfWar';

describe('névoa de guerra', () => {
  it('revela permanentemente ao redor do ponto', () => {
    const fog = new FogOfWar(960, 720);
    fog.reveal(480, 360, 90);
    expect(fog.isRevealed(480, 360)).toBe(true);
    expect(fog.isRevealed(480 + 80, 360)).toBe(true);
    expect(fog.isRevealed(480 + 200, 360)).toBe(false);
  });

  it('fora do mundo nunca está revelado', () => {
    const fog = new FogOfWar(960, 720);
    fog.reveal(0, 0, 300);
    expect(fog.isRevealed(-50, -50)).toBe(false);
    expect(fog.isRevealed(10000, 10000)).toBe(false);
  });

  it('camada ativa segue as fontes e pode ser recalculada', () => {
    const fog = new FogOfWar(960, 720);
    fog.reveal(100, 100, 200);
    fog.reveal(800, 600, 200);
    fog.recomputeActive([{ x: 100, y: 100, r: 100 }]);
    expect(fog.isActive(100, 100)).toBe(true);
    expect(fog.isActive(800, 600)).toBe(false); // revelado, mas inativo
    expect(fog.isRevealed(800, 600)).toBe(true);
  });

  it('RLE faz ida e volta sem perder informação', () => {
    const fog = new FogOfWar(960, 720);
    fog.reveal(200, 200, 120);
    fog.reveal(700, 500, 80);
    const rle = fog.serializeRLE();
    const restored = FogOfWar.fromRLE(960, 720, rle);
    expect(restored.cols).toBe(fog.cols);
    expect(restored.rows).toBe(fog.rows);
    expect(restored.isRevealed(200, 200)).toBe(true);
    expect(restored.isRevealed(700, 500)).toBe(true);
    expect(restored.isRevealed(600, 300)).toBe(false);
    expect(restored.revealedFraction()).toBeCloseTo(fog.revealedFraction(), 5);
  });

  it('RLE comprime: poucos pares para poucas áreas', () => {
    const fog = new FogOfWar(960, 720);
    const rle = fog.serializeRLE();
    expect(rle).toEqual([0, fog.cols * fog.rows]);
  });
});
