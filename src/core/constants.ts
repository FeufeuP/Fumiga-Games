/**
 * FORMIGUEIRO — src/core/constants.ts
 * ------------------------------------------------------------------
 * Valores EXTRAÍDOS DO JOGO ORIGINAL (Formigueiro.original.html).
 * Fidelidade ao original em primeiro lugar (decisão do usuário, 31/08/2026).
 * Marcação: [O] = valor real do bundle original · [P] = proposto quando o
 * original não expõe o número (velocidades das formigas, por ex.).
 */

// ═══════════════════════════════════════════════════════════════════
// MUNDO E RENDERIZAÇÃO
// ═══════════════════════════════════════════════════════════════════

export const WORLD = {
  VIEWPORT_WIDTH: 960,        // [O] base lógica da HUD
  VIEWPORT_HEIGHT: 720,
  SIM_HZ: 60,                 // [P] delta fixo
  NEST_SPAWN: { x: 0.5, y: 0.52 }, // [O] ninho no centro do mundo
} as const;

export const PALETTE = {
  FUNDO:        '#14120f',
  CONTORNO:     '#14120f',
  TEXTO:        '#f5e6c8',
  DOURADO:      '#fbd046',
  LARANJA:      '#e96520',
  VERMELHO:     '#d94a3b',
  VERDE:        '#55b84b',
  AZUL:         '#63b5dc',
  ROXO:         '#b67ad9',
} as const;

/** [O] recoloração das folhas de sprites (técnica do original) */
export const ANT_RECOLOR = {
  soldier: { a: '#d9413a', b: '#8c1f1f' },  // vermelho
  scout:   { a: '#3fae5a', b: '#1f6b38' },  // verde
} as const;

/** [O] sprite da formiga: 96×96 desenhado a ⅓, âncora (43, 45.5)/3 */
export const ANT_SPRITE = {
  SRC: 96,
  DRAW_BASE: 32,      // âncora referente ao desenho de 32px
  ANCHOR_X: 43 / 3,   // [O] antAnchor (43, 45.5) já em base 32
  ANCHOR_Y: 45.5 / 3,
  FRAMES: 7,
  CARRY_SLOWDOWN: 0.9, // [O] carregando = 10% mais lenta
} as const;

/** [O] tamanhos de desenho extraídos do bundle */
export const SPRITE_DRAW = {
  NEST: 84,             // drawImage(nest,-L,-D,84,P)
  BOSS_W: 0.42,         // isBoss ? scale*.42 : r
  BOSS_PULSE: 0.52,     // halo: scale*(.52+.04·sin(t·3))
  BOSS_PULSE_AMPL: 0.04,
  TREE: 96,             // [P] árvore 56px → 96 no mundo
  STONE_BIG: 64,
  STONE_SMALL: 44,
  LEAF: 28,
  MUSHROOM: 48,
} as const;

export const CAMERA = {
  FOLLOW_LERP: 6,          // [P]
  DEADZONE: 24,            // [P]
  DRAG_THRESHOLD: 8,       // [P] clique curto ainda é clique
  FREE_KEY_SPEED: 420,     // [P]
  NEST_CLICK_RADIUS: 90,   // [P]
} as const;

// ═══════════════════════════════════════════════════════════════════
// FORMIGAS — [O] hp/dano/tamanho do bundle (pb/vb/K0)
// ═══════════════════════════════════════════════════════════════════

export type AntClass = 'worker' | 'soldier' | 'scout';

export const ANTS: Record<AntClass, {
  name: string; icon: string; desc: string;
  hp: number; dmg: number; size: number; speed: number;
}> = {
  // velocidade [O]: base 82 · scout ×1.35 (110.7) · carregando ×0.9
  worker: {
    name: 'Operária', icon: '🐜',
    desc: 'Coleta recursos na área descoberta.',
    hp: 30, dmg: 5, size: 22, speed: 82,
  },
  soldier: {
    name: 'Soldado', icon: '⚔️',
    desc: 'Ataca inimigos próximos na área descoberta.',
    hp: 60, dmg: 10, size: 44, speed: 82,
  },
  scout: {
    name: 'Exploradora', icon: '💨',
    desc: 'Revela a sombra do mapa por onde passa.',
    hp: 28, dmg: 6, size: 20, speed: 82 * 1.35,
  },
} as const;

