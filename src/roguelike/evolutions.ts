/**
 * Evoluções (doc 03 §5): carta base no MÁXIMO + carta de suporte +
 * nível mínimo de colônia. Substituem a base e NÃO ocupam slot.
 * Oferecidas com garantia no baú lendário (2º chefe da run).
 */
import { cardById } from './cards';

export interface EvolucaoDef {
  id: string;          // id da carta de evolução (deck5b, categoria 'evolucao')
  nome: string;
  base: string;        // carta exigida no nível máximo
  suporte: string;     // carta de suporte (≥ nível 1)
  nivelMin: number;    // nível mínimo da colônia
  desc: string;        // comportamento novo
}

export const EVOLUCOES: readonly EvolucaoDef[] = [
  {
    id: 'evo_legiao_ataque', nome: 'Legião de ataque',
    base: 'mandibulas_afiadas', suporte: 'furia_colonia', nivelMin: 8,
    desc: 'Soldados a até 130px dividem entre si o dano recebido.',
  },
  {
    id: 'evo_nuvem_acido', nome: 'Nuvem de ácido',
    base: 'corrosao_prolongada', suporte: 'propagacao', nivelMin: 8,
    desc: 'Poças de ácido se fundem numa nuvem que segue os inimigos.',
  },
  {
    id: 'evo_muralha_viva', nome: 'Muralha viva',
    base: 'anel_ampliado', suporte: 'escudo_reforcado', nivelMin: 8,
    desc: 'Defensoras se conectam formando uma barreira física.',
  },
  {
    id: 'evo_colosso_ninho', nome: 'Colosso do ninho',
    base: 'impacto', suporte: 'empurrao', nivelMin: 10,
    desc: 'A Gigante ganha investida com dano em linha e atordoamento.',
  },
  {
    id: 'evo_caravana_recursos', nome: 'Caravana de recursos',
    base: 'mochila', suporte: 'passo_leve', nivelMin: 6,
    desc: 'Coletoras em fila: a primeira que chega descarrega por todas.',
  },
  {
    id: 'evo_coracao_dourado', nome: 'Coração dourado',
    base: 'porcao_reforcada', suporte: 'ninhada_dupla', nivelMin: 10,
    desc: 'Fome ≥80%: a Rainha põe ovos sem consumir comida.',
  },
];

/** Evolução disponível? (base no máx + suporte + nível + ainda não feita) */
export function evolucaoDisponivel(
  evo: EvolucaoDef,
  cards: Record<string, number>,
  level: number,
): boolean {
  if ((cards[evo.id] ?? 0) > 0) return false; // já evoluída
  const baseDef = cardById(evo.base);
  const baseNivel = cards[evo.base] ?? 0;
  if (!baseDef || baseNivel < baseDef.valores.length) return false;
  if ((cards[evo.suporte] ?? 0) < 1) return false;
  return level >= evo.nivelMin;
}

/** Todas as evoluções disponíveis agora. */
export function evolucoesDisponiveis(
  cards: Record<string, number>,
  level: number,
): EvolucaoDef[] {
  return EVOLUCOES.filter((e) => evolucaoDisponivel(e, cards, level));
}

/** Evolução pelo id da carta. */
export function evolucaoById(id: string): EvolucaoDef | undefined {
  return EVOLUCOES.find((e) => e.id === id);
}
