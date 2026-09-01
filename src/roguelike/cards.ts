/**
 * Baralho roguelike — tipos, raridades, eixos e slots (doc 03).
 * As 68 cartas vivem em deck5a.ts (20) e deck5b.ts (48).
 * Definição declarativa — efeito vive SOMENTE em modifiers.ts.
 */
export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria';
export type CardCategoria = 'passiva' | 'especializacao' | 'comportamento' | 'evolucao';
export type Eixo = 'economia' | 'muralha' | 'agressao' | 'enxame' | 'exploracao' | 'veneno' | 'peso';

export interface CardDef {
  id: string;
  nome: string;
  raridade: Raridade;
  icone: string;
  descCurta: string;            // "{v}" é substituído pelo valor do nível
  descLonga: string;
  categoria: CardCategoria;     // slot de build (doc 03 §6)
  classe: 'colonia' | 'ninho' | 'rainha' | 'operaria' | 'coletora' | 'exploradora' | 'soldado';
  eixo: Eixo;                   // sinergia
  valores: readonly number[];   // ganho decrescente por nível [O 6.10]
  /** cartas de classe ainda não desbloqueada (Fase 6: Defensora/Tóxica/Gigante) */
  requerClasse?: 'defensora' | 'toxica' | 'gigante';
}

/** [O doc 03 §2] cores e nomes das raridades */
export const RARIDADES: Record<Raridade, { nome: string; cor: string }> = {
  comum: { nome: 'Comum', cor: '#8d8d8d' },
  incomum: { nome: 'Incomum', cor: '#5ab85a' },
  rara: { nome: 'Rara', cor: '#4b9ee8' },
  epica: { nome: 'Épica', cor: '#a767df' },
  lendaria: { nome: 'Lendária', cor: '#f0ad36' },
};

export const EIXOS: Record<Eixo, { nome: string; fantasia: string }> = {
  economia: { nome: 'Economia', fantasia: 'colônia rica' },
  muralha: { nome: 'Muralha', fantasia: 'fortaleza' },
  agressao: { nome: 'Agressão', fantasia: 'exército' },
  enxame: { nome: 'Enxame', fantasia: 'números' },
  exploracao: { nome: 'Exploração', fantasia: 'XP por mapa' },
  veneno: { nome: 'Veneno', fantasia: 'controle de área' },
  peso: { nome: 'Peso', fantasia: 'linha de frente' },
};

/** Slots de build (doc 03 §6) — tetos por categoria. */
export const SLOTS: Record<CardCategoria, { inicial: number; max: number; nome: string }> = {
  especializacao: { inicial: 3, max: 6, nome: 'Especializações' },
  comportamento: { inicial: 3, max: 5, nome: 'Comportamentos' },
  passiva: { inicial: 2, max: 4, nome: 'Passivas' },
  /** evolução substitui a carta base — não ocupa slot (doc 03 §5) */
  evolucao: { inicial: 0, max: 0, nome: 'Evoluções' },
};

import { DECK_5A } from './deck5a';
import { DECK_5B } from './deck5b';

/** baralho completo: 20 (5A) + 48 (5B) = 68 cartas */
export const TODAS: readonly CardDef[] = [...DECK_5A, ...DECK_5B];

/** compat: as 20 cartas da Fase 5A */
export const CARDS_5A: readonly CardDef[] = DECK_5A;

export function cardById(id: string): CardDef | undefined {
  return TODAS.find((c) => c.id === id);
}

/** Ganho decrescente obrigatório [O 6.10]: cada nível soma ≤ que o incremento anterior. */
export function temGanhoDecrescente(c: CardDef): boolean {
  for (let i = 2; i < c.valores.length; i++) {
    const incAtual = (c.valores[i] as number) - (c.valores[i - 1] as number);
    const incAnterior = (c.valores[i - 1] as number) - (c.valores[i - 2] as number);
    if (incAtual > incAnterior) return false;
  }
  return true;
}
