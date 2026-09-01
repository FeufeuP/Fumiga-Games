/**
 * Fase 5B — as 48 cartas restantes (doc 03 §3):
 * Colônia +2 · Rainha +3 · Operária 5 · Coletora +3 · Exploradora 6 ·
 * Soldado +4 · Defensora 5 · Tóxica 6 · Gigante 6 · Comportamentos 8.
 * Cartas de classe bloqueada carregam `requerClasse` e ficam fora do
 * sorteio até a Fase 6 desbloquear as classes.
 */
import type { CardDef } from './cards';

export const DECK_5B: readonly CardDef[] = [
  // ── Colônia (2) ─────────────────────────────────────────────────
  {
    id: 'colonia_unida', nome: 'Colônia unida', raridade: 'epica', icone: '🔗',
    descCurta: 'formigas juntas ganham +{v}% em tudo',
    descLonga: 'Formigas a até 80px de outra formiga ganham bônus em velocidade, dano e XP.',
    categoria: 'passiva', classe: 'colonia', eixo: 'enxame',
    valores: [15, 20],
  },
  {
    id: 'mente_colmeia', nome: 'Mente-colmeia', raridade: 'lendaria', icone: '🧠',
    descCurta: '+1 slot de especialização e +{v}% em tudo',
    descLonga: 'A colônia pensa como uma só: mais espaço de build e tudo melhora junto.',
    categoria: 'passiva', classe: 'colonia', eixo: 'enxame',
    valores: [10],
  },

  // ── Rainha (3) ──────────────────────────────────────────────────
  {
    id: 'postura_acelerada', nome: 'Postura acelerada', raridade: 'incomum', icone: '⏩',
    descCurta: '−{v}% no tempo de produção de ovos',
    descLonga: 'A Rainha põe ovos mais rápido (base: um ovo a cada 45s).',
    categoria: 'passiva', classe: 'rainha', eixo: 'enxame',
    valores: [15, 25, 33],
  },
  {
    id: 'ninhada_dupla', nome: 'Ninhada dupla', raridade: 'rara', icone: '🐣',
    descCurta: '{v}% de chance de nascerem 2 formigas',
    descLonga: 'Cada ovo pode eclodir em duas formigas de uma vez.',
    categoria: 'passiva', classe: 'rainha', eixo: 'enxame',
    valores: [15, 25],
  },
  {
    id: 'saciedade_duradoura', nome: 'Saciedade duradoura', raridade: 'rara', icone: '😋',
    descCurta: '{v}s de imunidade à fome após comer',
    descLonga: 'Depois de cada refeição a Rainha para de sentir fome por um tempo.',
    categoria: 'passiva', classe: 'rainha', eixo: 'economia',
    valores: [20, 30],
  },

  // ── Operária (5) ────────────────────────────────────────────────
  {
    id: 'carregadora', nome: 'Carregadora', raridade: 'comum', icone: '💪',
    descCurta: '+{v} comida por viagem ao depositar',
    descLonga: 'Cada entrega no ninho rende itens extras de comida.',
    categoria: 'especializacao', classe: 'operaria', eixo: 'economia',
    valores: [1, 2, 3],
  },
  {
    id: 'passo_interno', nome: 'Passo interno', raridade: 'comum', icone: '🏠',
    descCurta: '+{v}% de velocidade perto do ninho',
    descLonga: 'Operárias aceleram num raio de 180px do formigueiro.',
    categoria: 'especializacao', classe: 'operaria', eixo: 'economia',
    valores: [20, 34, 46],
  },
  {
    id: 'maos_habeis', nome: 'Mãos hábeis', raridade: 'incomum', icone: '🛠️',
    descCurta: '+{v} HP/s no reparo do ninho',
    descLonga: 'As operárias consertam o formigueiro mais depressa.',
    categoria: 'especializacao', classe: 'operaria', eixo: 'muralha',
    valores: [5, 8, 11],
  },
  {
    id: 'turno_extra', nome: 'Turno extra', raridade: 'incomum', icone: '🕓',
    descCurta: '+{v} operárias máximas na população',
    descLonga: 'Aumenta o teto de operárias compráveis na loja.',
    categoria: 'especializacao', classe: 'operaria', eixo: 'enxame',
    valores: [2, 3],
  },
  {
    id: 'engenheiras', nome: 'Engenheiras', raridade: 'rara', icone: '👷',
    descCurta: 'o ninho regenera mesmo em combate',
    descLonga: 'A regeneração natural do ninho não para quando há inimigos por perto.',
    categoria: 'especializacao', classe: 'operaria', eixo: 'muralha',
    valores: [1],
  },

  // ── Coletora (3) ────────────────────────────────────────────────
  {
    id: 'colheita_farta', nome: 'Colheita farta', raridade: 'incomum', icone: '🌾',
    descCurta: '{v}% de chance de recurso extra',
    descLonga: 'Ao depositar, pode vir um item bônus (além da sorte da loja).',
    categoria: 'especializacao', classe: 'coletora', eixo: 'economia',
    valores: [15, 25, 33],
  },
  {
    id: 'instinto_retorno', nome: 'Instinto de retorno', raridade: 'rara', icone: '🏃',
    descCurta: 'fogem ao ninho com inimigo a {v}px',
    descLonga: 'Coletoras sentem o perigo e voltam para casa antes de serem atingidas.',
    categoria: 'especializacao', classe: 'coletora', eixo: 'economia',
    valores: [130, 180],
  },
  {
    id: 'casca_dura', nome: 'Casca dura', raridade: 'rara', icone: '🪵',
    descCurta: '+{v} HP e imunes a lentidão',
    descLonga: 'Coletoras ficam mais resistentes a golpes.',
    categoria: 'especializacao', classe: 'coletora', eixo: 'muralha',
    valores: [20, 32],
  },

  // ── Exploradora (6) ─────────────────────────────────────────────
  {
    id: 'olhos_largos', nome: 'Olhos largos', raridade: 'comum', icone: '👁️',
    descCurta: '+{v}px de raio de revelação',
    descLonga: 'Exploradoras revelam a névoa num círculo maior (base 96px).',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [30, 52, 70],
  },
  {
    id: 'pernas_longas', nome: 'Pernas longas', raridade: 'comum', icone: '🦵',
    descCurta: '+{v}% de velocidade',
    descLonga: 'Exploradoras cobrem o mapa muito mais rápido.',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [15, 25, 34],
  },
  {
    id: 'sentido_recurso', nome: 'Sentido de recurso', raridade: 'incomum', icone: '🧭',
    descCurta: 'acham recursos na área revelada',
    descLonga: 'Coletoras enxergam recursos em qualquer ponto já revelado do mapa.',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [1],
  },
  {
    id: 'mapeadoras', nome: 'Mapeadoras', raridade: 'incomum', icone: '🗺️',
    descCurta: '+{v}% de visão passiva do bando',
    descLonga: 'Todas as formigas mantêm o mapa revelado num raio maior.',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [50, 80],
  },
  {
    id: 'cacadora_tesouros', nome: 'Caçadora de tesouros', raridade: 'rara', icone: '🔎',
    descCurta: '+{v}% de chance de baú no mapa',
    descLonga: 'Aparecem mais baús de exploração pelo mundo.',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [10, 17],
  },
  {
    id: 'vanguarda', nome: 'Vanguarda', raridade: 'epica', icone: '🚩',
    descCurta: '+{v} XP por 1% de mapa revelado',
    descLonga: 'Explorar território novo rende XP direto para a colônia.',
    categoria: 'especializacao', classe: 'exploradora', eixo: 'exploracao',
    valores: [15, 25],
  },

  // ── Soldado (4) ─────────────────────────────────────────────────
  {
    id: 'golpe_preciso', nome: 'Golpe preciso', raridade: 'incomum', icone: '🎯',
    descCurta: '+{v}% de chance crítica',
    descLonga: 'Soldados acertam pontos vitais com mais frequência.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [10, 17, 23],
  },
  {
    id: 'coletor_quitina', nome: 'Coletor de quitina', raridade: 'rara', icone: '🦴',
    descCurta: '+{v} quitina extra por chefe',
    descLonga: 'Chefes derrotados largam mais quitina (recurso das classes futuras).',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [1, 2],
  },
  {
    id: 'provocacao', nome: 'Provocação', raridade: 'rara', icone: '📢',
    descCurta: 'inimigos a {v}px perseguem soldados',
    descLonga: 'Soldados gritam e puxam os inimigos para longe do ninho.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [150, 220],
  },
  {
    id: 'furia_colonia', nome: 'Fúria da colônia', raridade: 'epica', icone: '🔥',
    descCurta: '+{v}% de dano por formiga viva',
    descLonga: 'Cada formiga viva enraivece as outras (teto de 45%/60%).',
    categoria: 'especializacao', classe: 'soldado', eixo: 'agressao',
    valores: [3, 4],
  },

  // ── Defensora (5) — requer classe (Fase 6) ──────────────────────
  {
    id: 'anel_ampliado', nome: 'Anel ampliado', raridade: 'comum', icone: '⭕',
    descCurta: '+{v}px de raio do anel',
    descLonga: 'O anel de defesa ao redor do ninho fica maior.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [30, 52, 70], requerClasse: 'defensora',
  },
  {
    id: 'escudo_reforcado', nome: 'Escudo reforçado', raridade: 'comum', icone: '🛡️',
    descCurta: '+{v} de armadura',
    descLonga: 'Defensoras absorvem ainda mais dano.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [5, 8, 11], requerClasse: 'defensora',
  },
  {
    id: 'interceptacao', nome: 'Interceptação', raridade: 'incomum', icone: '✂️',
    descCurta: '+{v} alvos simultâneos',
    descLonga: 'Cada defensora cobre mais inimigos ao mesmo tempo.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [2, 3], requerClasse: 'defensora',
  },
  {
    id: 'postura_firme', nome: 'Postura firme', raridade: 'incomum', icone: '🗿',
    descCurta: 'imune a knockback, +{v}% parada',
    descLonga: 'Defensoras não recuam e batem mais forte quando paradas.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [25, 40], requerClasse: 'defensora',
  },
  {
    id: 'recuperacao', nome: 'Recuperação', raridade: 'rara', icone: '💚',
    descCurta: 'regenera {v} HP/s fora de combate',
    descLonga: 'Defensoras se curam quando a área está tranquila.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'muralha',
    valores: [3, 5], requerClasse: 'defensora',
  },

  // ── Tóxica (6) — requer classe (Fase 6) ─────────────────────────
  {
    id: 'acido_concentrado', nome: 'Ácido concentrado', raridade: 'comum', icone: '🧪',
    descCurta: '+{v} de dano do projétil',
    descLonga: 'O jato ácido queima bem mais.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [5, 8, 11], requerClasse: 'toxica',
  },
  {
    id: 'jato_longo', nome: 'Jato longo', raridade: 'comum', icone: '💦',
    descCurta: '+{v}px de alcance',
    descLonga: 'O ácido alcança inimigos mais distantes.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [30, 52, 70], requerClasse: 'toxica',
  },
  {
    id: 'cadencia_rapida', nome: 'Cadência rápida', raridade: 'incomum', icone: '🌀',
    descCurta: '+{v}% de velocidade de disparo',
    descLonga: 'Tóxicicas cospem ácido sem parar.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [20, 34, 46], requerClasse: 'toxica',
  },
  {
    id: 'corrosao_prolongada', nome: 'Corrosão prolongada', raridade: 'incomum', icone: '☠️',
    descCurta: '+{v}s de duração da corrosão',
    descLonga: 'O ácido continua queimando por muito mais tempo.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [2, 3, 4], requerClasse: 'toxica',
  },
  {
    id: 'propagacao', nome: 'Propagação', raridade: 'rara', icone: '🫧',
    descCurta: 'corrosão salta para {v} inimigos',
    descLonga: 'O ácido se espalha entre inimigos próximos.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [1, 2], requerClasse: 'toxica',
  },
  {
    id: 'acido_critico', nome: 'Ácido crítico', raridade: 'rara', icone: '💥',
    descCurta: '{v}% de chance de dano dobrado',
    descLonga: 'O jato às vezes atinge um ponto vital e dobra o dano.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'veneno',
    valores: [15, 25], requerClasse: 'toxica',
  },

  // ── Gigante (6) — requer classe (Fase 6) ────────────────────────
  {
    id: 'massa', nome: 'Massa', raridade: 'comum', icone: '🪨',
    descCurta: '+{v} HP',
    descLonga: 'A Gigante aguenta uma surra monumental.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [50, 85, 115], requerClasse: 'gigante',
  },
  {
    id: 'impacto', nome: 'Impacto', raridade: 'comum', icone: '🔨',
    descCurta: '+{v} de dano',
    descLonga: 'Cada pisada da Gigante esmaga mais.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [6, 10, 14], requerClasse: 'gigante',
  },
  {
    id: 'empurrao', nome: 'Empurrão', raridade: 'incomum', icone: '👆',
    descCurta: '+{v}px de knockback',
    descLonga: 'Inimigos voam mais longe ao serem atingidos.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [20, 34, 46], requerClasse: 'gigante',
  },
  {
    id: 'inabalavel', nome: 'Inabalável', raridade: 'incomum', icone: '🧱',
    descCurta: 'imune a atordoamento e veneno',
    descLonga: 'Nada distrai a Gigante quando ela avança.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [1], requerClasse: 'gigante',
  },
  {
    id: 'onda_choque', nome: 'Onda de choque', raridade: 'rara', icone: '🌊',
    descCurta: 'ataques atingem área de {v}px',
    descLonga: 'Cada golpe da Gigante machuca todos ao redor.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [60, 90], requerClasse: 'gigante',
  },
  {
    id: 'passo_pesado', nome: 'Passo pesado', raridade: 'rara', icone: '👣',
    descCurta: '+{v}% de velocidade',
    descLonga: 'A Gigante deixa de ser lenta.',
    categoria: 'especializacao', classe: 'soldado', eixo: 'peso',
    valores: [25, 40], requerClasse: 'gigante',
  },

  // ── Comportamentos e armas da colônia (8) ───────────────────────
  {
    id: 'enxame_mordidas', nome: 'Enxame de mordidas', raridade: 'incomum', icone: '🐛',
    descCurta: 'a cada 8s, mordida de {v} por formiga',
    descLonga: 'Formigas perto de um inimigo o mordem todas de uma vez.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'agressao',
    valores: [2, 3, 4],
  },
  {
    id: 'espinhos_ninho', nome: 'Espinhos do ninho', raridade: 'incomum', icone: '🦔',
    descCurta: 'quem toca o ninho leva {v} de dano',
    descLonga: 'A casca do formigueiro fura quem ataca.',
    categoria: 'comportamento', classe: 'ninho', eixo: 'muralha',
    valores: [8, 13, 17],
  },
  {
    id: 'armadilha_resina', nome: 'Armadilha de resina', raridade: 'rara', icone: '🪤',
    descCurta: '3 armadilhas prendem 2s (carga {v}s)',
    descLonga: 'Poços de resina ao redor do ninho grudam os inimigos.',
    categoria: 'comportamento', classe: 'ninho', eixo: 'muralha',
    valores: [15, 10],
  },
  {
    id: 'nuvem_feromonio', nome: 'Nuvem de feromônio', raridade: 'rara', icone: '🌫️',
    descCurta: 'zona no ninho: +{v}% velocidade',
    descLonga: 'Uma nuvem ao redor do ninho acelera e fortalece quem passa.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'enxame',
    valores: [20, 30],
  },
  {
    id: 'chuva_acido', nome: 'Chuva de ácido', raridade: 'epica', icone: '🌧️',
    descCurta: 'a cada 20s, {v} de dano no maior grupo',
    descLonga: 'Ácido cai do céu sobre o maior aglomerado de inimigos.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'veneno',
    valores: [10, 16],
  },
  {
    id: 'muralha_defensores', nome: 'Muralha de defensores', raridade: 'epica', icone: '🏰',
    descCurta: 'ninho atacado: 2 guardas por {v}s',
    descLonga: 'Quando o ninho é atingido, guardas temporários surgem para defender.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'muralha',
    valores: [15, 20],
  },
  {
    id: 'investida_gigante', nome: 'Investida gigante', raridade: 'epica', icone: '🦏',
    descCurta: 'a cada 30s, investida causa {v} de dano',
    descLonga: 'Uma gigante espectral avança do ninho e atordoa quem cruza o caminho.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'peso',
    valores: [12, 20],
  },
  {
    id: 'feromonio_furia', nome: 'Feromônio de fúria', raridade: 'lendaria', icone: '😤',
    descCurta: 'ninho <30%: +{v}% de dano na colônia',
    descLonga: 'Com o formigueiro em perigo, todas as formigas enfurecem.',
    categoria: 'comportamento', classe: 'colonia', eixo: 'agressao',
    valores: [50],
  },

  // ── Evoluções (doc 03 §5) — substituem a carta base, sem slot ────
  {
    id: 'evo_legiao_ataque', nome: 'Legião de ataque', raridade: 'lendaria', icone: '⚔️',
    descCurta: 'soldados dividem o dano recebido',
    descLonga: 'Evolução: Mandíbulas afiadas (máx) + Fúria da colônia, nível 8.',
    categoria: 'evolucao', classe: 'soldado', eixo: 'agressao',
    valores: [1],
  },
  {
    id: 'evo_nuvem_acido', nome: 'Nuvem de ácido', raridade: 'lendaria', icone: '☁️',
    descCurta: 'poças se fundem numa nuvem que segue',
    descLonga: 'Evolução: Corrosão prolongada (máx) + Propagação, nível 8.',
    categoria: 'evolucao', classe: 'soldado', eixo: 'veneno',
    valores: [1],
  },
  {
    id: 'evo_muralha_viva', nome: 'Muralha viva', raridade: 'lendaria', icone: '🧱',
    descCurta: 'defensoras formam barreira física',
    descLonga: 'Evolução: Anel ampliado (máx) + Escudo reforçado, nível 8.',
    categoria: 'evolucao', classe: 'soldado', eixo: 'muralha',
    valores: [1],
  },
  {
    id: 'evo_colosso_ninho', nome: 'Colosso do ninho', raridade: 'lendaria', icone: '🗿',
    descCurta: 'investida com dano em linha e atordoa',
    descLonga: 'Evolução: Impacto (máx) + Empurrão, nível 10.',
    categoria: 'evolucao', classe: 'soldado', eixo: 'peso',
    valores: [1],
  },
  {
    id: 'evo_caravana_recursos', nome: 'Caravana de recursos', raridade: 'lendaria', icone: '🐫',
    descCurta: 'coletoras em fila descarregam juntas',
    descLonga: 'Evolução: Mochila (máx) + Passo leve, nível 6.',
    categoria: 'evolucao', classe: 'coletora', eixo: 'economia',
    valores: [1],
  },
  {
    id: 'evo_coracao_dourado', nome: 'Coração dourado', raridade: 'lendaria', icone: '💛',
    descCurta: 'fome ≥80%: ovos não custam comida',
    descLonga: 'Evolução: Porção reforçada (máx) + Ninhada dupla, nível 10.',
    categoria: 'evolucao', classe: 'rainha', eixo: 'enxame',
    valores: [1],
  },
];
