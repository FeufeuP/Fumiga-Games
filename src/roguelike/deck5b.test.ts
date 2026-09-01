/**
 * Fase 5B (doc 03 §3–§7) — 48 cartas novas, evoluções, baús, slots,
 * classes bloqueadas e efeitos em modifiers.ts.
 */
import { describe, expect, it } from 'vitest';
import { TODAS, cardById, temGanhoDecrescente, CARDS_5A } from './cards';
import { drawPanel, slotsUsados } from './cardPool';
import { cardModsFrom } from './modifiers';
import { EVOLUCOES, evolucaoDisponivel } from './evolutions';

const rngFixo = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

describe('catálogo 5B: 68 cartas + 6 evoluções', () => {
  it('baralho completo: 20 (5A) + 54 (5B) = 74 definições, 68 jogáveis', () => {
    expect(CARDS_5A).toHaveLength(20);
    expect(TODAS).toHaveLength(74);
    const jogaveis = TODAS.filter((c) => c.categoria !== 'evolucao');
    expect(jogaveis).toHaveLength(68);
    const ids = new Set(TODAS.map((c) => c.id));
    expect(ids.size).toBe(74);
  });

  it('todas com ganho decrescente e descCurta ≤ 60', () => {
    for (const c of TODAS) {
      expect(temGanhoDecrescente(c)).toBe(true);
      expect(c.descCurta.length).toBeLessThanOrEqual(60);
    }
  });

  it('17 cartas exigem classe desbloqueada (Defensora 5 + Tóxica 6 + Gigante 6)', () => {
    const gated = TODAS.filter((c) => c.requerClasse);
    expect(gated).toHaveLength(17);
    expect(gated.filter((c) => c.requerClasse === 'defensora')).toHaveLength(5);
    expect(gated.filter((c) => c.requerClasse === 'toxica')).toHaveLength(6);
    expect(gated.filter((c) => c.requerClasse === 'gigante')).toHaveLength(6);
  });

  it('todas as 5 raridades presentes no baralho total', () => {
    const rrs = new Set(TODAS.map((c) => c.raridade));
    expect(rrs.size).toBe(5);
  });
});

describe('classes bloqueadas ficam fora do sorteio', () => {
  it('sem classes desbloqueadas, carta gated nunca aparece', () => {
    for (let i = 0; i < 40; i++) {
      const p = drawPanel({}, 10, { rng: rngFixo(i + 1) });
      for (const c of p) {
        if (c.tipo !== 'carta') continue;
        expect(cardById(c.id)?.requerClasse).toBeUndefined();
      }
    }
  });

  it('com a classe desbloqueada, a carta dela pode aparecer', () => {
    let achou = false;
    for (let i = 0; i < 200 && !achou; i++) {
      const p = drawPanel({}, 10, { rng: rngFixo(i + 1), classesDesbloqueadas: ['defensora'] });
      achou = p.some((c) => c.tipo === 'carta' && cardById(c.id)?.requerClasse === 'defensora');
    }
    expect(achou).toBe(true);
  });
});

describe('evoluções (doc 03 §5)', () => {
  it('6 evoluções com receita de 2 cartas', () => {
    expect(EVOLUCOES).toHaveLength(6);
    for (const e of EVOLUCOES) {
      expect(cardById(e.base)).toBeDefined();
      expect(cardById(e.suporte)).toBeDefined();
      expect(e.nivelMin).toBeGreaterThanOrEqual(6);
    }
  });

  it('receita exige base no máximo + suporte + nível mínimo', () => {
    const evo = EVOLUCOES.find((e) => e.id === 'evo_caravana_recursos')!;
    // base faltando → indisponível
    expect(evolucaoDisponivel(evo, { [evo.suporte]: 1 }, 10)).toBe(false);
    // base incompleta → indisponível
    const baseDef = cardById(evo.base)!;
    expect(evolucaoDisponivel(evo, { [evo.base]: baseDef.valores.length - 1, [evo.suporte]: 1 }, 10)).toBe(false);
    // nível baixo → indisponível
    expect(evolucaoDisponivel(evo, { [evo.base]: baseDef.valores.length, [evo.suporte]: 1 }, evo.nivelMin - 1)).toBe(false);
    // tudo certo → disponível
    expect(evolucaoDisponivel(evo, { [evo.base]: baseDef.valores.length, [evo.suporte]: 1 }, evo.nivelMin)).toBe(true);
    // já evoluída → não oferece de novo
    expect(evolucaoDisponivel(evo, { [evo.base]: baseDef.valores.length, [evo.suporte]: 1, [evo.id]: 1 }, 20)).toBe(false);
  });

  it('baú lendário garante a evolução disponível como 1ª opção', () => {
    const cartas: Record<string, number> = {
      mochila: 3,          // base no máximo
      passo_leve: 1,       // suporte
    };
    const p = drawPanel(cartas, 6, { rng: rngFixo(2), garantirEvolucao: true });
    const primeira = p[0]!;
    expect(primeira.tipo).toBe('carta');
    if (primeira.tipo === 'carta') {
      expect(primeira.id).toBe('evo_caravana_recursos');
      expect(primeira.evolucao).toBe(true);
    }
  });
});

