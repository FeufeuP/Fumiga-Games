import { describe, expect, it } from 'vitest';
import { Clock } from '../core/clock';
import { cardModsFrom } from '../roguelike/modifiers';

describe('Phase 5C: Classes, Velocidade e HUD', () => {
  it('Clock suporta multiplicadores de velocidade (1x, 2x, 3x, 5x)', () => {
    const clock = new Clock();
    clock.reset(0);
    expect(clock.speed).toBe(1);

    clock.setSpeed(2);
    expect(clock.speed).toBe(2);

    let steps = 0;
    clock.frame(1000 / 60 * 1000, () => { steps++; });
    expect(steps).toBeGreaterThan(0);

    clock.setSpeed(5);
    expect(clock.speed).toBe(5);
  });

  it('17 cartas de classe são traduzidas corretamente no modifiers.ts', () => {
    const cards = {
      // Defensora (5)
      anel_ampliado: 2,
      escudo_reforcado: 1,
      interceptacao: 1,
      postura_firme: 1,
      recuperacao: 1,
      // Tóxica (6)
      acido_concentrado: 1,
      jato_longo: 2,
      cadencia_rapida: 1,
      corrosao_prolongada: 1,
      propagacao: 1,
      acido_critico: 1,
      // Gigante (6)
      massa: 1,
      impacto: 1,
      empurrao: 1,
      inabalavel: 1,
      onda_choque: 1,
      passo_pesado: 1,
    };

    const mods = cardModsFrom(cards);

    // Defensora
    expect(mods.defenderRingRadiusBonus).toBe(52);
    expect(mods.defenderArmor).toBe(5);
    expect(mods.defenderMaxTargets).toBe(2);
    expect(mods.defenderStandDmgPct).toBe(25);
    expect(mods.defenderRegen).toBe(3);

    // Tóxica
    expect(mods.toxicAcidDmg).toBe(5);
    expect(mods.toxicRangeBonus).toBe(52);
    expect(mods.toxicRatePct).toBe(20);
    expect(mods.toxicCorrosionSecBonus).toBe(2);
    expect(mods.toxicSpreadTargets).toBe(1);
    expect(mods.toxicCritChance).toBe(0.15);

    // Gigante
    expect(mods.giantHpBonus).toBe(50);
    expect(mods.giantDmgBonus).toBe(6);
    expect(mods.giantKnockbackPx).toBe(20);
    expect(mods.giantImmune).toBe(true);
    expect(mods.giantAoePx).toBe(60);
    expect(mods.giantSpeedPct).toBe(25);
  });
});
