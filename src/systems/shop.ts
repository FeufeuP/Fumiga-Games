/**
 * Loja — grade de 16 melhorias do original (Yr), em 4 categorias.
 * Compras dinâmicas (+5 formigas) escalam o custo; o resto tem nível máximo.
 */
import { REBIRTH_BONUS, UPGRADES, upgradeCost, type ResourceKind, type UpgradeDef } from '../core/constants';
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
