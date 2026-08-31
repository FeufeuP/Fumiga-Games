/**
 * Ninho — HP, reparo das operárias, estado de ruína (docs/02 L5).
 * Dano de verdade chega com os inimigos na Fase 4; o reparo já é real.
 */
export function repair(
  hp: number,
  hpMax: number,
  amount: number,
): { hp: number; repaired: number } {
  const repaired = Math.max(0, Math.min(amount, hpMax - hp));
  return { hp: hp + repaired, repaired };
}

/** Eficiência do ninho — 100% inteiro, 50% em ruína (L5). */
export function efficiency(hp: number, ruinEfficiency: number): number {
  return hp > 0 ? 1 : ruinEfficiency;
}
