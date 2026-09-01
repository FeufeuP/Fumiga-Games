/**
 * modifiers.ts — ÚNICO lugar que traduz cartas em efeitos no engine (doc 03 §1).
 * O baralho é declarativo (cards.ts); aqui as 20 cartas do 5A viram números.
 */
import { cardById } from './cards';

/** Modificadores agregados das cartas escolhidas na run. */
export interface CardMods {
  // Colônia
  speedPct: number;            // passo firme (+% vel todas)
  populationMaxBonus: number;  // ninhada maior
  efficiencyPct: number;       // divisão de trabalho (+% vel, dano e XP)
  commandRangeMult: number;    // feromônio de comando (1 = neutro)

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

  // Coletora (operária que coleta)
  workerSpeedPct: number;      // passo leve
  workerCarryBonus: number;    // mochila
  workerDetectBonus: number;   // faro apurado (px)

  // Soldado
  soldierDmgBonus: number;     // mandíbulas afiadas
  soldierHpBonus: number;      // couraça
  soldierAggroBonus: number;   // instinto de caça (px)
}

export function emptyCardMods(): CardMods {
  return {
    speedPct: 0,
    populationMaxBonus: 0,
    efficiencyPct: 0,
    commandRangeMult: 1,
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
    workerSpeedPct: 0,
    workerCarryBonus: 0,
    workerDetectBonus: 0,
    soldierDmgBonus: 0,
    soldierHpBonus: 0,
    soldierAggroBonus: 0,
  };
}

function add(m: CardMods, id: string, nivel: number): void {
  const total = (base: number, i: number) => base + i; // helper de leitura
  switch (id) {
    case 'passo_firme':
      m.speedPct = total(m.speedPct, valor(id, nivel));
      break;
    case 'ninhada_maior':
      m.populationMaxBonus = total(m.populationMaxBonus, valor(id, nivel));
      break;
    case 'divisao_trabalho':
      m.efficiencyPct = total(m.efficiencyPct, valor(id, nivel));
      break;
    case 'feromonio_comando':
      m.commandRangeMult += valor(id, nivel) / 100;
      break;

    case 'paredes_grossas':
      m.nestHpBonus = total(m.nestHpBonus, valor(id, nivel));
      break;
    case 'terra_batida':
      m.nestArmor = total(m.nestArmor, valor(id, nivel));
      break;
    case 'reparo_rapido':
      m.repairMult += valor(id, nivel) / 100;
      break;
    case 'despensa':
      m.storageMult += valor(id, nivel) / 100;
      break;
    case 'espinhos_raiz':
      m.nestThornsPct = valor(id, nivel);
      break;
    case 'fortaleza_viva':
      m.nestRegenBonus = total(m.nestRegenBonus, valor(id, nivel));
      break;

    case 'apetite_contido':
      m.hungerDrainMult -= valor(id, nivel) / 100;
      break;
    case 'estomago_amplo':
      m.hungerMaxMult += valor(id, nivel) / 100;
      break;
    case 'porcao_reforcada':
      m.hungerPerItemBonus = total(m.hungerPerItemBonus, valor(id, nivel));
      break;
    case 'rainha_eterna':
      m.queenRevive = true;
      break;

    case 'passo_leve':
      m.workerSpeedPct = total(m.workerSpeedPct, valor(id, nivel));
      break;
    case 'mochila':
      m.workerCarryBonus = total(m.workerCarryBonus, valor(id, nivel));
      break;
    case 'faro_apurado':
      m.workerDetectBonus = total(m.workerDetectBonus, valor(id, nivel));
      break;

    case 'mandibulas_afiadas':
      m.soldierDmgBonus = total(m.soldierDmgBonus, valor(id, nivel));
      break;
    case 'couraca':
      m.soldierHpBonus = total(m.soldierHpBonus, valor(id, nivel));
      break;
    case 'instinto_caca':
      m.soldierAggroBonus = total(m.soldierAggroBonus, valor(id, nivel));
      break;
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
  return m;
}