export const POPULATION = {
  START: { worker: 3, soldier: 1, scout: 1 },   // [P] colônia inicial
  MAX: 60,                                       // [P] teto de segurança
} as const;

export const BEHAVIOR = {
  HARVEST_SEC_PER_UNIT: 0.8,   // [P]
  ARRIVE_RADIUS: 10,
  SEPARATION_RADIUS: 14,
  ATTACK_RANGE_PAD: 6,
  ATTACK_COOLDOWN_SEC: 1,
  SCOUT_REVEAL_CELL: 2,        // [O] exploradora revela 2 células de névoa
  WORKER_DETECT: 150,        // [O] N0 × visionScale
  PICKUP_BASE: 18,           // [O] R0 — alcance de coleta
  RESOURCE_SIZE: {           // [O] Ii — tamanho/peso do recurso
    leaf: 28, mushroom: 40, cactus: 30,
    banana: 30, flower: 28, crystal: 30,  } as Record<ResourceKind, number>,
  SOLDIER_AGGRO: 220,
  FLEE_NONE: 0,
} as const;

// ═══════════════════════════════════════════════════════════════════
// NÉVOA — célula de 48px [O we=48]
// ═══════════════════════════════════════════════════════════════════

export const FOG = {
  CELL: 48,
  SCOUT_RADIUS: 96,     // [O] fogCell × 2
  PASSIVE_RADIUS: 48,   // [O] fogCell × 1
  NEST_RADIUS: 144,     // [O] fogCell × 3
} as const;

// ═══════════════════════════════════════════════════════════════════
// RAINHA — [O] qn/yl/ub/rb/i0/cb/s0 do bundle
// ═══════════════════════════════════════════════════════════════════

export const QUEEN = {
  HUNGER_MAX: 100,      // [O] yl
  HUNGER_DRAIN: 1 / 3,  // [O] ub — esvazia em 300s
  HUNGER_PER_ITEM: 8,   // [O] rb
  FEED_UNTIL: 90,       // [O] i0
  FEED_INTERVAL_SEC: 3, // [O] cb — por operária
  WARN_AT: 30,          // [O] s0 — "A rainha está com fome!"
  WARN_CRITICAL_AT: 10, // [O] — "A rainha está FAMINTA!"
} as const;

/** [O] ordem em que a Rainha come os recursos (takeFoodItem) */
export const FOOD_ORDER = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'] as const;

// ═══════════════════════════════════════════════════════════════════
// NINHO — [O] qn/FA/QA
// ═══════════════════════════════════════════════════════════════════

export const NEST = {
  HP_MAX: 400,            // [O] qn
  HP_PER_UPGRADE: 100,    // [O] Er
  REGEN_PER_SEC: 1.2,     // [O] FA — sem inimigo por perto
  REGEN_ENEMY_RADIUS: 320,// [O] enemyNearNest(320)
  REPAIR_PER_WORKER: 10,  // [O] QA — por operária, com ninho destruído
  MOUND_RADIUS: 110,      // [P] raio de clique/desenho
} as const;

// ═══════════════════════════════════════════════════════════════════
// XP E NÍVEIS — [O] depósito = 3(+xpboost) · nível n = 50+25(n−1)
// ═══════════════════════════════════════════════════════════════════

export const XP = {
  PER_DEPOSIT: 3,           // [O]
  PER_ENEMY_BASE: 8,        // [O] por espécie (ver ENEMIES.xp), ×poder da onda
  WAVE_REWARD_BASE: 15,     // [O]
  WAVE_REWARD_PER: 5,       // [O]
} as const;

/** [O] 50+25(n−1) */
export const xpToNextLevel = (level: number): number => 50 + 25 * (level - 1);

/** nível total dado o XP acumulado [O qa] */
export function levelFromXp(xp: number): number {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return level;
}

