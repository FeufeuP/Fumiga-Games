/**
 * FORMIGUEIRO — src/core/constants.ts (proposta)
 * ------------------------------------------------------------------
 * TODO número de balanceamento do jogo vive aqui. Nenhum literal mágico
 * espalhado pelos sistemas. Ajustar o jogo = editar este arquivo.
 *
 * Fonte: Dossie_Perfeito_Melhorado.md + docs/02_BALANCEAMENTO.md
 * Marcação:  [D] = definido no dossiê   [P] = proposto (simulado)
 */

// ═══════════════════════════════════════════════════════════════════
// MUNDO E RENDERIZAÇÃO
// ═══════════════════════════════════════════════════════════════════

export const WORLD = {
  LOGICAL_WIDTH: 960,        // [D] Parte 3
  LOGICAL_HEIGHT: 720,       // [D]
  TILE: 32,                  // [P] unidade base
  NEST_SPAWN: { x: 0.50, y: 0.72 }, // [D] Parte 3.2, normalizado
  SIM_HZ: 60,                // [P] delta fixo da simulação
} as const;

export const PALETTE = {                 // [D] Parte 2.2
  FUNDO:        '#1c1d24',
  TERRA_ESCURA: '#29170f',
  TERRA_MEDIA:  '#5d341e',
  TERRA_CLARA:  '#8b562d',
  CONTORNO:     '#14120f',
  TEXTO:        '#f5e6c8',
  DOURADO:      '#fbd046',
  LARANJA:      '#e96520',
  VERMELHO:     '#d94a3b',
  VERDE:        '#55b84b',
  AZUL:         '#63b5dc',
  ROXO:         '#b67ad9',
} as const;

export const RARITY_COLORS = {           // [D] Parte 11.17
  comum:    '#8d8d8d',
  incomum:  '#5ab85a',
  rara:     '#4b9ee8',
  epica:    '#a767df',
  lendaria: '#f0ad36',
} as const;

// ═══════════════════════════════════════════════════════════════════
// RAINHA — lacuna L1
// ═══════════════════════════════════════════════════════════════════

export const QUEEN = {
  HP_MAX: 500,               // [D] Parte 4.6
  SPRITE: 96,                // [D] Parte 12.8

  HUNGER_MAX: 100,           // [P]
  HUNGER_DRAIN: 1.0,         // [P] /s → esvazia em 100s
  FOOD_TO_HUNGER: 5,         // [P] 1 comida = 5 fome → 0,20 comida/s

  // Limiares de estado (fração de HUNGER_MAX)
  SATED_AT: 0.70,            // [P] +10% produção
  HUNGRY_AT: 0.30,           // [P] +50% tempo de produção
  CRITICAL_AT: 0.10,         // [P] produção parada, 1 HP/s

  DMG_CRITICAL: 1,           // [P] HP/s na faixa crítica
  DMG_STARVING: 3,           // [P] HP/s com fome zerada
  PROD_BONUS_SATED: 0.10,    // [P]
  PROD_PENALTY_HUNGRY: 0.50, // [P]
} as const;

export const PRODUCTION = {              // [P] lacuna L1
  EGG_MS: 6000,
  LARVA_MS: 8000,
  PUPA_MS: 6000,
  TOTAL_MS: 20000,           // fila SERIAL, 1 formiga por vez
  QUEUE_MAX: 5,
} as const;

// ═══════════════════════════════════════════════════════════════════
// FORMIGAS — [D] Parte 4 · velocidades/alcances [P] lacuna L4
// ═══════════════════════════════════════════════════════════════════

