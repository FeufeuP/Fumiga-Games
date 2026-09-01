/**
 * Baralho roguelike 5A (doc 03) — cartas, pesos, sinergia, slots,
 * trava anti-vazio e tradução de efeitos em modifiers.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  CARDS_5A, cardById, temGanhoDecrescente, RARIDADES, SLOTS, EIXOS,
  type Raridade,
} from './cards';
import { drawPanel, pesoRaridade, bonusSinergia, slotsUsados, type CartaPainel } from './cardPool';
import { cardModsFrom, emptyCardMods } from './modifiers';

const rngFixo = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

describe('cartas 5A: catálogo', () => {
  it('tem exatamente 20 cartas com ids únicos', () => {
    expect(CARDS_5A).toHaveLength(20);
    const ids = new Set(CARDS_5A.map((c) => c.id));
    expect(ids.size).toBe(20);
  });

  it('cobre as 5 raridades', () => {
    const presentes = new Set(CARDS_5A.map((c) => c.raridade));
    for (const r of Object.keys(RARIDADES) as Raridade[]) {
      expect(presentes.has(r)).toBe(true);
    }
  });

  it('cobre as classes: 6 Ninho, 4 Colônia, 4 Rainha, 3 Coletora, 3 Soldado', () => {
    const conta = { ninho: 0, colonia: 0, rainha: 0, coletora: 0, soldado: 0 } as Record<string, number>;
    for (const c of CARDS_5A) conta[c.classe] = (conta[c.classe] ?? 0) + 1;
    expect(conta).toEqual({ ninho: 6, colonia: 4, rainha: 4, coletora: 3, soldado: 3 });
  });

  it('todas com ganho decrescente (cada nível soma ≤ que o anterior) [O 6.10]', () => {
    for (const c of CARDS_5A) {
      expect(temGanhoDecrescente(c)).toBe(true);
    }
  });

  it('descrições curtas ≤ 60 chars e com placeholder {v} resolvido', () => {
    for (const c of CARDS_5A) {
      expect(c.descCurta.length).toBeLessThanOrEqual(60);
      // cartas com valor numérico relevante usam {v} (rainha_eterna é booleana)
      if (c.valores.length > 1 || (c.valores[0] as number) !== 1) {
        expect(c.descCurta).toContain('{v}');
      }
      expect(c.valores.length).toBeGreaterThanOrEqual(1);
      expect(c.valores.length).toBeLessThanOrEqual(3);
    }
  });

  it('categorias e eixos válidos', () => {
    for (const c of CARDS_5A) {
      expect(SLOTS[c.categoria]).toBeDefined();
      expect(EIXOS[c.eixo]).toBeDefined();
    }
  });
});

describe('pesos de raridade por nível (doc 03 §3)', () => {
  it('comum cai com o nível até o piso de 20', () => {
    expect(pesoRaridade('comum', 1)).toBeCloseTo(57.8);
    expect(pesoRaridade('comum', 100)).toBe(20);
  });

  it('raridades altas ficam mais prováveis com o nível', () => {
    for (const r of ['incomum', 'rara', 'epica', 'lendaria'] as Raridade[]) {
      expect(pesoRaridade(r, 20)).toBeGreaterThan(pesoRaridade(r, 1));
    }
  });

  it('comum continua dominando no nível 1', () => {
    expect(pesoRaridade('comum', 1)).toBeGreaterThan(pesoRaridade('incomum', 1));
    expect(pesoRaridade('incomum', 1)).toBeGreaterThan(pesoRaridade('rara', 1));
    expect(pesoRaridade('rara', 1)).toBeGreaterThan(pesoRaridade('epica', 1));
    expect(pesoRaridade('epica', 1)).toBeGreaterThan(pesoRaridade('lendaria', 1));
  });
});

describe('sinergia por eixo (doc 03 §5)', () => {
  it('+15% por carta do eixo, teto +60%', () => {
    expect(bonusSinergia({}, 'economia')).toBe(0);
    expect(bonusSinergia({ mochila: 1 }, 'economia')).toBeCloseTo(0.15);
    expect(bonusSinergia({ mochila: 3, faro_apurado: 1 }, 'economia')).toBeCloseTo(0.3);
    // 5+ cartas do mesmo eixo não passam de 60%
    const muitas: Record<string, number> = {
      mochila: 1, faro_apurado: 1, despensa: 1, passo_leve: 1, divisao_trabalho: 1,
      apetite_contido: 1, estomago_amplo: 1,
    };
    expect(bonusSinergia(muitas, 'economia')).toBeCloseTo(0.6);
  });

  it('não conta eixo errado', () => {
    expect(bonusSinergia({ paredes_grossas: 2 }, 'economia')).toBe(0);
  });
});

describe('drawPanel: sorteio do painel de level-up', () => {
  it('devolve 3 opções distintas', () => {
    const p = drawPanel({}, 1, { rng: rngFixo(7) });
    expect(p).toHaveLength(3);
    const ids = new Set(p.map((c) => c.id));
    expect(ids.size).toBe(3);
  });

  it('é determinístico com o mesmo rng', () => {
    const a = drawPanel({}, 5, { rng: rngFixo(99) });
    const b = drawPanel({}, 5, { rng: rngFixo(99) });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('carta no nível máximo não aparece mais', () => {
    const cartas = { rainha_eterna: 1 }; // lendária de 1 nível
    for (let i = 0; i < 30; i++) {
      const p = drawPanel(cartas, 3, { rng: rngFixo(i + 1) });
      expect(p.some((c) => c.id === 'rainha_eterna')).toBe(false);
    }
  });

  it('respeita o teto de slots: passivas cheias só oferecem subir nível', () => {
    // 2 passivas distintas = teto inicial de 'passiva' cheio
    const cartas: Record<string, number> = { paredes_grossas: 1, apetite_contido: 1 };
    expect(slotsUsados(cartas, 'passiva')).toBe(2);
    for (let i = 0; i < 20; i++) {
      const p = drawPanel(cartas, 2, { rng: rngFixo(i * 13 + 5) });
      for (const c of p) {
        if (c.tipo !== 'carta') continue;
        const def = cardById(c.id);
        if (!def) continue;
        if (def.categoria === 'passiva') {
          // só se já for possuída (subir nível não gasta slot)
          expect(cartas[c.id]).toBeDefined();
        }
      }
    }
  });

  it('nivelAtual e desc formatada com o valor do próximo nível', () => {
    const p = drawPanel({ mochila: 1 }, 1, { rng: rngFixo(3) });
    const mochila = p.find((c) => c.id === 'mochila');
    if (mochila && mochila.tipo === 'carta') {
      expect(mochila.nivelAtual).toBe(1);
      expect(mochila.desc).toContain('3'); // próximo nível = +3
      expect(mochila.desc).not.toContain('{v}');
    }
  });

  it('marca sinergia quando o eixo já está na build', () => {
    const p = drawPanel({ mochila: 1 }, 1, { rng: rngFixo(11) });
    const faro = p.find((c) => c.id === 'faro_apurado');
    if (faro && faro.tipo === 'carta') {
      expect(faro.sinergia).toBe(true); // mochila é do eixo economia
    }
  });

  it('trava anti-vazio: nunca devolve menos de 3 opções (fallbacks)', () => {
    // tudo no máximo + slots cheios: só cabe fallback
    const cartas: Record<string, number> = {};
    for (const c of CARDS_5A) {
      if (c.categoria === 'passiva') cartas[c.id] = 1; // 6 passivas > teto 2: cheio
      else if (c.categoria === 'especializacao') cartas[c.id] = 1; // 6 > teto 3: cheio
    }
    // força todas as possuídas ao máximo
    for (const c of CARDS_5A) cartas[c.id] = c.valores.length;
    const p = drawPanel(cartas, 50, { rng: rngFixo(1) });
    expect(p).toHaveLength(3);
    expect(p.every((c) => c.tipo === 'fallback')).toBe(true);
    const ids = new Set(p.map((c: CartaPainel) => c.id));
    expect(ids.has('fallback_cura')).toBe(true);
    expect(ids.has('fallback_comida')).toBe(true);
  });
});

describe('modifiers.ts: efeitos das cartas', () => {
  it('estado neutro sem cartas', () => {
    const m = cardModsFrom({});
    expect(m).toEqual(emptyCardMods());
  });

  it('Colônia: Passo firme, Ninhada maior, Divisão, Feromônio', () => {
    // valorPorNivel é o TOTAL no nível (doc 03 §4): passo_firme nv3 = 19
    const m = cardModsFrom({ passo_firme: 3, ninhada_maior: 3, divisao_trabalho: 2, feromonio_comando: 2 });
    expect(m.speedPct).toBe(19);
    expect(m.populationMaxBonus).toBe(4);
    expect(m.efficiencyPct).toBe(17);
    expect(m.commandRangeMult).toBeCloseTo(1.4);
  });

  it('Ninho: Paredes, Terra batida, Reparo, Despensa, Espinhos, Fortaleza', () => {
    const m = cardModsFrom({
      paredes_grossas: 3, terra_batida: 3, reparo_rapido: 3,
      despensa: 3, espinhos_raiz: 2, fortaleza_viva: 2,
    });
    expect(m.nestHpBonus).toBe(95);
    expect(m.nestArmor).toBe(4);
    expect(m.repairMult).toBeCloseTo(2.15);
    expect(m.storageMult).toBeCloseTo(1.65);
    expect(m.nestThornsPct).toBe(50);
    expect(m.nestRegenBonus).toBe(5);
  });

  it('Rainha: Apetite, Estômago, Porção, Rainha eterna', () => {
    const m = cardModsFrom({
      apetite_contido: 3, estomago_amplo: 3, porcao_reforcada: 2, rainha_eterna: 1,
    });
    expect(m.hungerDrainMult).toBeCloseTo(1 - 0.27);
    expect(m.hungerMaxMult).toBeCloseTo(1.57);
    expect(m.hungerPerItemBonus).toBe(3);
    expect(m.queenRevive).toBe(true);
  });

  it('Coletora e Soldado: bônus de classe', () => {
    const m = cardModsFrom({
      passo_leve: 3, mochila: 3, faro_apurado: 3,
      mandibulas_afiadas: 3, couraca: 3, instinto_caca: 3,
    });
    expect(m.workerSpeedPct).toBe(27);
    expect(m.workerCarryBonus).toBe(4);
    expect(m.workerDetectBonus).toBe(95);
    expect(m.soldierDmgBonus).toBe(9);
    expect(m.soldierHpBonus).toBe(35);
    expect(m.soldierAggroBonus).toBe(115);
  });

  it('efeitos são aditivos e nível extra nunca soma mais que o anterior', () => {
    const m1 = cardModsFrom({ paredes_grossas: 1 });
    const m2 = cardModsFrom({ paredes_grossas: 2 });
    const m3 = cardModsFrom({ paredes_grossas: 3 });
    const d1 = m2.nestHpBonus - m1.nestHpBonus;
    const d2 = m3.nestHpBonus - m2.nestHpBonus;
    expect(d1).toBeGreaterThan(d2);
  });
});
