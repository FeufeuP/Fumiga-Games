/**
 * Loja — grade de 16 melhorias do original (Yr), em 4 categorias.
 * Compras dinâmicas (+5 formigas) escalam o custo; o resto tem nível máximo.
 */
import {
  ANTS, BEHAVIOR, NEST, QUEEN, REBIRTH_BONUS, UPGRADES, XP,
  upgradeCost, type ResourceKind, type UpgradeDef,
} from '../core/constants';
import type { AntMods, UpgradeLevels } from '../core/types';
import type { CardMods } from '../roguelike/modifiers';
import { emptyCardMods } from '../roguelike/modifiers';

export function emptyUpgrades(): UpgradeLevels {
  const u: UpgradeLevels = {};
  for (const def of UPGRADES) u[def.id] = 0;
  return u;
}

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}

/** Pode comprar? Retorna custo ou null. */
export function canBuy(
  def: UpgradeDef,
  levels: UpgradeLevels,
  resources: Record<ResourceKind, number>,
): { kind: ResourceKind; amount: number } | null {
  const bought = levels[def.id] ?? 0;
  if (bought >= def.max) return null;
  const cost = upgradeCost(def, bought);
  if ((resources[cost.kind] ?? 0) < cost.amount) return null;
  return cost;
}

/** Aplica a compra: devolve novos níveis + custo pago + formigas a criar. */
export function buy(
  def: UpgradeDef,
  levels: UpgradeLevels,
): { levels: UpgradeLevels; cost: { kind: ResourceKind; amount: number }; antsToAdd: number } {
  const bought = levels[def.id] ?? 0;
  const cost = upgradeCost(def, bought);
  const next = { ...levels, [def.id]: bought + 1 };
  const antsToAdd =
    def.id === 'antlimit' || def.id === 'soldier' || def.id === 'scout' ? 5 : 0;
  return { levels: next, cost, antsToAdd };
}

/** Bônus permanentes por renascimento [O At(r)]. */
export function rebirthBonus(rebirths: number) {
  return {
    speedPct: rebirths * REBIRTH_BONUS.SPEED_PCT,
    visionPct: rebirths * REBIRTH_BONUS.VISION_PCT,
    capacity: rebirths * REBIRTH_BONUS.CAPACITY,
    damagePct: rebirths * REBIRTH_BONUS.DAMAGE_PCT,
    hpPct: rebirths * REBIRTH_BONUS.HP_PCT,
    xpPct: rebirths * REBIRTH_BONUS.XP_PCT,
  };
}

/** Deriva os multiplicadores das formigas (melhorias + renascimento [O]). */
export function modsFrom(levels: UpgradeLevels, rebirths = 0): AntMods {
  const lv = (id: string) => levels[id] ?? 0;
  const rb = rebirthBonus(rebirths);
  return {
    speedMult: (1 + 0.1 * lv('speed')) * (1 + rb.speedPct / 100),
    dmgMult: (1 + 0.1 * lv('strength')) * (1 + rb.damagePct / 100),
    hpMult: (1 + 0.15 * lv('hpboost')) * (1 + rb.hpPct / 100),
    attackSpeedMult: 1 + 0.15 * lv('attackspeed'),
    critChance: 0.1 * lv('crit'),
    critMult: 2 + 0.5 * lv('critdmg'),
    armorReduction: Math.min(0.8, 0.1 * lv('armor')),
    healPerSec: lv('heal') * 0.5,
    carryCap: 1 + lv('capacity') + rb.capacity,
    visionMult: (1 + 0.15 * lv('vision')) * (1 + rb.visionPct / 100),
    luck: lv('luck'),
    xpBoost: lv('xpboost') + rb.xpPct / 100,
  };
}


// ═══════════════════ MELHORIA VISÍVEL: agora → próximo ═══════════════════

/** Velocidade real da operária (px/s) com loja + cartas. */
export function workerSpeed(m: AntMods, cm: CardMods): number {
  const pct = cm.speedPct + cm.efficiencyPct + cm.workerSpeedPct;
  return ANTS.worker.speed * m.speedMult * (1 + pct / 100);
}

/** Dano real do soldado com loja + cartas. */
export function soldierDamage(m: AntMods, cm: CardMods): number {
  return ANTS.soldier.dmg * m.dmgMult * (1 + cm.efficiencyPct / 100) + cm.soldierDmgBonus;
}

/**
 * Prévia concreta do efeito de comprar +1 nível: "agora → próximo".
 * Retorna null quando não há número simples de mostrar.
 */