export const ANTS = {
  worker: {
    hp: 30, dmg: 5, size: 22, sprite: 32,
    speed: 50, detect: 80, aggro: 0, attackRange: 20,
    attacksPerSec: 0.8, windupMs: 200,
    costFood: 8, costChitin: 0, unlocked: true,
    repairPerSec: 10,                                   // [D] Parte 4.1
  },
  collector: {
    hp: 30, dmg: 5, size: 32, sprite: 32,
    speed: 55, detect: 140, aggro: 0, attackRange: 20,
    attacksPerSec: 0.8, windupMs: 200,
    costFood: 10, costChitin: 0, unlocked: true,
    carry: 3, tripSeconds: 22, fleeRange: 100,
  },
  scout: {
    hp: 28, dmg: 6, size: 32, sprite: 32,
    speed: 75, detect: 120, aggro: 0, attackRange: 22,
    attacksPerSec: 1.0, windupMs: 150,
    costFood: 10, costChitin: 0, unlocked: true,
    revealRadius: 180,                                  // não coleta (rework)
  },
  soldier: {
    hp: 60, dmg: 10, size: 44, sprite: 44,
    speed: 60, detect: 160, aggro: 200, attackRange: 28,
    attacksPerSec: 1.2, windupMs: 250,
    costFood: 18, costChitin: 0, unlocked: true,
  },
  defender: {
    hp: 70, dmg: 9, size: 40, sprite: 40,
    speed: 45, detect: 120, aggro: 140, attackRange: 26,
    attacksPerSec: 1.0, windupMs: 300,
    costFood: 25, costChitin: 10, unlocked: false,
    ringRadius: 140,                                    // [D] anel ao redor do ninho
  },
  toxic: {
    hp: 40, dmg: 12, size: 32, sprite: 32,
    speed: 52, detect: 180, aggro: 160, attackRange: 160, // [D] projétil 160px
    attacksPerSec: 0.7, windupMs: 400,
    costFood: 30, costChitin: 20, unlocked: false,
    corrosionDps: 2, corrosionSec: 3,                   // [D] Parte 4.5
  },
  giant: {
    hp: 200, dmg: 18, size: 80, sprite: 80,
    speed: 35, detect: 140, aggro: 180, attackRange: 40,
    attacksPerSec: 0.5, windupMs: 500,
    costFood: 50, costChitin: 40, unlocked: false,
    knockback: 40,                                      // [D] Parte 4.5
  },
} as const;

export const POPULATION = {              // [P] lacuna L2
  MAX_INITIAL: 8,
  MAX_CAP: 24,
  START: { worker: 2, collector: 2, scout: 1, soldier: 1 },
} as const;

// Névoa de guerra — [P] lacuna L4
export const FOG = {
  SCOUT_RADIUS: 180,
  PASSIVE_RADIUS: 90,
  NEST_RADIUS: 220,
  PERMANENT: true,   // revelado não re-escurece; recursos/inimigos só no raio ativo
} as const;

// ═══════════════════════════════════════════════════════════════════
// NINHO
// ═══════════════════════════════════════════════════════════════════

export const NEST = {
  HP_MAX: 400,               // [P]
  ARMOR: 0,                  // [P]
  STORAGE: 200,              // [P] comida
  RUIN_EFFICIENCY: 0.50,     // [P] lacuna L5 — funciona a 50% em ruína
  RUIN_TRUCE_SEC: 60,        // [P] trégua para reconstruir
  REGEN_OUT_OF_COMBAT: 0,    // [P] só com carta
} as const;

// ═══════════════════════════════════════════════════════════════════
// RECURSOS E ECONOMIA — [D] Parte 5
// ═══════════════════════════════════════════════════════════════════

export const RESOURCES = {
  leaf:     { food: 2, xp: 2, sprite: 24 },
  mushroom: { food: 2, xp: 2, sprite: 24 },
  cactus:   { food: 2, xp: 2, sprite: 32 },
  banana:   { food: 3, xp: 3, sprite: 32 },
  flower:   { food: 2, xp: 2, sprite: 24 },
  crystal:  { food: 3, xp: 3, sprite: 32 },
} as const;
// valor médio ≈ 2,2 comida — base das simulações de balanceamento

export const CHITIN = {                  // [D] Parte 5
  ELITE_MIN: 1, ELITE_MAX: 2,
  BOSS_MIN: 2,  BOSS_MAX: 4,
  PERSISTS_ON_REBIRTH: true,
} as const;

