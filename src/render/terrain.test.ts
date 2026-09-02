/**
 * Terreno procedural — garante as propriedades que sustentam o chão:
 * determinismo, manchas coesas (sem xadrez) e distribuição sã por bioma.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, kindAt, variantAt, type TerrainKind, type TerrainParams } from './terrain';

const CAMPO: TerrainParams = { scale: 0.055, dirtAt: 0.62, sandAt: 0.79, blend: 0.085, detail: 0.30 };

function survey(seed: number, p: TerrainParams, n = 60): Record<TerrainKind, number> {
  const out: Record<TerrainKind, number> = { grass: 0, detail: 0, dirt: 0, sand: 0 };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) out[kindAt(x, y, seed, p)]++;
  }
  return out;
}

describe('terreno procedural', () => {
  it('é determinístico: mesma célula + mesma semente = mesmo tile', () => {
    for (let i = 0; i < 200; i++) {
      const x = (i * 37) % 91;
      const y = (i * 17) % 73;
      expect(kindAt(x, y, 1234, CAMPO)).toBe(kindAt(x, y, 1234, CAMPO));
      expect(variantAt(x, y, 1234, 12)).toBe(variantAt(x, y, 1234, 12));
    }
  });

  it('sementes diferentes geram mapas diferentes', () => {
    let diff = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        if (kindAt(x, y, 1234, CAMPO) !== kindAt(x, y, 4242, CAMPO)) diff++;
      }
    }
    expect(diff).toBeGreaterThan(100);
  });

  it('o campo é majoritariamente verde, com clareiras de terra', () => {
    const s = survey(1234, CAMPO);
    const total = 60 * 60;
    const green = (s.grass + s.detail) / total;
    expect(green).toBeGreaterThan(0.7);
    expect(green).toBeLessThan(0.98);
    // as clareiras existem, mas não tomam a tela
    expect(s.dirt / total).toBeGreaterThan(0.01);
    expect(s.dirt / total).toBeLessThan(0.30);
  });

  it('as manchas são coesas — quase nenhum tile de terra fica isolado', () => {
    // Este é o teste que pegou o bug do dithering: com Bayer no limiar, 26%
    // dos tiles de terra ficavam com <=1 vizinho e o chão virava xadrez.
    let dirt = 0;
    let lonely = 0;
    for (let y = 1; y < 60; y++) {
      for (let x = 1; x < 60; x++) {
        if (kindAt(x, y, 777, CAMPO) !== 'dirt') continue;
        dirt++;
        let n = 0;
        if (kindAt(x + 1, y, 777, CAMPO) === 'dirt') n++;
        if (kindAt(x - 1, y, 777, CAMPO) === 'dirt') n++;
        if (kindAt(x, y + 1, 777, CAMPO) === 'dirt') n++;
        if (kindAt(x, y - 1, 777, CAMPO) === 'dirt') n++;
        if (n <= 1) lonely++;
      }
    }
    expect(dirt).toBeGreaterThan(20);
    expect(lonely / dirt).toBeLessThan(0.10);
  });

  it('variantAt fica no intervalo e usa todas as variações', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const v = variantAt(x, y, 99, 8);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(8);
        seen.add(v);
      }
    }
    expect(seen.size).toBe(8);
  });

  it('variantAt com um tile só nunca sai de zero', () => {
    expect(variantAt(5, 9, 1, 1)).toBe(0);
    expect(variantAt(5, 9, 1, 0)).toBe(0);
  });

  it('o ruído não colapsa: uma vizinhança traz tipos variados', () => {
    // Regressão do hash que estourava a precisão de float e devolvia sempre
    // o mesmo valor (o mapa inteiro saía de um tipo só).
    const kinds = new Set<TerrainKind>();
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) kinds.add(kindAt(x, y, 1234, CAMPO));
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('DEFAULT_PARAMS produz um mapa utilizável', () => {
    const s = survey(2026, DEFAULT_PARAMS);
    expect(s.grass + s.detail).toBeGreaterThan(0);
    expect(s.grass + s.detail + s.dirt + s.sand).toBe(60 * 60);
  });
});