describe('baús (doc 03 §7)', () => {
  it('baú do chefe: 5 escolhas com 1 rara ou melhor garantida', () => {
    for (let i = 0; i < 30; i++) {
      const p = drawPanel({}, 5, { rng: rngFixo(i + 3), tamanho: 5, garantia: 'rara' });
      expect(p).toHaveLength(5);
      const ordem: Record<string, number> = { comum: 0, incomum: 1, rara: 2, epica: 3, lendaria: 4 };
      const temRara = p.some((c) => ordem[c.raridade] >= 2);
      expect(temRara).toBe(true);
    }
  });

  it('baú comum: 3 escolhas', () => {
    const p = drawPanel({}, 3, { rng: rngFixo(9), tamanho: 3 });
    expect(p).toHaveLength(3);
  });
});

describe('slots com teto (doc 03 §6)', () => {
  it('tetos iniciais 3/3/2 e Mente-colmeia dá +1 especialização', () => {
    const sem = cardModsFrom({});
    expect(sem.slotBonusEspecializacao).toBe(0);
    const com = cardModsFrom({ mente_colmeia: 1 });
    expect(com.slotBonusEspecializacao).toBe(1);
    expect(com.colonyAllPct).toBe(10);
  });

  it('com teto ampliado, cabe mais carta nova de especialização', () => {
    // 3 especializações distintas = teto inicial cheio
    const cartas: Record<string, number> = { passo_leve: 1, mochila: 1, faro_apurado: 1 };
    expect(slotsUsados(cartas, 'especializacao')).toBe(3);
    // painel com caps ampliados (Mente-colmeia) não marca substituição
    let marcou = false;
    for (let i = 0; i < 25; i++) {
      const p = drawPanel(cartas, 4, {
        rng: rngFixo(i * 7 + 1),
        slotCaps: { especializacao: 4 },
      });
      for (const c of p) {
        if (c.tipo === 'carta' && c.requerSubstituicao) marcou = true;
      }
    }
    expect(marcou).toBe(false);
  });
});

describe('modifiers 5B: efeitos das 48 novas', () => {
  it('Colônia unida e Mente-colmeia', () => {
    const m = cardModsFrom({ colonia_unida: 2, mente_colmeia: 1 });
    expect(m.nearAllyPct).toBe(20);
    expect(m.colonyAllPct).toBe(10);
    expect(m.slotBonusEspecializacao).toBe(1);
  });

  it('Rainha: postura, ninhada dupla, saciedade', () => {
    const m = cardModsFrom({ postura_acelerada: 3, ninhada_dupla: 2, saciedade_duradoura: 2 });
    expect(m.productionIntervalMult).toBeCloseTo(0.67);
    expect(m.doubleBroodChance).toBeCloseTo(0.25);
    expect(m.satietySec).toBe(30);
  });

  it('Operária: carregadora, passo interno, mãos hábeis, turno, engenheiras', () => {
    const m = cardModsFrom({
      carregadora: 3, passo_interno: 3, maos_habeis: 3, turno_extra: 2, engenheiras: 1,
    });
    expect(m.depositBonusUnits).toBe(3);
    expect(m.nearNestSpeedPct).toBe(46);
    expect(m.repairHpPerSec).toBe(11);
    expect(m.workerPopMaxBonus).toBe(3);
    expect(m.repairInCombat).toBe(true);
  });

  it('Coletora e Exploradora', () => {
    const m = cardModsFrom({
      colheita_farta: 3, instinto_retorno: 2, casca_dura: 2,
      olhos_largos: 3, pernas_longas: 3, sentido_recurso: 1,
      mapeadoras: 2, cacadora_tesouros: 2, vanguarda: 2,
    });
    expect(m.harvestLuckChance).toBeCloseTo(0.33);
    expect(m.workerAutoFleePx).toBe(180);
    expect(m.workerHpBonus).toBe(32);
    expect(m.scoutRevealBonus).toBe(70);
    expect(m.scoutSpeedPct).toBe(34);
    expect(m.workerDetectAnywhere).toBe(true);
    expect(m.passiveRevealPct).toBe(80);
    expect(m.chestChanceBonus).toBeCloseTo(0.17);
    expect(m.xpPerNewAreaPct).toBe(25);
  });

  it('Soldado: golpe preciso, quitina, provocação, fúria', () => {
    const m = cardModsFrom({
      golpe_preciso: 3, coletor_quitina: 2, provocacao: 2, furia_colonia: 2,
    });
    expect(m.critBonus).toBeCloseTo(0.23);
    expect(m.chitinPerBoss).toBe(2);
    expect(m.tauntRadiusPx).toBe(220);
    expect(m.furyPerAntPct).toBe(4);
    expect(m.furyCapPct).toBe(60);
  });

  it('Comportamentos: enxame, espinhos, armadilha, nuvem, chuva, guardas, investida, fúria', () => {
    const m = cardModsFrom({
      enxame_mordidas: 3, espinhos_ninho: 3, armadilha_resina: 2, nuvem_feromonio: 2,
      chuva_acido: 2, muralha_defensores: 2, investida_gigante: 2, feromonio_furia: 1,
    });
    expect(m.swarmBiteDmg).toBe(4);
    expect(m.nestThornsFlat).toBe(17);
    expect(m.trapCdSec).toBe(10);
    expect(m.pheromoneZonePct).toBe(30);
    expect(m.acidRainDmg).toBe(16);
    expect(m.guardSummonSec).toBe(20);
    expect(m.giantChargeDmg).toBe(20);
    expect(m.nestLowHpFuryPct).toBe(50);
  });

  it('evoluções setam flags de comportamento', () => {
    const m = cardModsFrom({
      evo_legiao_ataque: 1,
      evo_caravana_recursos: 1,
      evo_coracao_dourado: 1,
    });
    expect(m.legiaoAtaque).toBe(true);
    expect(m.caravanaRecursos).toBe(true);
    expect(m.coracaoDourado).toBe(true);
  });
});