// ═══════════════════════════════════════════════════════════════════
// ROGUELIKE — [D] Parte 6 · valores de XP [P] lacuna L3
// ═══════════════════════════════════════════════════════════════════

/** [D] Parte 6.2 — XP necessária = 10 × nível + 8 × nível² */
export const xpToNextLevel = (level: number): number => 10 * level + 8 * level * level;

export const XP = {                      // [P] lacuna L3
  PER_RESOURCE_FOOD: 1.0,    // × valor em comida
  PER_ENEMY: 5,              // × força da onda  ← escala
  PER_WAVE: 15,              // × número da onda ← escala
  PER_ELITE: 40,
  PER_BOSS: 150,
  PER_OBJECTIVE_MIN: 25,
  PER_OBJECTIVE_MAX: 100,
} as const;
// Simulação: nível 9 na onda 10 · nível 15 na onda 20 · nível 20 na onda 30

export const CARD_PANEL = {
  MIN_OPTIONS: 3,            // [D] Parte 6.2
  MAX_OPTIONS: 5,            // [D]
  DEFAULT_OPTIONS: 4,        // [P]
  FREEZE_WORLD: true,        // [D]
} as const;

export const RARITY_WEIGHTS = {          // [P] ver 03_BARALHO_ROGUELIKE §2
  base:  { comum: 60, incomum: 25, rara: 10, epica: 4, lendaria: 1 },
  perLevel: { comum: -2.2, incomum: 0.5, rara: 0.9, epica: 0.6, lendaria: 0.2 },
  floor: { comum: 20 },
} as const;

export const SYNERGY = {                 // [P]
  WEIGHT_BONUS: 0.15,        // +15% por carta do mesmo eixo
  WEIGHT_CAP: 0.60,
} as const;

export const BUILD_SLOTS = {             // [D] Parte 6.5 · resolução [P] lacuna L9
  SPECIALIZATION: 3, SPECIALIZATION_MAX: 6,
  BEHAVIOR: 3,       BEHAVIOR_MAX: 5,
  PASSIVE: 2,        PASSIVE_MAX: 4,
  REFUND_ON_REPLACE: 0.50,
} as const;

export const CHESTS = {                  // [D] Parte 6.7
  common: { options: 3, guaranteed: null },
  elite:  { options: 4, guaranteed: 'rara' },
  boss:   { options: 5, guaranteed: 'rara_ou_epica' },
  legend: { options: 3, guaranteed: 'evolucao_ou_item' },
} as const;

// ═══════════════════════════════════════════════════════════════════
// ONDAS — [D] Parte 7 · calmaria decrescente [P] recomendação
// ═══════════════════════════════════════════════════════════════════

export const WAVES = {
  COMBAT_SEC: 20,            // [D]
  CALM_SEC_DEFAULT: 90,      // [D]
  ENEMIES_BASE: 2,           // [D]
  ENEMIES_PER_WAVE: 2,       // [D]
  STRENGTH_BASE: 0.50,       // [D]
  STRENGTH_PER_WAVE: 0.10,   // [D]
  STRENGTH_CAP: 3.0,         // [D] atingido na onda 26
  TELEGRAPH_SEC: 2,          // [D]
  ELITE_EVERY: 5,            // [D]
  BOSS_EVERY: 10,            // [D]
  ELITE_STAT_MULT: 1.5,      // [D]
  BOSS_ESCORT_MULT: 0.5,     // [D]

  /** [P] Encurta só a calmaria. Chefe 1 aos ~14min (era 18). Desligue com USE_DYNAMIC_CALM. */
  USE_DYNAMIC_CALM: true,
  DYNAMIC_CALM: [
    { upToWave: 5,  calmSec: 90 },
    { upToWave: 10, calmSec: 70 },
    { upToWave: 20, calmSec: 55 },
    { upToWave: Infinity, calmSec: 40 },
  ],
} as const;

export const enemyCount = (wave: number, isBoss: boolean): number => {
  const n = WAVES.ENEMIES_BASE + WAVES.ENEMIES_PER_WAVE * (wave - 1);
  return isBoss ? Math.floor(n * WAVES.BOSS_ESCORT_MULT) : n;
};