// ═══════════════════════════════════════════════════════════════════
// ONDAS — [O] Tr=20 · LA=90 · U0=2 · ZA=15 · poder min(0,5·1,1^(n−1), 3)
// ═══════════════════════════════════════════════════════════════════

export const WAVES = {
  COMBAT_SEC: 20,        // [O] Tr
  CALM_SEC: 90,          // [O] LA
  BATCH_SIZE: 2,         // [O] U0 — spawnam 2 por vez
  BOSS_EVERY: 15,        // [O] ZA — chefe a cada 15 ondas
  BOSS_ESCORTS: 2,       // [O] chefe + 2 escoltas a 0,5
  BOSS_ESCORT_POWER: 0.5,// [O]
  MAX_CONCURRENT: 100,   // [O] CA
  COUNT_PER_WAVE: (n: number): number => 2 * n,                    // [O]
  POWER: (n: number): number => Math.min(0.5 * Math.pow(1.1, n - 1), 3), // [O]
  REWARD_LEAVES: (n: number): number => 3 + 2 * n,                 // [O]
  NEST_HEAL_FRAC: 0.2,   // [O] ninho recupera 20% ao repelir onda
} as const;

// ═══════════════════════════════════════════════════════════════════
// INIMIGOS — [O] tabela Ur completa do bundle
// ═══════════════════════════════════════════════════════════════════

export type EnemyKind =
  | 'mosquito' | 'wasp' | 'caterpillar' | 'hornet' | 'spider' | 'slug'
  | 'scorpion' | 'beetle' | 'moth' | 'mantis' | 'centipede' | 'antlion';

export interface EnemyStats {
  name: string; icon: string;
  hp: number; damage: number; speed: number;
  aggro: number; r: number; scale: number; xp: number;
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  mosquito:    { name: 'Mosquito',       icon: '🦟', hp: 60,  damage: 4,  speed: 62, aggro: 170, r: 70,  scale: 110, xp: 8 },
  wasp:        { name: 'Vespa',          icon: '🐝', hp: 70,  damage: 8,  speed: 80, aggro: 200, r: 60,  scale: 110, xp: 14 },
  caterpillar: { name: 'Lagarta',        icon: '🐛', hp: 80,  damage: 5,  speed: 20, aggro: 120, r: 80,  scale: 170, xp: 9 },
  hornet:      { name: 'Marimbondo',     icon: '🐝', hp: 90,  damage: 9,  speed: 70, aggro: 210, r: 65,  scale: 120, xp: 15 },
  spider:      { name: 'Aranha',         icon: '🕷️', hp: 100, damage: 6,  speed: 26, aggro: 150, r: 100, scale: 200, xp: 10 },
  slug:        { name: 'Lesma',          icon: '🐌', hp: 120, damage: 8,  speed: 15, aggro: 120, r: 85,  scale: 200, xp: 16 },
  scorpion:    { name: 'Escorpião',      icon: '🦂', hp: 140, damage: 9,  speed: 24, aggro: 160, r: 100, scale: 220, xp: 18 },
  beetle:      { name: 'Besouro',        icon: '🪲', hp: 160, damage: 7,  speed: 18, aggro: 130, r: 90,  scale: 170, xp: 16 },
  moth:        { name: 'Mariposa',       icon: '🦋', hp: 160, damage: 12, speed: 60, aggro: 200, r: 90,  scale: 210, xp: 22 },
  mantis:      { name: 'Louva-a-deus',   icon: '🦗', hp: 200, damage: 11, speed: 30, aggro: 180, r: 110, scale: 240, xp: 24 },
  centipede:   { name: 'Lacraia',        icon: '🪱', hp: 240, damage: 14, speed: 34, aggro: 190, r: 110, scale: 260, xp: 28 },
  antlion:     { name: 'Formiga-leão',   icon: '🦁', hp: 300, damage: 12, speed: 14, aggro: 200, r: 130, scale: 290, xp: 30 },
} as const;

// ═══════════════════════════════════════════════════════════════════
// MAPAS — [O] configuração Tt completa do bundle
// ═══════════════════════════════════════════════════════════════════

