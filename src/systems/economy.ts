/**
 * Economia — depósito com teto do estoque (docs/02 L1: 22 comida/onda).
 * Funções puras: o motor aplica e emite os eventos.
 */
import { NEST, RESOURCES } from '../core/constants';
import type { ResourceKind } from '../core/types';

export function foodValueOf(kind: ResourceKind, units: number): number {
  return RESOURCES[kind].food * units;
}

/** Depósito no estoque com teto — excesso se perde (pressão de armazenamento). */
export function depositInto(
  current: number,
  foodValue: number,
  cap: number = NEST.STORAGE,
): { food: number; accepted: number } {
  const accepted = Math.max(0, Math.min(foodValue, cap - current));
  return { food: current + accepted, accepted };
}