export const waveStrength = (wave: number): number =>
  Math.min(WAVES.STRENGTH_BASE + WAVES.STRENGTH_PER_WAVE * (wave - 1), WAVES.STRENGTH_CAP);

// ═══════════════════════════════════════════════════════════════════
// INIMIGOS E CHEFES — [P]
// ═══════════════════════════════════════════════════════════════════

export const ENEMIES = {
  spider:    { hp: 25, dmg: 8,  speed: 50, size: 32, aggro: 150 },
  caterpillar:{hp: 45, dmg: 5,  speed: 30, size: 40, aggro: 150 },
  wasp:      { hp: 20, dmg: 12, speed: 70, size: 32, aggro: 180, flying: true },
  scorpion:  { hp: 40, dmg: 14, speed: 45, size: 48, aggro: 180, poisonDps: 2, poisonSec: 3 },
  beetle:    { hp: 70, dmg: 10, speed: 35, size: 48, aggro: 150, armor: 3 },
  frog:      { hp: 90, dmg: 18, speed: 40, size: 64, aggro: 200, swallow: true },
} as const;

export const BOSSES = {
  campo:    { hp: 600,  dmg: 20, phases: 2, chitin: 3, size: 96 },
  pantano:  { hp: 850,  dmg: 24, phases: 2, chitin: 3, size: 112 },
  caverna:  { hp: 1100, dmg: 28, phases: 3, chitin: 4, size: 128 },
  deserto:  { hp: 1400, dmg: 32, phases: 3, chitin: 4, size: 128 },
  montanha: { hp: 1800, dmg: 38, phases: 3, chitin: 4, size: 144 },
  selva:    { hp: 2400, dmg: 45, phases: 4, chitin: 5, size: 160 },
} as const;

// ═══════════════════════════════════════════════════════════════════
// MAPAS — [P] lacuna L6
// ═══════════════════════════════════════════════════════════════════

export const MAPS = {
  campo:    { enemyMult: 1.0, resourceMult: 1.0, chitinCost: 0,   unlock: 'inicial' },
  pantano:  { enemyMult: 1.2, resourceMult: 1.1, chitinCost: 15,  unlock: 'chefe_campo' },
  caverna:  { enemyMult: 1.4, resourceMult: 1.3, chitinCost: 30,  unlock: 'onda20_pantano' },
  deserto:  { enemyMult: 1.6, resourceMult: 1.2, chitinCost: 50,  unlock: 'chefe_caverna',
              trait: 'fome +25%' },
  montanha: { enemyMult: 1.8, resourceMult: 1.4, chitinCost: 80,  unlock: 'dois_chefes_mesma_run' },
  selva:    { enemyMult: 2.0, resourceMult: 1.6, chitinCost: 120, unlock: 'quatro_chefes' },
} as const;

// ═══════════════════════════════════════════════════════════════════
// DERROTA — [P] lacuna L5
// ═══════════════════════════════════════════════════════════════════