export type MapId = 'campo' | 'pantano' | 'deserto' | 'montanha' | 'caverna' | 'selva';
export type ResourceKind = 'leaf' | 'mushroom' | 'cactus' | 'banana' | 'flower' | 'crystal';

export interface MapConfig {
  name: string; icon: string; unlockHint: string;
  ground: string; groundAlt: string;
  world: { w: number; h: number };
  resource: ResourceKind; resourceCount: number;
  enemies: ReadonlyArray<{ kind: EnemyKind; count: number }>;
  boss: { name: string; kind: EnemyKind; hp: number; damage: number; speed: number; aggro: number; r: number; scale: number; xp: number; drops: Partial<Record<ResourceKind, number>> };
  scenery: { pools: number; motes: number; trees: number; stones: number; grass: number; flowers: number };
  seed: number;
}

export const MAPS: Record<MapId, MapConfig> = {
  campo: {
    name: 'Campo', icon: '🌾', unlockHint: 'Disponível desde o início',
    ground: '#59a04c', groundAlt: '#4c8f41',
    world: { w: 3400, h: 2400 },
    resource: 'leaf', resourceCount: 100,
    enemies: [
      { kind: 'spider', count: 7 }, { kind: 'caterpillar', count: 5 },
      { kind: 'beetle', count: 4 }, { kind: 'wasp', count: 3 },
      { kind: 'antlion', count: 1 },
    ],
    boss: { name: 'Formiga Vermelha Rei', kind: 'antlion', hp: 1500, damage: 18, speed: 16, aggro: 300, r: 136, scale: 800, xp: 120, drops: { leaf: 30 } },
    scenery: { pools: 0, motes: 46, trees: 18, stones: 18, grass: 220, flowers: 50 },
    seed: 1234,
  },
  pantano: {
    name: 'Pântano', icon: '🐸', unlockHint: 'Explore 30% do Campo',
    ground: '#4d7a5a', groundAlt: '#43684f',
    world: { w: 3400, h: 2400 },
    resource: 'mushroom', resourceCount: 90,
    enemies: [
      { kind: 'mosquito', count: 7 }, { kind: 'caterpillar', count: 5 },
      { kind: 'wasp', count: 4 }, { kind: 'beetle', count: 3 },
      { kind: 'hornet', count: 3 }, { kind: 'antlion', count: 1 },
    ],
    boss: { name: 'Rainha dos Mosquitos', kind: 'mosquito', hp: 2100, damage: 17, speed: 46, aggro: 320, r: 112, scale: 580, xp: 150, drops: { mushroom: 25 } },
    scenery: { pools: 9, motes: 30, trees: 32, stones: 12, grass: 120, flowers: 16 },
    seed: 9876,
  },
  deserto: {
    name: 'Deserto', icon: '🏜️', unlockHint: 'Explore 40% do Pântano',
    ground: '#d9b55c', groundAlt: '#c8a34a',
    world: { w: 3600, h: 2600 },
    resource: 'cactus', resourceCount: 80,
    enemies: [
      { kind: 'scorpion', count: 6 }, { kind: 'beetle', count: 4 },
      { kind: 'wasp', count: 3 }, { kind: 'spider', count: 4 },
      { kind: 'mantis', count: 2 }, { kind: 'antlion', count: 1 },
    ],
    boss: { name: 'Escorpião Imperador', kind: 'scorpion', hp: 2800, damage: 22, speed: 22, aggro: 340, r: 144, scale: 820, xp: 180, drops: { cactus: 20 } },
    scenery: { pools: 0, motes: 26, trees: 0, stones: 30, grass: 60, flowers: 8 },
    seed: 3333,
  },
  montanha: {
    name: 'Montanha', icon: '⛰️', unlockHint: 'Explore 50% do Deserto',
    ground: '#7d837d', groundAlt: '#6c726c',
    world: { w: 3600, h: 2600 },
    resource: 'flower', resourceCount: 80,
    enemies: [
      { kind: 'mantis', count: 6 }, { kind: 'scorpion', count: 3 },
      { kind: 'hornet', count: 4 }, { kind: 'beetle', count: 3 },
      { kind: 'antlion', count: 2 },
    ],
    boss: { name: 'Rei Louva-a-Deus', kind: 'mantis', hp: 3800, damage: 26, speed: 26, aggro: 360, r: 152, scale: 860, xp: 220, drops: { flower: 20 } },
    scenery: { pools: 2, motes: 34, trees: 22, stones: 30, grass: 40, flowers: 12 },
    seed: 4444,
  },
  caverna: {
    name: 'Caverna', icon: '⛏️', unlockHint: 'Explore 60% da Montanha',
    ground: '#3a2f35', groundAlt: '#2f262b',
    world: { w: 3800, h: 2800 },
    resource: 'crystal', resourceCount: 90,
    enemies: [
      { kind: 'centipede', count: 6 }, { kind: 'scorpion', count: 4 },
      { kind: 'spider', count: 4 }, { kind: 'beetle', count: 3 },
      { kind: 'mantis', count: 2 }, { kind: 'antlion', count: 1 },
    ],
    boss: { name: 'Rainha Lacraia', kind: 'centipede', hp: 4200, damage: 28, speed: 26, aggro: 360, r: 160, scale: 900, xp: 240, drops: { crystal: 25 } },
    scenery: { pools: 1, motes: 20, trees: 10, stones: 36, grass: 20, flowers: 4 },
    seed: 5555,
  },
  selva: {
    name: 'Selva', icon: '🌴', unlockHint: 'Explore 70% da Caverna',
    ground: '#2e7d32', groundAlt: '#256428',
    world: { w: 4000, h: 3000 },
    resource: 'banana', resourceCount: 80,
    enemies: [
      { kind: 'moth', count: 6 }, { kind: 'slug', count: 5 },
      { kind: 'spider', count: 4 }, { kind: 'wasp', count: 4 },
      { kind: 'mantis', count: 2 }, { kind: 'hornet', count: 2 },
      { kind: 'antlion', count: 1 },
    ],
    boss: { name: 'Mariposa Tita', kind: 'moth', hp: 5200, damage: 30, speed: 30, aggro: 380, r: 168, scale: 920, xp: 280, drops: { banana: 20 } },
    scenery: { pools: 2, motes: 40, trees: 60, stones: 18, grass: 200, flowers: 30 },
    seed: 6666,
  },
};

