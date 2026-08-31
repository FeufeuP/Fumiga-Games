/**
 * Loja — grade de 16 melhorias do original (Yr), em 4 categorias.
 * Compras dinâmicas (+5 formigas) escalam o custo; o resto tem nível máximo.
 */
import { UPGRADES, upgradeCost, type ResourceKind, type UpgradeDef } from '../core/constants';
import type { AntMods, UpgradeLevels } from '../core/types';

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

/** Deriva os multiplicadores das formigas a partir dos níveis comprados. */
export function modsFrom(levels: UpgradeLevels): AntMods {
  const lv = (id: string) => levels[id] ?? 0;
  return {
    speedMult: 1 + 0.1 * lv('speed'),
    dmgMult: 1 + 0.1 * lv('strength'),
    hpMult: 1 + 0.15 * lv('hpboost'),
    attackSpeedMult: 1 + 0.15 * lv('attackspeed'),
    critChance: 0.1 * lv('crit'),
    critMult: 2 + 0.5 * lv('critdmg'),
    armorReduction: Math.min(0.8, 0.1 * lv('armor')),
    healPerSec: lv('heal') * 0.5,
    carryCap: 1 + lv('capacity'),
    visionMult: 1 + 0.15 * lv('vision'),
    luck: lv('luck'),
    xpBoost: lv('xpboost'),
  };
}
