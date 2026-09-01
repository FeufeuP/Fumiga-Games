/**
 * modifiers.ts — ÚNICO lugar que traduz cartas em efeitos no engine (doc 03 §1).
 * O baralho é declarativo (cards.ts); aqui as 68 cartas do 5A+5B viram números.
 */
import { cardById } from './cards';

/** Modificadores agregados das cartas escolhidas na run. */
export interface CardMods {
  // Colônia
  speedPct: number;            // passo firme (+% vel todas)
  populationMaxBonus: number;  // ninhada maior
  efficiencyPct: number;       // divisão de trabalho (+% vel, dano e XP)
  commandRangeMult: number;    // feromônio de comando (1 = neutro)
  colonyAllPct: number;        // mente-colmeia (+% em tudo)
  nearAllyPct: number;         // colônia unida (formigas ≤80px)
  slotBonusEspecializacao: number; // mente-colmeia (+1 slot)

  // Ninho
  nestHpBonus: number;         // paredes grossas
  nestArmor: number;           // terra batida (redução flat)
  repairMult: number;          // reparo rápido (1 = neutro)
  storageMult: number;         // despensa (1 = neutro)
  nestThornsPct: number;       // espinhos de raiz (0–100)
  nestRegenBonus: number;      // fortaleza viva (HP/s fora de combate)

  // Rainha
  hungerDrainMult: number;     // apetite contido (1 = neutro)
  hungerMaxMult: number;       // estômago amplo (1 = neutro)
  hungerPerItemBonus: number;  // porção reforçada
  queenRevive: boolean;        // rainha eterna
  productionIntervalMult: number; // postura acelerada (1 = neutro)
  doubleBroodChance: number;   // ninhada dupla (%)
  satietySec: number;          // saciedade duradoura (s após comer)

  // Operária
  depositBonusUnits: number;   // carregadora (+itens por entrega)
  nearNestSpeedPct: number;    // passo interno (≤180px do ninho)
  repairHpPerSec: number;      // mãos hábeis (HP/s flat no reparo)
  workerPopMaxBonus: number;   // turno extra (teto de operárias)
  repairInCombat: boolean;     // engenheiras (regen mesmo em combate)

  // Coletora (operária que coleta)
  workerSpeedPct: number;      // passo leve
  workerCarryBonus: number;    // mochila
  workerDetectBonus: number;   // faro apurado (px)
  workerHpBonus: number;       // casca dura
  harvestLuckChance: number;   // colheita farta (0–1)
  workerAutoFleePx: number;    // instinto de retorno (0 = desligado)

  // Exploradora
  scoutRevealBonus: number;    // olhos largos (px)
  scoutSpeedPct: number;       // pernas longas
  workerDetectAnywhere: boolean; // sentido de recurso
  passiveRevealPct: number;    // mapeadoras (+% visão passiva)
  chestChanceBonus: number;    // caçadora de tesouros (0–1)
  xpPerNewAreaPct: number;     // vanguarda (XP por 1% revelado)

  // Soldado
  soldierDmgBonus: number;     // mandíbulas afiadas
  soldierHpBonus: number;      // couraça
  soldierAggroBonus: number;   // instinto de caça (px)
  critBonus: number;           // golpe preciso (0–1)
  chitinPerBoss: number;       // coletor de quitina
  tauntRadiusPx: number;       // provocação (0 = desligado)
  furyPerAntPct: number;       // fúria da colônia (% por formiga viva)
  furyCapPct: number;          // teto da fúria (%)

  // Comportamentos
  swarmBiteDmg: number;        // enxame de mordidas (dano/formiga a cada 8s)
  nestThornsFlat: number;      // espinhos do ninho (dano flat)
  trapCdSec: number;           // armadilha de resina (0 = sem armadilhas)
  pheromoneZonePct: number;    // nuvem de feromônio (+vel na zona)
  acidRainDmg: number;         // chuva de ácido (dano a cada 20s)
  guardSummonSec: number;      // muralha de defensores (duração dos guardas)
  giantChargeDmg: number;      // investida gigante (dano a cada 30s)
  nestLowHpFuryPct: number;    // feromônio de fúria (% com ninho <30%)

  // ── [P 5C] Defensora (5 cartas) ──
  defenderRingRadiusBonus: number;
  defenderArmor: number;
  defenderMaxTargets: number;
  defenderStandDmgPct: number;
  defenderKnockbackImmune: boolean;
  defenderRegen: number;

  // ── [P 5C] Tóxica (6 cartas) ──
  toxicAcidDmg: number;
  toxicRangeBonus: number;
  toxicRatePct: number;
  toxicCorrosionSecBonus: number;
  toxicSpreadTargets: number;
  toxicCritChance: number;

  // ── [P 5C] Gigante (6 cartas) ──
  giantHpBonus: number;
  giantDmgBonus: number;
  giantKnockbackPx: number;
  giantImmune: boolean;
  giantAoePx: number;
  giantSpeedPct: number;