/** [O] ordem de desbloqueio + % de exploração exigida (Ab) */
export const MAP_UNLOCK: Record<MapId, { next: MapId; pct: number }> = {
  campo:    { next: 'pantano', pct: 30 },
  pantano:  { next: 'deserto', pct: 40 },
  deserto:  { next: 'montanha', pct: 50 },
  montanha: { next: 'caverna', pct: 60 },
  caverna:  { next: 'selva', pct: 70 },
  selva:    { next: 'selva', pct: 100 },
};

export const RESOURCES: Record<ResourceKind, { name: string; icon: string; food: number }> = {
  leaf:     { name: 'Folha',   icon: '🍃', food: 2 },
  mushroom: { name: 'Cogumelo',icon: '🍄', food: 2 },
  cactus:   { name: 'Cacto',   icon: '🌵', food: 2 },
  banana:   { name: 'Banana',  icon: '🍌', food: 3 },
  flower:   { name: 'Flor',    icon: '🌸', food: 2 },
  crystal:  { name: 'Cristal', icon: '💎', food: 3 },
} as const;

// ═══════════════════════════════════════════════════════════════════
// LOJA — [O] grade Yr completa (16 melhorias, 4 categorias)
// ═══════════════════════════════════════════════════════════════════

export type UpgradeCategory = 'coleta' | 'ataque' | 'defesa' | 'niveis';

export interface UpgradeDef {
  id: string;
  category: UpgradeCategory;
  icon: string;
  name: string;
  desc: string;
  cost: { kind: ResourceKind; amount: number };
  max: number;          // Infinity para dinâmicos
  step?: number;        // acréscimo de custo por compra (dinâmicos)
  multiCost?: boolean;  // custo multi-recurso (nesthp) — ver nesthpCost()
}

