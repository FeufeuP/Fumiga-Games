/**
 * Fase 5A — as 20 primeiras cartas (doc 03 §9): 6 Ninho, 4 Colônia,
 * 4 Rainha, 3 Coletora (aplicadas à operária-coletora), 3 Soldado.
 */
import type { CardDef } from './cards';

export const DECK_5A: readonly CardDef[] = [
  // ── Colônia (4) ─────────────────────────────────────────────────
  {
    id: 'passo_firme', nome: 'Passo firme', raridade: 'comum', icone: '⚡',
    descCurta: '+{v}% de velocidade de todas as formigas',
    descLonga: 'Todas as formigas da colônia andam mais rápido, carregando ou não.',
    categoria: 'passiva', classe: 'colonia', eixo: 'enxame',
    valores: [8, 14, 19],
  },
  {
    id: 'ninhada_maior', nome: 'Ninhada maior', raridade: 'incomum', icone: '🥚',
    descCurta: '+{v} de população máxima',
    descLonga: 'A colônia sustenta mais formigas — compre mais recrutas na loja.',
    categoria: 'passiva', classe: 'colonia', eixo: 'enxame',
    valores: [2, 3, 4],
  },
  {
    id: 'divisao_trabalho', nome: 'Divisão de trabalho', raridade: 'incomum', icone: '🌀',
    descCurta: '+{v}% de eficiência em todas as tarefas',
    descLonga: 'Velocidade, dano e XP de toda a colônia sobem de uma vez.',
    categoria: 'passiva', classe: 'colonia', eixo: 'economia',
    valores: [10, 17, 23],
  },
  {
    id: 'feromonio_comando', nome: 'Feromônio de comando', raridade: 'rara', icone: '📡',
    descCurta: '+{v}% de alcance de comando',
    descLonga: 'Toques de comando concentram as formigas num ponto mais preciso.',
    categoria: 'passiva', classe: 'colonia', eixo: 'enxame',
    valores: [25, 40],
  },

  // ── Ninho (6) ───────────────────────────────────────────────────
  {
    id: 'paredes_grossas', nome: 'Paredes grossas', raridade: 'comum', icone: '🧱',
    descCurta: '+{v} HP do ninho',
    descLonga: 'O formigueiro aguenta muito mais castigo antes de colapsar.',
    categoria: 'passiva', classe: 'ninho', eixo: 'muralha',
    valores: [40, 70, 95],
  },
  {
    id: 'terra_batida', nome: 'Terra batida', raridade: 'comum', icone: '🛡️',
    descCurta: '+{v} de armadura do ninho',
    descLonga: 'Cada golpe no ninho causa menos dano (mínimo 1).',
    categoria: 'passiva', classe: 'ninho', eixo: 'muralha',
    valores: [2, 3, 4],
  },
  {
    id: 'reparo_rapido', nome: 'Reparo rápido', raridade: 'incomum', icone: '🔧',
    descCurta: '+{v}% de velocidade de reparo',
    descLonga: 'Regeneração e reparo das operárias ficam mais rápidos.',
    categoria: 'passiva', classe: 'ninho', eixo: 'muralha',
    valores: [50, 85, 115],
  },
  {
    id: 'despensa', nome: 'Despensa', raridade: 'incomum', icone: '🎒',
    descCurta: '+{v}% de armazenamento',
    descLonga: 'A colônia estoca mais recursos de cada tipo (base 200).',
    categoria: 'passiva', classe: 'ninho', eixo: 'economia',
    valores: [30, 50, 65],
  },
  {
    id: 'espinhos_raiz', nome: 'Espinhos de raiz', raridade: 'rara', icone: '🌵',
    descCurta: 'devolve {v}% do dano recebido',
    descLonga: 'Quem bate no ninho leva o dano de volta — pode morrer no espinho.',
    categoria: 'passiva', classe: 'ninho', eixo: 'muralha',
    valores: [30, 50],
  },
  {
    id: 'fortaleza_viva', nome: 'Fortaleza viva', raridade: 'epica', icone: '🏰',
    descCurta: 'ninho regenera {v} HP/s fora de combate',
    descLonga: 'O próprio formigueiro se cura, sem precisar de operárias.',
    categoria: 'passiva', classe: 'ninho', eixo: 'muralha',
    valores: [3, 5],
  },

  // ── Rainha (4) ──────────────────────────────────────────────────
  {
    id: 'apetite_contido', nome: 'Apetite contido', raridade: 'comum', icone: '🍽️',
    descCurta: '−{v}% de consumo de fome',
    descLonga: 'A Rainha come mais devagar e aguenta mais tempo sem comida.',
    categoria: 'passiva', classe: 'rainha', eixo: 'economia',
    valores: [12, 20, 27],
  },
  {
    id: 'estomago_amplo', nome: 'Estômago amplo', raridade: 'comum', icone: '🍯',
    descCurta: '+{v}% de fome máxima',
    descLonga: 'A barra de fome da Rainha fica muito maior.',
    categoria: 'passiva', classe: 'rainha', eixo: 'economia',
    valores: [25, 42, 57],
  },
  {
    id: 'porcao_reforcada', nome: 'Porção reforçada', raridade: 'incomum', icone: '🍲',
    descCurta: '+{v} de fome por comida',
    descLonga: 'Cada item entregue mata mais fome (base 8).',
    categoria: 'passiva', classe: 'rainha', eixo: 'economia',
    valores: [2, 3, 4],
  },
  {
    id: 'rainha_eterna', nome: 'Rainha eterna', raridade: 'lendaria', icone: '👑',
    descCurta: 'a Rainha revive 1× com 50%',
    descLonga: 'Na primeira morte, a Rainha renasce com metade da fome e o ninho com metade da vida.',
    categoria: 'passiva', classe: 'rainha', eixo: 'muralha',
    valores: [1],
  },

  // ── Coletora (3) — aplicam à operária que coleta ────────────────
  {
    id: 'passo_leve', nome: 'Passo leve', raridade: 'comum', icone: '🍃',
    descCurta: '+{v}% de velocidade',
    descLonga: 'As operárias-coletoras ficam mais rápidas nas viagens.',
    categoria: 'especializacao', classe: 'coletora', eixo: 'economia',
    valores: [12, 20, 27],
  },
  {
    id: 'mochila', nome: 'Mochila', raridade: 'comum', icone: '🎒',
    descCurta: '+{v} de capacidade de carga',
    descLonga: 'Cada coletora carrega mais recursos por viagem.',
    categoria: 'especializacao', classe: 'coletora', eixo: 'economia',
    valores: [2, 3, 4],
  },
  {
    id: 'faro_apurado', nome: 'Faro apurado', raridade: 'incomum', icone: '👃',
    descCurta: '+{v}px de alcance de detecção',
    descLonga: 'As coletoras enxergam recursos mais longe (base 150px).',
    categoria: 'especializacao', classe: 'coletora', eixo: 'economia',
    valores: [40, 70, 95],
  },

  // ── Soldado (3) ─────────────────────────────────────────────────
  {
    id: 'mandibulas_afiadas', nome: 'Mandíbulas afiadas', raridade: 'comum', icone: '⚔️',
    descCurta: '+{v} de dano',
    descLonga: 'Cada mordida de soldado machuca muito mais.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [4, 7, 9],
  },
  {
    id: 'couraca', nome: 'Couraça', raridade: 'comum', icone: '🪖',
    descCurta: '+{v} HP',
    descLonga: 'Soldados nascem com vida extra; os vivos também ganham.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [15, 26, 35],
  },
  {
    id: 'instinto_caca', nome: 'Instinto de caça', raridade: 'incomum', icone: '🎯',
    descCurta: '+{v}px de alcance de agressão',
    descLonga: 'Soldados engajam inimigos de mais longe (base 280px).',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [50, 85, 115],
  },
];