  // Evoluções (doc 03 §5) — flags de comportamento
  legiaoAtaque: boolean;       // soldados ≤130px dividem o dano recebido
  caravanaRecursos: boolean;   // coletoras em fila descarregam juntas
  coracaoDourado: boolean;     // fome ≥80%: ovos não custam comida
}

export function emptyCardMods(): CardMods {
  return {
    speedPct: 0,
    populationMaxBonus: 0,
    efficiencyPct: 0,
    commandRangeMult: 1,
    colonyAllPct: 0,
    nearAllyPct: 0,
    slotBonusEspecializacao: 0,

    nestHpBonus: 0,
    nestArmor: 0,
    repairMult: 1,
    storageMult: 1,
    nestThornsPct: 0,
    nestRegenBonus: 0,

    hungerDrainMult: 1,
    hungerMaxMult: 1,
    hungerPerItemBonus: 0,
    queenRevive: false,
    productionIntervalMult: 1,
    doubleBroodChance: 0,
    satietySec: 0,

    depositBonusUnits: 0,
    nearNestSpeedPct: 0,
    repairHpPerSec: 0,
    workerPopMaxBonus: 0,
    repairInCombat: false,

    workerSpeedPct: 0,
    workerCarryBonus: 0,
    workerDetectBonus: 0,
    workerHpBonus: 0,
    harvestLuckChance: 0,
    workerAutoFleePx: 0,

    scoutRevealBonus: 0,
    scoutSpeedPct: 0,
    workerDetectAnywhere: false,
    passiveRevealPct: 0,
    chestChanceBonus: 0,
    xpPerNewAreaPct: 0,

    soldierDmgBonus: 0,
    soldierHpBonus: 0,
    soldierAggroBonus: 0,
    critBonus: 0,
    chitinPerBoss: 0,
    tauntRadiusPx: 0,
    furyPerAntPct: 0,
    furyCapPct: 0,

    swarmBiteDmg: 0,
    nestThornsFlat: 0,
    trapCdSec: 0,
    pheromoneZonePct: 0,
    acidRainDmg: 0,
    guardSummonSec: 0,
    giantChargeDmg: 0,
    nestLowHpFuryPct: 0,

    defenderRingRadiusBonus: 0,
    defenderArmor: 0,
    defenderMaxTargets: 0,
    defenderStandDmgPct: 0,
    defenderKnockbackImmune: false,
    defenderRegen: 0,

    toxicAcidDmg: 0,
    toxicRangeBonus: 0,
    toxicRatePct: 0,
    toxicCorrosionSecBonus: 0,
    toxicSpreadTargets: 0,
    toxicCritChance: 0,

    giantHpBonus: 0,
    giantDmgBonus: 0,
    giantKnockbackPx: 0,
    giantImmune: false,
    giantAoePx: 0,
    giantSpeedPct: 0,

    legiaoAtaque: false,
    caravanaRecursos: false,
    coracaoDourado: false,
  };
}