export const UPGRADES: ReadonlyArray<UpgradeDef> = [
  { id: 'antlimit',  category: 'coleta',  icon: '🐜', name: '+5 Operárias',       desc: 'Recruta 5 operárias para a colônia (preço cresce a cada compra).', cost: { kind: 'leaf', amount: 15 },     max: Infinity, step: 10 },
  { id: 'soldier',   category: 'ataque',  icon: '⚔️', name: '+5 Soldados',        desc: 'Recruta 5 soldados para defender a colônia (preço cresce a cada compra).', cost: { kind: 'mushroom', amount: 25 }, max: Infinity, step: 15 },
  { id: 'scout',     category: 'coleta',  icon: '💨', name: '+5 Exploradoras',   desc: 'Recruta 5 exploradoras rápidas (preço cresce a cada compra).',   cost: { kind: 'leaf', amount: 25 },     max: Infinity, step: 15 },
  { id: 'speed',     category: 'coleta',  icon: '⚡', name: '+10% Velocidade',   desc: 'Todas as formigas se movem mais rápido.',                        cost: { kind: 'leaf', amount: 30 },     max: 8 },
  { id: 'capacity',  category: 'coleta',  icon: '🎒', name: '+1 Carga',          desc: 'As formigas carregam mais recursos por vez.',                    cost: { kind: 'leaf', amount: 25 },     max: 3 },
  { id: 'vision',    category: 'coleta',  icon: '👁️', name: '+15% Visão',       desc: 'As formigas enxergam recursos e inimigos mais longe.',           cost: { kind: 'leaf', amount: 15 },     max: 8 },
  { id: 'luck',      category: 'coleta',  icon: '🍀', name: 'Sorte',             desc: 'Chance de recurso extra a cada coleta.',                         cost: { kind: 'leaf', amount: 15 },     max: 8 },
  { id: 'strength',  category: 'ataque',  icon: '💪', name: '+10% Força',        desc: 'Formigas causam mais dano.',                                     cost: { kind: 'mushroom', amount: 40 }, max: 8 },
  { id: 'attackspeed', category: 'ataque', icon: '⚔️', name: '+15% Ataque',     desc: 'Formigas atacam mais rápido.',                                   cost: { kind: 'mushroom', amount: 35 }, max: 6 },
  { id: 'crit',      category: 'ataque',  icon: '💥', name: '+10% Crítico',     desc: 'Chance de dano crítico em dobro.',                               cost: { kind: 'mushroom', amount: 25 }, max: 8 },
  { id: 'critdmg',   category: 'ataque',  icon: '💢', name: '+50% Crítico',     desc: 'Dano crítico ainda maior.',                                      cost: { kind: 'mushroom', amount: 20 }, max: 6 },
  { id: 'armor',     category: 'defesa',  icon: '🛡️', name: '−10% Dano',       desc: 'Formigas recebem menos dano.',                                   cost: { kind: 'cactus', amount: 20 },   max: 8 },
  { id: 'hpboost',   category: 'defesa',  icon: '❤️', name: '+15% Vida',       desc: 'Formigas têm mais vida.',                                        cost: { kind: 'cactus', amount: 20 },   max: 8 },
  { id: 'heal',      category: 'defesa',  icon: '💚', name: 'Regeneração',      desc: 'Formigas recuperam vida com o tempo.',                           cost: { kind: 'cactus', amount: 15 },   max: 5 },
  { id: 'respawn',   category: 'defesa',  icon: '♻️', name: 'Renascer Rápido',  desc: 'Formigas renascem mais rápido após morrer.',                     cost: { kind: 'cactus', amount: 20 },   max: 5 },
  { id: 'xpboost',   category: 'niveis',  icon: '⭐', name: '+1 XP',            desc: 'Cada recurso entregue vale mais XP.',                            cost: { kind: 'banana', amount: 12 },   max: 8 },
];

/** [O] custo atual: amount + step × compras (dinâmicos) */
export function upgradeCost(def: UpgradeDef, bought: number): { kind: ResourceKind; amount: number } {
  return {
    kind: def.cost.kind,
    amount: def.cost.amount + (def.step ?? 0) * bought,
  };
}