export const DEFEAT = {
  PARTIAL: {   // ninho a 0, Rainha viva → a run CONTINUA
    trigger: 'nest_hp_zero',
    killExternalAnts: true,
    keepInternalAnts: true,
    loseCarriedResources: true,
    cancelCurrentWave: true,
    truceSec: 60,
    keepCards: true,
  },
  TOTAL: {     // Rainha a 0 → fim da run
    trigger: 'queen_hp_zero',
    endRun: true,
    loseBuild: true,
    keepChitin: true,
    grantRunRewards: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
// RENASCIMENTO — [P] lacuna L7
// ═══════════════════════════════════════════════════════════════════

export const REBIRTH = {
  UNLOCK_AFTER_BOSS: true,
  UNLOCK_AT_WAVE: 15,
  /** floor( √(onda × 2) + chefes × 3 + nível ÷ 4 ) */
  points: (wave: number, bosses: number, level: number): number =>
    Math.floor(Math.sqrt(wave * 2) + bosses * 3 + level / 4),
  BONUSES: {
    veteran:    { cost: 5,  effect: '+1 formiga inicial',     max: 6 },
    reserves:   { cost: 8,  effect: '+20 comida inicial',     max: 5 },
    instinct:   { cost: 10, effect: '+10% XP',                max: 8 },
    strongCaste:{ cost: 12, effect: '+5% HP das formigas',    max: 10 },
    resilient:  { cost: 15, effect: '+10% fome máxima',       max: 5 },
    luck:       { cost: 20, effect: '+5% raridade alta',      max: 5 },
    extraSlot:  { cost: 40, effect: '+1 slot de build',       max: 3 },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
// SAVE — [D] Parte 8 · debounce [P] lacuna L11
// ═══════════════════════════════════════════════════════════════════

export const SAVE = {
  VERSION: 1,
  KEY: 'formigueiro_save_v1',
  BACKUP_SLOTS: 3,
  DEBOUNCE_MS: 5000,         // coleta, produção, dano
  PERIODIC_MS: 30000,        // rede de segurança
  IMMEDIATE_EVENTS: [        // save síncrono
    'run_start', 'level_up', 'card_chosen', 'chest_opened',
    'boss_defeated', 'wave_end', 'interior_enter', 'interior_exit',
    'defeat', 'rebirth',
  ],
  USE_CHECKSUM: true,
  FALLBACK_TO_INDEXEDDB: true,
} as const;

// ═══════════════════════════════════════════════════════════════════
// INTERIOR — [D] Parte 3.3, coordenadas normalizadas
// ═══════════════════════════════════════════════════════════════════

export const INTERIOR_ROOMS = {
  exit:        { x: 0.50, y: 0.10, w: 0.16, h: 0.10 },
  cemetery:    { x: 0.16, y: 0.17, w: 0.18, h: 0.12 },
  achievements:{ x: 0.20, y: 0.34, w: 0.18, h: 0.12 },
  missions:    { x: 0.16, y: 0.52, w: 0.18, h: 0.12 },
  ants:        { x: 0.18, y: 0.70, w: 0.17, h: 0.12 },
  map:         { x: 0.16, y: 0.87, w: 0.18, h: 0.12 },
  upgrades:    { x: 0.82, y: 0.21, w: 0.18, h: 0.12 },
  shop:        { x: 0.80, y: 0.40, w: 0.18, h: 0.12 },
  inventory:   { x: 0.83, y: 0.58, w: 0.18, h: 0.12 },
  rebirth:     { x: 0.82, y: 0.75, w: 0.18, h: 0.12 },
  queen:       { x: 0.50, y: 0.90, w: 0.34, h: 0.19 },
} as const;

export const INTERIOR_BARS = { y: 0.81 } as const;  // [D] FOME e COMIDA sobre a Sala da Rainha

// ═══════════════════════════════════════════════════════════════════
// HUD DO MAPA EXTERNO — [D] Parte 3.2
// ═══════════════════════════════════════════════════════════════════

export const HUD = {
  nest:      { x: 0.02, y: 0.02, w: 0.30 },
  resources: { x: 0.35, y: 0.02, w: 0.38 },
  wave:      { x: 0.50, y: 0.08 },
  objective: { x: 0.02, y: 0.17 },
  hunger:    { x: 0.34, y: 0.91, w: 0.32 },
  food:      { x: 0.66, y: 0.91, w: 0.25 },
} as const;

// ═══════════════════════════════════════════════════════════════════
// MENU INICIAL — [D] Parte 3.1
// ═══════════════════════════════════════════════════════════════════

export const MAIN_MENU = {
  logo:      { x: 0.50, y: 0.14, w: 0.50, h: 0.12 },
  subtitle:  { x: 0.50, y: 0.27 },
  queen:     { x: 0.50, y: 0.40, w: 0.18, h: 0.18 },
  playBtn:   { x: 0.50, y: 0.60, w: 0.28, h: 0.07 },
  invBtn:    { x: 0.50, y: 0.69, w: 0.28, h: 0.07 },
  missionBtn:{ x: 0.50, y: 0.78, w: 0.28, h: 0.07 },
} as const;