function add(m: CardMods, id: string, nivel: number): void {
  const v = valor(id, nivel);
  switch (id) {
    // ── Colônia ──
    case 'passo_firme': m.speedPct = v; break;
    case 'ninhada_maior': m.populationMaxBonus = v; break;
    case 'divisao_trabalho': m.efficiencyPct = v; break;
    case 'feromonio_comando': m.commandRangeMult = 1 + v / 100; break;
    case 'colonia_unida': m.nearAllyPct = v; break;
    case 'mente_colmeia':
      m.colonyAllPct = v;
      m.slotBonusEspecializacao = 1;
      break;

    // ── Ninho ──
    case 'paredes_grossas': m.nestHpBonus = v; break;
    case 'terra_batida': m.nestArmor = v; break;
    case 'reparo_rapido': m.repairMult = 1 + v / 100; break;
    case 'despensa': m.storageMult = 1 + v / 100; break;
    case 'espinhos_raiz': m.nestThornsPct = v; break;
    case 'fortaleza_viva': m.nestRegenBonus = v; break;

    // ── Rainha ──
    case 'apetite_contido': m.hungerDrainMult = 1 - v / 100; break;
    case 'estomago_amplo': m.hungerMaxMult = 1 + v / 100; break;
    case 'porcao_reforcada': m.hungerPerItemBonus = v; break;
    case 'rainha_eterna': m.queenRevive = true; break;
    case 'postura_acelerada': m.productionIntervalMult = 1 - v / 100; break;
    case 'ninhada_dupla': m.doubleBroodChance = v / 100; break;
    case 'saciedade_duradoura': m.satietySec = v; break;

    // ── Operária ──
    case 'carregadora': m.depositBonusUnits = v; break;
    case 'passo_interno': m.nearNestSpeedPct = v; break;
    case 'maos_habeis': m.repairHpPerSec = v; break;
    case 'turno_extra': m.workerPopMaxBonus = v; break;
    case 'engenheiras': m.repairInCombat = true; break;

    // ── Coletora ──
    case 'passo_leve': m.workerSpeedPct = v; break;
    case 'mochila': m.workerCarryBonus = v; break;
    case 'faro_apurado': m.workerDetectBonus = v; break;
    case 'colheita_farta': m.harvestLuckChance = v / 100; break;
    case 'instinto_retorno': m.workerAutoFleePx = v; break;
    case 'casca_dura': m.workerHpBonus = v; break;

    // ── Exploradora ──
    case 'olhos_largos': m.scoutRevealBonus = v; break;
    case 'pernas_longas': m.scoutSpeedPct = v; break;
    case 'sentido_recurso': m.workerDetectAnywhere = true; break;
    case 'mapeadoras': m.passiveRevealPct = v; break;
    case 'cacadora_tesouros': m.chestChanceBonus = v / 100; break;
    case 'vanguarda': m.xpPerNewAreaPct = v; break;

    // ── Soldado ──
    case 'mandibulas_afiadas': m.soldierDmgBonus = v; break;
    case 'couraca': m.soldierHpBonus = v; break;
    case 'instinto_caca': m.soldierAggroBonus = v; break;
    case 'golpe_preciso': m.critBonus = v / 100; break;
    case 'coletor_quitina': m.chitinPerBoss = v; break;
    case 'provocacao': m.tauntRadiusPx = v; break;
    case 'furia_colonia':
      m.furyPerAntPct = v;
      m.furyCapPct = v === 3 ? 45 : 60;
      break;

    // ── Defensora ──
    case 'anel_ampliado': m.defenderRingRadiusBonus = v; break;
    case 'escudo_reforcado': m.defenderArmor = v; break;
    case 'interceptacao': m.defenderMaxTargets = v; break;
    case 'postura_firme': m.defenderStandDmgPct = v; m.defenderKnockbackImmune = true; break;
    case 'recuperacao': m.defenderRegen = v; break;

    // ── Tóxica ──
    case 'acido_concentrado': m.toxicAcidDmg = v; break;
    case 'jato_longo': m.toxicRangeBonus = v; break;
    case 'cadencia_rapida': m.toxicRatePct = v; break;
    case 'corrosao_prolongada': m.toxicCorrosionSecBonus = v; break;
    case 'propagacao': m.toxicSpreadTargets = v; break;
    case 'acido_critico': m.toxicCritChance = v / 100; break;

    // ── Gigante ──
    case 'massa': m.giantHpBonus = v; break;
    case 'impacto': m.giantDmgBonus = v; break;
    case 'empurrao': m.giantKnockbackPx = v; break;
    case 'inabalavel': m.giantImmune = true; break;
    case 'onda_choque': m.giantAoePx = v; break;
    case 'passo_pesado': m.giantSpeedPct = v; break;

    // ── Comportamentos ──
    case 'enxame_mordidas': m.swarmBiteDmg = v; break;
    case 'espinhos_ninho': m.nestThornsFlat = v; break;
    case 'armadilha_resina': m.trapCdSec = v; break;
    case 'nuvem_feromonio': m.pheromoneZonePct = v; break;
    case 'chuva_acido': m.acidRainDmg = v; break;
    case 'muralha_defensores': m.guardSummonSec = v; break;
    case 'investida_gigante': m.giantChargeDmg = v; break;
    case 'feromonio_furia': m.nestLowHpFuryPct = v; break;

    // ── Evoluções ──
    case 'evo_legiao_ataque': m.legiaoAtaque = true; break;
    case 'evo_caravana_recursos': m.caravanaRecursos = true; break;
    case 'evo_coracao_dourado': m.coracaoDourado = true; break;
  }
}

/**
 * Valor EFETIVO da carta no nível dado.
 * [doc 03 §4] valorPorNivel é o total acumulado: Paredes grossas [40,70,95]
 * → nível 1 = +40, nível 2 = +70, nível 3 = +95 (ganhos marginais 40/30/25 decrescentes).
 */
function valor(id: string, nivel: number): number {
  const c = cardById(id);
  if (!c || nivel <= 0) return 0;
  return (c.valores[Math.min(nivel, c.valores.length) - 1] as number);
}

/** Agrega os efeitos de todas as cartas escolhidas (id → nível). */
export function cardModsFrom(cards: Record<string, number>): CardMods {
  const m = emptyCardMods();
  for (const [id, nivel] of Object.entries(cards)) {
    if (nivel > 0) add(m, id, nivel);
  }
  // travas de sanidade
  m.hungerDrainMult = Math.max(0.1, m.hungerDrainMult);
  m.commandRangeMult = Math.max(1, m.commandRangeMult);
  m.repairMult = Math.max(1, m.repairMult);
  m.storageMult = Math.max(1, m.storageMult);
  m.productionIntervalMult = Math.max(0.3, m.productionIntervalMult);
  m.critBonus = Math.min(0.5, m.critBonus);
  return m;
}