/** [O] ob(l): custo MULTI-recurso do nesthp — nível l usa tipos f0[0..l], 20+(l+1−i)×10 cada */
export function nesthpCost(bought: number): Array<{ kind: ResourceKind; amount: number }> {
  const l = bought + 1;
  const n = Math.min(l, FOOD_ORDER.length);
  const out: Array<{ kind: ResourceKind; amount: number }> = [];
  for (let i = 0; i < n; i++) {
    out.push({ kind: FOOD_ORDER[i] as ResourceKind, amount: 20 + (l - i) * 10 });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// ECONOMIA / SAVE / MOTOR
// ═══════════════════════════════════════════════════════════════════

export const ECONOMY = {
  START_RESOURCES: { leaf: 10 } as Partial<Record<ResourceKind, number>>, // [P] estoque inicial
  LUCK_BONUS_CHANCE: 0.1, // [O] 10% × nível de sorte por item depositado
} as const;

export const SAVE = {
  VERSION: 3,
  KEY: 'formigueiro_save_v2',
  DEBOUNCE_MS: 5000,
  PERIODIC_MS: 30000,
  USE_CHECKSUM: true,
} as const;

export const ENGINE = {
  MAX_FRAME_SEC: 0.25,
  MAX_STEPS_PER_FRAME: 8,
  HUD_PUBLISH_HZ: 8,
  FOG_ACTIVE_HZ: 4,
  SEPARATION_EVERY_STEPS: 3,
  TOAST_SEC: 5,
  SPATIAL_CELL: 64,
} as const;

export const APP = {
  NAME: 'FORMIGUEIRO',
  SUBTITLE: 'Jogo de colônia, exploração e sobrevivência',
} as const;

// ═══════════════════════════════════════════════════════════════════
// CICLO A — sistemas [O] extraídos do bundle
// ═══════════════════════════════════════════════════════════════════

/** [O] Rally — botões ATACAR!/COLETA! do HUD */
export const RALLY = {
  ATTACK_BUFF_SEC: 6,     // soldados: cooldown de ataque ×0.55
  ATTACK_CD_SEC: 20,
  ATTACK_SPEED_MULT: 0.55,
  COLLECT_BUFF_SEC: 8,    // operárias: velocidade ×1.6
  COLLECT_CD_SEC: 25,
  COLLECT_SPEED_MULT: 1.6,
} as const;

/** [O] bossSmash — golpe em área do chefe (após o 1º dano recebido) */
export const BOSS_SMASH = {
  FIRST_INTERVAL_SEC: 15,   // bossThrowT inicial
  INTERVAL_SEC: 15,
  RADIUS: 90,               // formigas atingidas
  KNOCKBACK_MIN: 300,
  KNOCKBACK_RANGE: 80,
  KNOCKUP_MIN: 260,
  KNOCKUP_RANGE: 90,
  RING_SEC: 0.5,            // efeito visual
} as const;

/** [O] bossAggroT — barra do chefe só aparece 4s após dano */
export const BOSS = {
  AGGRO_SEC: 4,
} as const;

/** [O] killAnt — morte derruba a carga e entra na fila do cemitério */
export const ANT_RESPAWN = {
  BASE_SEC: 15,           // YA
  PER_LEVEL_MULT: 0.3,    // −30% por nível de "Renascer Rápido"
  MIN_SEC: 3,
} as const;

/** [O] regeneração de recursos (a cada 0.8s, até 2 por tipo) */
export const RESOURCE_REGEN = {
  INTERVAL_SEC: 0.8,      // EA
  MAX_PER_TICK: 2,
  FACTOR_MIN: 0.15,       // exploredFactor = clamp(pct, 15%, 100%)
} as const;

/** [O] At(r) — bônus permanentes por renascimento */
export const REBIRTH_BONUS = {
  SPEED_PCT: 12,
  VISION_PCT: 12,
  CAPACITY: 1,
  DAMAGE_PCT: 10,
  HP_PCT: 15,
  XP_PCT: 20,
} as const;

/** [O] placar: missões×100 + renascimentos×200 */
export const SCORE = {
  PER_MISSION: 100,
  PER_REBIRTH: 200,
} as const;