export function statPreview(
  id: string,
  levels: UpgradeLevels,
  rebirths: number,
  cardMods: CardMods = emptyCardMods(),
  extra: { population: number; populationMax: number } = { population: 0, populationMax: 60 },
): { rotulo: string; agora: string; proximo: string } | null {
  const lv = levels[id] ?? 0;
  const next: UpgradeLevels = { ...levels, [id]: lv + 1 };
  const m = modsFrom(levels, rebirths);
  const m2 = modsFrom(next, rebirths);
  const cm = cardMods;
  const r1 = (v: number) => Math.round(v).toString();

  switch (id) {
    case 'speed': {
      const v = workerSpeed(m, cm);
      return { rotulo: 'velocidade', agora: `${r1(v)} px/s`, proximo: `${r1(workerSpeed(m2, cm))} px/s` };
    }
    case 'strength': {
      const v = soldierDamage(m, cm);
      return { rotulo: 'dano', agora: r1(v), proximo: r1(soldierDamage(m2, cm)) };
    }
    case 'hpboost': {
      const v = ANTS.worker.hp * m.hpMult;
      return { rotulo: 'vida', agora: `${r1(v)} HP`, proximo: `${r1(ANTS.worker.hp * m2.hpMult)} HP` };
    }
    case 'capacity': {
      const v = m.carryCap + cm.workerCarryBonus;
      return { rotulo: 'carga', agora: `${v}`, proximo: `${m2.carryCap + cm.workerCarryBonus}` };
    }
    case 'vision': {
      const v = BEHAVIOR.WORKER_DETECT * m.visionMult + cm.workerDetectBonus;
      return { rotulo: 'visão', agora: `${r1(v)} px`, proximo: `${r1(BEHAVIOR.WORKER_DETECT * m2.visionMult + cm.workerDetectBonus)} px` };
    }
    case 'crit': {
      const v = (m.critChance + cm.critBonus) * 100;
      return { rotulo: 'crítico', agora: `${Math.round(v)}%`, proximo: `${Math.round((m2.critChance + cm.critBonus) * 100)}%` };
    }
    case 'critdmg': {
      const v = m.critMult;
      return { rotulo: 'dano crít.', agora: `×${v.toFixed(1)}`, proximo: `×${m2.critMult.toFixed(1)}` };
    }
    case 'armor': {
      const v = Math.min(0.8, m.armorReduction) * 100;
      return { rotulo: 'armadura', agora: `${Math.round(v)}%`, proximo: `${Math.round(Math.min(0.8, m2.armorReduction) * 100)}%` };
    }
    case 'attackspeed': {
      const v = 1 / m.attackSpeedMult;
      return { rotulo: 'golpe', agora: `${v.toFixed(2)}s`, proximo: `${(1 / m2.attackSpeedMult).toFixed(2)}s` };
    }
    case 'heal': {
      return { rotulo: 'regen', agora: `${m.healPerSec} HP/s`, proximo: `${m2.healPerSec} HP/s` };
    }
    case 'luck': {
      const v = 10 * m.luck;
      return { rotulo: 'sorte', agora: `${v}%`, proximo: `${10 * m2.luck}%` };
    }
    case 'xpboost': {
      const v = XP.PER_DEPOSIT + m.xpBoost;
      return { rotulo: 'XP/item', agora: `${v}`, proximo: `${XP.PER_DEPOSIT + m2.xpBoost}` };
    }
    case 'respawn': {
      const v = Math.max(3, 15 * (1 - 0.3 * lv));
      return { rotulo: 'renasce', agora: `${v.toFixed(1)}s`, proximo: `${Math.max(3, 15 * (1 - 0.3 * (lv + 1))).toFixed(1)}s` };
    }
    case 'antlimit':
    case 'soldier':
    case 'scout': {
      return {
        rotulo: 'população',
        agora: `${extra.population}/${extra.populationMax}`,
        proximo: `${extra.population + 5}/${extra.populationMax}`,
      };
    }
    case 'nesthp': {
      const base = NEST.HP_MAX + (levels.nesthp ?? 0) * NEST.HP_PER_UPGRADE + cardMods.nestHpBonus;
      return { rotulo: 'ninho', agora: `${r1(base)} HP`, proximo: `${r1(base + NEST.HP_PER_UPGRADE)} HP` };
    }
    default:
      return null;
  }
}

/** Estatísticas atuais da colônia (pausa > ESTATÍSTICAS + painel). */
export function colonyStats(
  levels: UpgradeLevels,
  rebirths: number,
  cardMods: CardMods,
  extra: { population: number; populationMax: number; nestHpMax: number },
): Array<{ label: string; value: string }> {
  const m = modsFrom(levels, rebirths);
  const cm = cardMods;
  return [
    { label: 'Velocidade (operária)', value: `${Math.round(workerSpeed(m, cm))} px/s` },
    { label: 'Dano (soldado)', value: `${Math.round(soldierDamage(m, cm))}` },
    { label: 'Vida (operária)', value: `${Math.round(ANTS.worker.hp * m.hpMult + cm.workerHpBonus)} HP` },
    { label: 'Vida (soldado)', value: `${Math.round(ANTS.soldier.hp * m.hpMult + cm.soldierHpBonus)} HP` },
    { label: 'Carga', value: `${m.carryCap + cm.workerCarryBonus}` },
    { label: 'Visão', value: `${Math.round(BEHAVIOR.WORKER_DETECT * m.visionMult + cm.workerDetectBonus)} px` },
    { label: 'Crítico', value: `${Math.round((m.critChance + cm.critBonus) * 100)}% ×${m.critMult.toFixed(1)}` },
    { label: 'Armadura', value: `${Math.round(Math.min(0.8, m.armorReduction) * 100)}%` },
    { label: 'HP do ninho', value: `${Math.round(extra.nestHpMax)} HP` },
    { label: 'População', value: `${extra.population}/${extra.populationMax}` },
    { label: 'Fome máxima', value: `${Math.round(QUEEN.HUNGER_MAX * cm.hungerMaxMult)}` },
    { label: 'Eficiência (cartas)', value: `+${cm.efficiencyPct}%` },
  ];
}
