/**
 * GameEngine — orquestra o loop, a run e a ponte com a interface.
 * Fiel ao original: economia por recurso, loja de 16 melhorias, ondas,
 * chefes, fome da Rainha, desbloqueio de mapas por exploração.
 */
import {
  ANTS, BEHAVIOR, BOSS, ECONOMY, ENGINE, FOG, MAPS, NEST, NEST_COLLAPSE,
  POPULATION, RESOURCES, RALLY, RESOURCE_REGEN, SAVE, SCORE, UPGRADES, WAVES, XP,
  nesthpCost, upgradeCost,
  type AntClass, type EnemyKind, type MapId, type ResourceKind,
} from '../core/constants';
import {
  ACHIEVEMENTS, MISSIONS, trackValue, type MissionTotals,
} from '../systems/missions';
import { Rng } from '../core/rng';
import { EventBus } from '../core/events';
import { Store } from '../core/store';
import { Clock } from '../core/clock';
import type {
  AcidProjectile, Ant, AntMods, AntWorld, BuffWave, CameraMode, Dust, Enemy, HudState, Prop, ResourceNode,
  Resources, Scene, Toast, UpgradeLevels, WaveState, WorldText, AntClass as AntClassT,
} from '../core/types';
import { SpatialHash } from './spatialHash';
import { FogOfWar } from './fogOfWar';
import { stepSimulation, makeWaveEnemy, makeBoss, respawnSeconds } from './update';
import { generateWorld } from '../world/world';
import { createAnt, resetAntIds } from '../entities/ants';
import { resetEnemyIds } from '../entities/enemies';
import { createQueenState, nextFoodItem } from '../systems/queen';
import { emptyUpgrades, modsFrom, upgradeById } from '../systems/shop';
import { cardModsFrom, emptyCardMods, type CardMods } from '../roguelike/modifiers';
import { drawPanel, slotsUsados } from '../roguelike/cardPool';
import { cardById, SLOTS, type CardCategoria } from '../roguelike/cards';
import { evolucaoById } from '../roguelike/evolutions';
import { Camera } from '../render/Camera';
import { Renderer } from '../render/Renderer';
import { loadSprites, type SpriteSet } from '../render/sprites';
import { AudioManager, type SfxName } from './audio';
import { loadSave, writeSave, saveExists, serialize, applySave } from '../save';

function emptyResources(): Resources {
  return { leaf: 0, mushroom: 0, cactus: 0, banana: 0, flower: 0, crystal: 0 };
}

/** cores das ondas de buff por categoria da loja (rgb) */
const COR_CATEGORIA: Record<string, string> = {
  coleta: '107,221,112',
  ataque: '240,101,92',
  defesa: '99,181,220',
  niveis: '251,208,70',
};
/** cor da onda por eixo de sinergia da carta */
export const COR_EIXO: Record<string, string> = {
  economia: '251,208,70',
  muralha: '99,181,220',
  agressao: '240,101,92',
  enxame: '107,221,112',
  exploracao: '182,122,217',
  veneno: '151,200,90',
  peso: '220,170,110',
};
/** classe da carta → formigas que brilham */
const ALVO_CLASSE_CARTA: Record<string, 'worker' | 'soldier' | 'scout' | 'todas'> = {
  coletora: 'worker',
  operaria: 'worker',
  soldado: 'soldier',
  exploradora: 'scout',
};
/** upgrades de classe brilham só nas formigas daquela classe */
const ALVO_UPGRADE: Record<string, 'worker' | 'soldier' | 'scout'> = {
  antlimit: 'worker',
  soldier: 'soldier',
  scout: 'scout',
};

function emptyHud(): HudState {
  return {
    screen: 'loading',
    runActive: false,
    gameOver: false,
    mapId: 'campo',
    unlockedMaps: ['campo'],
    exploredPct: 0,
    runSeconds: 0,
    resources: emptyResources(),
    level: 1,
    xp: 0,
    xpToNext: 50,
    queenHunger: 100,
    queenHungerMax: 100,
    nestHp: NEST.HP_MAX,
    nestHpMax: NEST.HP_MAX,
    ants: { worker: 0, soldier: 0, scout: 0 },
    wave: { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 },
    boss: null,
    cameraMode: 'follow',
    selectedAntId: null,
    paused: false,
    totals: { delivered: 0, enemiesKilled: 0, bossesKilled: 0 },
    upgrades: emptyUpgrades(),
    shopCosts: {},
    hasSave: false,
    toasts: [],
    rally: { attackCd: 0, collectCd: 0, attackBuff: 0, collectBuff: 0 },
    bossAggro: false,
    missions: { done: 0, total: 0, progress: [] },
    achievements: { done: 0, total: 0, progress: [] },
    rebirths: 0,
    score: 0,
    cardPanel: null,
    chitin: 0,
    cards: [],
    slots: {
      passiva: { usados: 0, teto: 2 },
      especializacao: { usados: 0, teto: 3 },
      comportamento: { usados: 0, teto: 3 },
      evolucao: { usados: 0, teto: 0 },
    },
    replaceDialog: null,
    speed: 1,
    unlockedClasses: [],
  };
}

export class GameEngine implements AntWorld, Scene {
  // ── Scene (o que o renderizador enxerga) ─────────────────────────
  mapId: MapId = 'campo';
  w = MAPS.campo.world.w;
  h = MAPS.campo.world.h;
  props: Prop[] = [];
  resources: ResourceNode[] = [];      // nós de recurso no mapa
  ants: Ant[] = [];
  enemies: Enemy[] = [];
  nest: { x: number; y: number; hp: number; hpMax: number } = {
    x: 0, y: 0, hp: NEST.HP_MAX, hpMax: NEST.HP_MAX,
  };
  fog = new FogOfWar(MAPS.campo.world.w, MAPS.campo.world.h);
  timeSec = 0;
  wave: WaveState = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
  selectedAntId: number | null = null;
  gameOver = false;

  // ── subsistemas ───────────────────────────────────────────────────
  readonly events = new EventBus();
  readonly store = new Store<HudState>(emptyHud());
  readonly camera = new Camera();
  readonly clock = new Clock();
  readonly audio = new AudioManager();
  sprites: SpriteSet | null = null;
  private renderer: Renderer | null = null;
  rng: Rng = new Rng(1);
  private resourceIndex = new SpatialHash<ResourceNode>(ENGINE.SPATIAL_CELL);

  // ── estado ────────────────────────────────────────────────────────
  runActive = false;
  tick = 0;
  toasts: Toast[] = [];
  wallet: Resources = emptyResources();  // carteira da colônia
  xp = 0;
  level = 1;
  exploredPct = 0;
  unlockedMaps: MapId[] = ['campo'];
  totals = {
    delivered: 0, enemiesKilled: 0, bossesKilled: 0,
    byResource: {} as Partial<Record<ResourceKind, number>>,
    byEnemy: {} as Partial<Record<EnemyKind, number>>,
  };
  upgrades: UpgradeLevels = emptyUpgrades();
  mods: AntMods = modsFrom(emptyUpgrades());
  queen = createQueenState();
  nestHp: number = NEST.HP_MAX;
  wavesByMap: Partial<Record<MapId, number>> = {};

  // ── baralho roguelike 5A (doc 03) ────────────────────────────────
  /** cartas escolhidas nesta run: id → nível */
  cards: Record<string, number> = {};
  /** efeitos agregados — ÚNICO ponto de aplicação é modifiers.ts */
  cardMods: CardMods = emptyCardMods();
  /** painéis aguardando escolha: level-up e baús (fila na ordem) */
  pendingCardPanels: Array<'levelup' | 'bau_comum' | 'bau_chefe' | 'bau_lendario'> = [];
  /** painel aberto agora — congela o mundo (clock.paused) */
  cardPanel: { level: number; choices: ReturnType<typeof drawPanel>; origem: string } | null = null;
  /** Rainha eterna: 1 revive por run */
  queenReviveUsed = false;
  private lastCapWasteToastT = -999;

  // ── 5B ────────────────────────────────────────────────────────────
  /** timers dos comportamentos (enxame 8s / ácido 20s / investida 30s / guardas) */
  cardTimers = { swarmT: 8, acidT: 20, chargeT: 30, guardCd: 0 };
  /** armadilhas de resina (posições fixas ao redor do ninho) */
  traps: Array<{ x: number; y: number; cd: number }> = [];
  /** baús de exploração no mapa */
  chests: Array<{ id: number; x: number; y: number }> = [];
  private nextChestId = 1;
  /** quitina: recurso dos chefes, moeda das classes futuras (Fase 6) */
  chitin = 0;
  /** chefes derrotados nesta run (baú lendário no 2º) */
  bossesThisRun = 0;
  /** bônus de slot por categoria (Mente-colmeia, baú lendário) */
  slotBonus: Record<'especializacao' | 'comportamento' | 'passiva', number> = {
    especializacao: 0, comportamento: 0, passiva: 0,
  };
  /** substituição pendente: carta nova esperando decisão */
  replaceDialog: { novaId: string; opcoes: Array<{ id: string; nome: string; icone: string; nivel: number; nivelMax: number }> } | null = null;
  /** classes desbloqueadas (Fase 5C) */
  classesDesbloqueadas: string[] = [];
  acidProjectiles: AcidProjectile[] = [];
  /** ciclo de classes dos ovos da Rainha */
  private eggCycle = 0;

  // ── ciclo A [O] ──────────────────────────────────────────────────
  ownedAnts: Record<AntClass, number> = { worker: 0, soldier: 0, scout: 0 };
  respawnQueue: Array<{ cls: AntClass; t: number }> = [];
  reviveEvents: Array<{ id: number; cls: AntClass; t: number }> = [];
  rally = { attackBuffT: 0, collectBuffT: 0, attackCd: 0, collectCd: 0 };
  bossAggroT = 0;
  bossFirstHit = false;
  bossThrowT = 0;
  smashFx: Array<{ x: number; y: number; t: number }> = [];
  shake = 0;
  /** [O computeFrontier] anel de fronteira que as exploradoras expandem */
  frontierR = FOG.CELL * 2;
  frontierT = 0;
  /** [O tapMarks] marcas do comando CHAMAR (toque/toque duplo) */
  tapMarks: Array<{ x: number; y: number; t: number; color: string }> = [];
  regenT = RESOURCE_REGEN.INTERVAL_SEC;
  // ── efeitos visíveis no mundo (melhorias percebíveis) ────────────
  worldTexts: WorldText[] = [];
  dust: Dust[] = [];
  buffWaves: BuffWave[] = [];
  nextResourceId = 100000;
  maxRes: Partial<Record<ResourceKind, number>> = {};
  missionsProgress: Record<string, number> = {};
  missionsDone: string[] = [];
  achievementsDone: string[] = [];
  rebirths = 0;

  // ── loop ──────────────────────────────────────────────────────────
  private running = false;
  private raf = 0;
  private lastFrameMs = 0;
  private lastHudMs = 0;
  private lastSaveMs = 0;
  private toastSeq = 1;
  readonly keys = new Set<string>();

  private constructor() {}

  /** Cria o motor carregando os sprites originais (tela de loading antes). */
  static async create(): Promise<GameEngine> {
    const engine = new GameEngine();
    engine.sprites = await loadSprites();
    engine.store.publish({ ...engine.store.getSnapshot(), screen: 'menu' });
    engine.publishHud();
    return engine;
  }

  // ═════════════════════════ ANTWORLD ═══════════════════════════════

  spawnAcidProjectile(p: AcidProjectile): void {
    this.acidProjectiles.push(p);
  }

  get defenderRingRadius(): number | undefined {
    return this.classesDesbloqueadas.includes('defensora') ? 150 + this.cardMods.defenderRingRadiusBonus : undefined;
  }

  get giantUnlocked(): boolean {
    return this.classesDesbloqueadas.includes('gigante');
  }

  get unlockedClasses(): readonly string[] {
    return this.classesDesbloqueadas;
  }

  unlockClass(cls: 'defensora' | 'toxica' | 'gigante'): boolean {
    if (this.classesDesbloqueadas.includes(cls)) return false;
    const costs: Record<string, number> = { defensora: 3, toxica: 6, gigante: 10 };
    const cost = costs[cls] ?? 10;
    if (this.chitin < cost) {
      this.pushToast(`Quitina insuficiente! Requer 🦴 ${cost}`, 'warn');
      return false;
    }
    this.chitin -= cost;
    this.classesDesbloqueadas.push(cls);
    const names: Record<string, string> = {
      defensora: '🛡️ Classe Defensora desbloqueada!',
      toxica: '🧪 Classe Tóxica desbloqueada!',
      gigante: '🗿 Classe Gigante desbloqueada!',
    };
    this.pushToast(names[cls] ?? 'Classe desbloqueada!', 'success');
    this.publishHud();
    writeSave(serialize(this));
    return true;
  }

  getSpeed(): number {
    return this.clock.speed;
  }

  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
    this.publishHud();
  }

  cycleSpeed(): number {
    const c = this.clock.speed;
    const n = c === 1 ? 2 : c === 2 ? 3 : c === 3 ? 5 : 1;
    this.clock.setSpeed(n);
    this.publishHud();
    return n;
  }

  takeResource(kind: ResourceKind, n: number): boolean {
    if ((this.wallet[kind] ?? 0) >= n) {
      this.wallet[kind] -= n;
      return true;
    }
    return false;
  }

  deposit(units: number, kind: ResourceKind, by: AntClass): void {
    const xpPer = XP.PER_DEPOSIT + this.mods.xpBoost;
    // Carregadora (carta 5B): +itens por viagem
    units += this.cardMods.depositBonusUnits;
    for (let i = 0; i < units; i++) {
      this.wallet[kind] += 1;
      this.addXp(xpPer);
      // [O] sorte: 10% × nível → recurso extra
      if (this.rng.chance(ECONOMY.LUCK_BONUS_CHANCE * this.mods.luck)) {
        this.wallet[kind] += 1;
        this.addXp(1);
      }
    }
    // Colheita farta (carta 5B): chance independente de item bônus
    if (this.rng.chance(this.cardMods.harvestLuckChance)) {
      this.wallet[kind] += 1;
      this.addXp(1);
    }
    // Caravana de recursos (evolução): coletoras juntas descarregam
    if (this.cardMods.caravanaRecursos) {
      let extras = 0;
      for (const a of this.ants) {
        if (a.cls !== 'worker' || a.hp <= 0 || a.carrying <= 0) continue;
        if (Math.hypot(a.x - this.nest.x, a.y - this.nest.y) > 90) continue;
        extras += a.carrying;
        const k = a.carryKind ?? kind;
        this.wallet[k] += a.carrying;
        this.addXp(a.carrying * xpPer);
        a.carrying = 0;
        a.carryKind = null;
        a.state = 'idle';
      }
      units += extras;
    }
    this.totals.delivered += units;
    this.totals.byResource[kind] = (this.totals.byResource[kind] ?? 0) + units;
    this.pushWorldText(
      this.nest.x + (this.rng.next() - 0.5) * 40,
      this.nest.y - 40,
      `+${units} ${RESOURCES[kind].icon}`,
      '140,200,120',
    );
    this.progressResource(kind, units);
    this.checkAchievements();
    this.clampWallet();
    this.audio.play('deposit');
    this.events.emit('food_deposited', { units, food: units * RESOURCES[kind].food, by });
  }

  nearestRevealedResource(x: number, y: number, maxDist: number): ResourceNode | null {
    const candidates = this.resourceIndex.query(x, y, maxDist);
    let best: ResourceNode | null = null;
    let bestD2 = maxDist * maxDist;
    for (const r of candidates) {
      if (r.amount <= 0) continue;
      if (!this.fog.isRevealed(r.x, r.y)) continue;
      const d2 = (r.x - x) ** 2 + (r.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = r;
      }
    }
    return best;
  }

  /** [O nearestEnemyBody] inimigo REVELADO mais próximo (distância ao corpo). */
  nearestVisibleEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (!this.fog.isRevealed(e.x, e.y)) continue;
      const d = Math.max(0, Math.hypot(e.x - x, e.y - y) - this.enemyExtent(e));
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** [O enemyExtent] extensão do corpo (scale/2) */
  enemyExtent(e: Enemy): number {
    return e.scale / 2;
  }

  /** [O pickup] remove o nó de recurso do mapa */
  removeResource(id: number): void {
    this.resources = this.resources.filter((r) => r.id !== id);
  }

  damageEnemy(e: Enemy, dmg: number, _by: AntClass, crit = false): void {
    e.hp -= dmg;
    // dano visível: número flutuante no inimigo (crítico em dourado)
    this.pushWorldText(
      e.x + (this.rng.next() - 0.5) * 18,
      e.y - e.scale * 0.55 - 6,
      crit ? `-${Math.round(dmg)}!` : `-${Math.round(dmg)}`,
      crit ? '251,208,70' : '245,230,200',
    );
    if (e.boss && e.hp > 0) {
      // [O] bossAggroT=4 e o smash só começa após o 1º golpe
      this.bossAggroT = BOSS.AGGRO_SEC;
      if (!this.bossFirstHit) {
        this.bossFirstHit = true;
        this.bossThrowT = 15;
      }
    }
    if (e.hp <= 0 && !e.boss) {
      // chefe é contabilizado em onBossDefeated (drops + XP)
      this.pushWorldText(e.x, e.y - e.scale * 0.55 - 16, `+${e.xp} XP`, '107,221,112');
      this.addXp(e.xp);
      this.totals.enemiesKilled++;
      this.totals.byEnemy[e.kind] = (this.totals.byEnemy[e.kind] ?? 0) + 1;
      this.audio.play('kill');
      this.progressEnemy(e.kind);
      this.checkAchievements();
    }
  }

  antCount(cls: AntClass): number {
    return this.ants.filter((a) => a.cls === cls && a.hp > 0).length;
  }

  playSfx(name: string): void {
    this.audio.play(name as SfxName);
  }

  // ── EnemyHost (IA dos inimigos) ──────────────────────────────────

  damageAnt(antId: number, dmg: number, _by: EnemyKind, fromX?: number, fromY?: number): void {
    const a = this.ants.find((x) => x.id === antId);
    if (!a || a.hp <= 0) return;
    // [O] armadura com piso de 50%
    let dano = dmg * Math.max(0.5, 1 - this.mods.armorReduction);
    // Legião de ataque (evolução): soldados ≤130px dividem o dano recebido
    if (this.cardMods.legiaoAtaque && a.cls === 'soldier') {
      const legion = this.ants.filter(
        (x) => x.cls === 'soldier' && x.hp > 0 && Math.hypot(x.x - a.x, x.y - a.y) <= 130,
      );
      if (legion.length > 1) {
        const parte = dano / legion.length;
        for (const s of legion) s.hp -= parte;
        dano = 0;
      }
    }
    a.hp -= dano;
    // [O] não-soldados fogem por 0.9s na direção contrária
    if (a.cls !== 'soldier' && fromX !== undefined && fromY !== undefined) {
      const d = Math.hypot(a.x - fromX, a.y - fromY) || 1;
      a.fearAx = ((a.x - fromX) / d) * 120;
      a.fearAy = ((a.y - fromY) / d) * 120;
      a.fearT = BEHAVIOR.FLEE_SEC;
    }
  }

  damageNest(dmg: number, _fromX?: number, _fromY?: number): void {
    if (this.nestHp <= 0) return; // já colapsado [O]
    // Terra batida (carta 5A): armadura flat, dano mínimo 1
    if (this.cardMods.nestArmor > 0 && dmg > 0) {
      dmg = Math.max(1, dmg - this.cardMods.nestArmor);
    }
    // Espinhos do ninho (carta 5B): dano FLAT a quem toca
    const thornFlat = this.cardMods.nestThornsFlat;
    let atacante: Enemy | null = null;
    if (_fromX !== undefined && _fromY !== undefined) {
      let bd = 160;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - _fromX, e.y - _fromY);
        if (d < bd) { bd = d; atacante = e; }
      }
      if (atacante && thornFlat > 0) {
        this.damageEnemy(atacante, thornFlat, 'soldier');
      }
    }
    const before = this.nestHp;
    this.nestHp = Math.max(0, this.nestHp - dmg);
    this.shake = Math.max(this.shake, 0.7);
    // Espinhos de raiz (carta 5A): devolve parte do dano ao atacante próximo
    if (this.cardMods.nestThornsPct > 0 && atacante) {
      this.damageEnemy(atacante, (dmg * this.cardMods.nestThornsPct) / 100, 'soldier');
    }
    // Muralha de defensores (carta 5B): ninho atacado invoca 2 guardas
    if (this.cardMods.guardSummonSec > 0 && this.cardTimers.guardCd <= 0 && this.runActive && !this.gameOver) {
      this.cardTimers.guardCd = 40;
      for (let i = 0; i < 2; i++) {
        const ang = this.rng.next() * Math.PI * 2;
        const guarda = createAnt('soldier', this.nest.x + Math.cos(ang) * 26, this.nest.y + Math.sin(ang) * 26, () => this.rng.next());
        guarda.hp = guarda.hpMax = Math.round(ANTS.soldier.hp * this.mods.hpMult);
        guarda.tempT = this.cardMods.guardSummonSec;
        guarda.glowT = 2.5;
        guarda.glowColor = '99,181,220';
        this.ants.push(guarda);
      }
      this.pushToast('🏰 Guardas temporários defendem o ninho!', 'info');
    }
    if (before > 0 && this.nestHp <= 0) {
      // [O] colapso: perde 30% das folhas e a onda recomeça
      const lost = Math.floor((this.wallet.leaf ?? 0) * NEST_COLLAPSE.LEAF_LOSS_FRAC);
      this.wallet.leaf = (this.wallet.leaf ?? 0) - lost;
      this.shake = 2;
      if (this.wave.active) {
        this.wave.tSec = WAVES.COMBAT_SEC;
        this.wave.spawned = 0;
        this.wave.spawnT = 0;
      }
      this.pushToast(
        lost > 0
          ? `O formigueiro entrou em colapso! Perdeu ${lost} folhas.`
          : 'O formigueiro entrou em colapso!',
        'warn',
      );
    }
  }

  // ═════════════════════════ SIMHOST ════════════════════════════════

  get boss(): Enemy | null {
    return this.enemies.find((e) => e.boss && e.hp > 0) ?? null;
  }

  /** Provocação (carta 5B) — lido pela IA dos inimigos */
  get tauntRadius(): number {
    return this.cardMods.tauntRadiusPx;
  }

  /** Nuvem de feromônio ativa? (render) */
  get pheromoneZone(): boolean {
    return this.cardMods.pheromoneZonePct > 0;
  }

  /** [O] buffs do rally lidos pelas formigas */
  get buffs(): { collectSpeedMult: number; attackCdMult: number } {
    return {
      collectSpeedMult: this.rally.collectBuffT > 0 ? RALLY.COLLECT_SPEED_MULT : 1,
      attackCdMult: this.rally.attackBuffT > 0 ? RALLY.ATTACK_SPEED_MULT : 1,
    };
  }

  /** [O] placar (Sm): recursos×5 + inimigos×20 + chefes×100 + xp×2 + conquistas×50 + missões×100 + renasc×200 */
  get score(): number {
    return (
      this.totals.delivered * SCORE.PER_RESOURCE +
      this.totals.enemiesKilled * SCORE.PER_ENEMY +
      this.totals.bossesKilled * SCORE.PER_BOSS +
      this.xp * SCORE.PER_XP +
      this.achievementsDone.length * SCORE.PER_ACHIEVEMENT +
      this.missionsDone.length * SCORE.PER_MISSION +
      this.rebirths * SCORE.PER_REBIRTH
    );
  }

  /** [O] qn + upgrades.nesthp × Er (+ Paredes grossas, carta 5A) */
  nestHpMax(): number {
    return NEST.HP_MAX + (this.upgrades.nesthp ?? 0) * NEST.HP_PER_UPGRADE + this.cardMods.nestHpBonus;
  }

  /** [P 5A] população máxima: teto de segurança + Ninhada maior */
  populationMax(): number {
    return POPULATION.MAX + this.cardMods.populationMaxBonus;
  }

  /** Teto de slots da categoria (inicial + Mente-colmeia + baú lendário). */
  slotCap(categoria: CardCategoria): number {
    if (categoria === 'evolucao') return 0;
    const bonus = categoria === 'especializacao' ? this.slotBonus.especializacao
      : categoria === 'comportamento' ? this.slotBonus.comportamento
      : this.slotBonus.passiva;
    const bonusCarta = categoria === 'especializacao' ? this.cardMods.slotBonusEspecializacao : 0;
    return Math.min(SLOTS[categoria].max, SLOTS[categoria].inicial + bonus + bonusCarta);
  }

  /** Slots usados/limite por categoria (HUD e sorteio). */
  slotUsage(): Record<CardCategoria, { usados: number; teto: number }> {
    return {
      passiva: { usados: slotsUsados(this.cards, 'passiva'), teto: this.slotCap('passiva') },
      especializacao: { usados: slotsUsados(this.cards, 'especializacao'), teto: this.slotCap('especializacao') },
      comportamento: { usados: slotsUsados(this.cards, 'comportamento'), teto: this.slotCap('comportamento') },
      evolucao: { usados: Object.keys(this.cards).filter((id) => cardById(id)?.categoria === 'evolucao' && (this.cards[id] ?? 0) > 0).length, teto: 0 },
    };
  }

  /** [P 5B] baú de exploração: nasce em área NÃO revelada, longe do ninho */
  spawnChest(): void {
    for (let t = 0; t < 60; t++) {
      const ang = this.rng.next() * Math.PI * 2;
      const dist = 500 + this.rng.next() * (Math.min(this.w, this.h) / 2 - 550);
      const x = this.nest.x + Math.cos(ang) * dist;
      const y = this.nest.y + Math.sin(ang) * dist;
      if (x < 60 || y < 60 || x > this.w - 60 || y > this.h - 60) continue;
      if (this.fog.isRevealed(x, y)) continue;
      if (this.blocked(x, y)) continue;
      this.chests.push({ id: this.nextChestId++, x, y });
      return;
    }
  }

  /** Baú revelado pela exploradora: abre painel de 3 cartas (doc 03 §7). */
  onChestFound(chest: { id: number; x: number; y: number }): void {
    if (!this.runActive || this.gameOver) return;
    if (this.cardPanel || this.replaceDialog) return; // espera a fila andar
    if (!this.chests.some((c) => c.id === chest.id)) return; // já coletado
    this.chests = this.chests.filter((c) => c.id !== chest.id);
    this.pendingCardPanels.push('bau_comum');
    this.openCardPanelIfNeeded();
    writeSave(serialize(this));
  }

  /** Onda repelida: chance de baú novo no mapa (Caçadora de tesouros ajuda). */
  onWaveCleared(): void {
    if (this.chests.length >= 3) return;
    const chance = 0.25 + this.cardMods.chestChanceBonus;
    if (this.rng.chance(chance)) {
      this.spawnChest();
      this.pushToast('🔎 Um baú foi avistado em terras desconhecidas!', 'info');
    }
  }

  /** [P 5A] Despensa: teto por recurso da carteira */
  walletCap(): number {
    return Math.round(ECONOMY.WALLET_CAP_BASE * this.cardMods.storageMult);
  }

  /** Concede recursos respeitando o teto da Despensa (avisa o desperdício). */
  grantResource(kind: ResourceKind, n: number): void {
    this.wallet[kind] = (this.wallet[kind] ?? 0) + n;
    this.clampWallet();
  }

  /** Corta a carteira no teto da Despensa (carta 5A). */
  private clampWallet(): void {
    const cap = this.walletCap();
    let waste = 0;
    for (const kind of Object.keys(this.wallet) as ResourceKind[]) {
      const v = this.wallet[kind] ?? 0;
      if (v > cap) {
        waste += v - cap;
        this.wallet[kind] = cap;
      }
    }
    if (waste > 0 && this.timeSec - this.lastCapWasteToastT > 10) {
      this.lastCapWasteToastT = this.timeSec;
      this.pushToast(
        `🎒 Despensa cheia! ${Math.round(waste)} recursos desperdiçados (melhore o armazenamento).`,
        'warn',
      );
    }
  }

  /** Adiciona XP com o bônus de eficiência (Divisão de trabalho, carta 5A). */
  addXp(n: number): void {
    this.xp += n * (1 + this.cardMods.efficiencyPct / 100);
  }

  /**
   * [P 5B] Produção de ovos da Rainha (doc 03 §3.3): um ovo a cada 45s
   * (Postura acelerada reduz), custa 3 itens de comida (Coração dourado
   * elimina o custo com fome ≥80%), Ninhada dupla pode dobrar.
   */
  updateQueenProduction(dt: number): void {
    if (this.gameOver || !this.runActive) return;
    this.cardTimers.guardCd = Math.max(0, this.cardTimers.guardCd - dt);
    const cm = this.cardMods;
    if (cm.productionIntervalMult >= 1 && cm.doubleBroodChance <= 0) return; // sem sistema ativo
    const intervalo = Math.max(10, 45 * cm.productionIntervalMult);
    this.queen.eggT += dt;
    if (this.queen.eggT < intervalo) return;
    this.queen.eggT = 0;

    const total = this.ownedAnts.worker + this.ownedAnts.soldier + this.ownedAnts.scout;
    if (total >= this.populationMax()) return; // sem espaço

    // custo: 3 itens (grátis com Coração dourado se fome ≥80%)
    const gratis = cm.coracaoDourado && this.queen.hunger >= this.queen.hungerMax * 0.8;
    if (!gratis) {
      let pagou = 0;
      for (let i = 0; i < 3; i++) {
        const item = nextFoodItem(this.wallet);
        if (!item) break;
        this.wallet[item] -= 1;
        pagou++;
      }
      if (pagou < 3) {
        // sem comida: devolve e tenta de novo em 5s
        for (let i = 0; i < pagou; i++) {
          const item = nextFoodItem(this.wallet);
          if (item) this.wallet[item] += 1;
        }
        this.queen.eggT = intervalo - 5;
        return;
      }
    }

    // classe do ovo: ciclo operária → soldado → operária → exploradora
    const ciclo: AntClass[] = ['worker', 'soldier', 'worker', 'scout'];
    let nascimentos = 1;
    if (cm.doubleBroodChance > 0 && this.rng.chance(cm.doubleBroodChance)) nascimentos = 2;
    for (let i = 0; i < nascimentos; i++) {
      const cls = ciclo[this.eggCycle % ciclo.length] as AntClass;
      this.eggCycle++;
      if (this.ownedAnts.worker + this.ownedAnts.soldier + this.ownedAnts.scout >= this.populationMax()) break;
      this.ownedAnts[cls] += 1;
      this.spawnAnt(cls);
      this.pushWorldText(this.nest.x + (this.rng.next() - 0.5) * 50, this.nest.y - 56, '🥚', '107,221,112', 1.4);
    }
    this.pushBuffWave('107,221,112');
  }

  private scoutSpawnI = 0;

  spawnAnt(cls: AntClass): void {
    const ang = this.rng.next() * Math.PI * 2;
    const dist = 8 + this.rng.next() * 14; // [O] nasce colada ao ninho
    const x = Math.min(this.w - 12, Math.max(12, this.nest.x + Math.cos(ang) * dist));
    const y = Math.min(this.h - 12, Math.max(12, this.nest.y + Math.sin(ang) * dist));
    const ant = createAnt(cls, x, y, () => this.rng.next());
    // [O] hp = pb × (1 + 0.15·hpboost + 0.01·At(r).hpPct) (+ Couraça, carta 5A)
    const hpPct = this.mods.hpMult;
    ant.hp = ant.hpMax = Math.round(ANTS[cls].hp * hpPct) +
      (cls === 'soldier' ? this.cardMods.soldierHpBonus : cls === 'worker' ? this.cardMods.workerHpBonus : 0);
    ant.angle = ant.wanderAngle = ang;
    if (cls === 'scout') {
      // [O] exploradoras cobrem ângulos diferentes do anel de fronteira
      const n = Math.max(1, this.ownedAnts.scout + 1);
      ant.scoutA = ((this.scoutSpawnI % n) / n) * Math.PI * 2 + (this.rng.next() - 0.5) * 0.35;
      ant.scoutR = 0.95 + (this.scoutSpawnI % 3) * 0.1 + this.rng.next() * 0.05;
      this.scoutSpawnI++;
    }
    this.ants.push(ant);
  }

  /** [O] killAnt: carga cai no chão + fila do cemitério */
  killAnt(a: Ant): void {
    // guardas temporários (Muralha de defensores) não renascem
    if (a.tempT !== undefined) {
      this.audio.play('kill');
      return;
    }
    for (let i = 0; i < a.carrying; i++) {
      this.resources.push({
        id: this.nextResourceId++,
        kind: a.carryKind ?? 'leaf',
        x: a.x + (this.rng.next() - 0.5) * 20,
        y: a.y + (this.rng.next() - 0.5) * 20,
        amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
    }
    this.respawnQueue.push({
      cls: a.cls,
      t: respawnSeconds(this.upgrades.respawn ?? 0),
    });
    this.audio.play('kill');
  }

  onAntRespawned(cls: AntClass): void {
    this.audio.play('respawn');
    this.reviveEvents.push({ id: this.toastSeq, cls, t: 0 });
    if (this.reviveEvents.length > 12) this.reviveEvents.shift();
  }

  /** [O] spawnResource: nasce em área revelada, longe do ninho e de obstáculos */
  spawnResource(kind: ResourceKind): void {
    const minDist = BEHAVIOR.RES_MIN_DIST;
    for (let t = 0; t < 120; t++) {
      const x = 50 + this.rng.next() * (this.w - 100);
      const y = 50 + this.rng.next() * (this.h - 100);
      if (Math.hypot(x - this.nest.x, y - this.nest.y) < minDist) continue;
      if (!this.fog.isRevealed(x, y)) continue;
      if (this.blocked(x, y)) continue;
      this.resources.push({
        id: this.nextResourceId++, kind, x, y, amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
      return;
    }
    // anel ao redor do ninho em ponto revelado [O fallback]
    for (let t = 0; t < 120; t++) {
      const ang = this.rng.next() * Math.PI * 2;
      const dist = minDist + this.rng.next() * 140;
      const x = this.nest.x + Math.cos(ang) * dist;
      const y = this.nest.y + Math.sin(ang) * dist;
      if (x < 30 || y < 30 || x > this.w - 30 || y > this.h - 30) continue;
      if (!this.fog.isRevealed(x, y) || this.blocked(x, y)) continue;
      this.resources.push({
        id: this.nextResourceId++, kind, x, y, amount: 1,
        phase: this.rng.next() * Math.PI * 2,
      });
      return;
    }
  }

  private blocked(x: number, y: number): boolean {
    for (const p of this.props) {
      if (p.solid && Math.hypot(x - p.x, y - p.y) < p.r + 16) return true;
    }
    return false;
  }

  spawnWaveEnemy(power?: number): void {
    this.enemies.push(makeWaveEnemy(this, power));
  }

  spawnBoss(): void {
    this.enemies.push(makeBoss(this));
    this.audio.play('boss');
  }

  pushToast(text: string, kind: Toast['kind']): void {
    this.toasts.push({ id: this.toastSeq++, text, kind, tSec: ENGINE.TOAST_SEC });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  /** Texto flutuante no mundo (dano, XP, recursos) — melhoria VISÍVEL. */
  pushWorldText(x: number, y: number, text: string, color: string, dur = 1.1): void {
    this.worldTexts.push({ x, y, text, color, t: dur, tMax: dur });
    if (this.worldTexts.length > 40) this.worldTexts.shift();
  }

  /**
   * Onda de buff: anel colorido sai do ninho e as formigas-alvo brilham
   * por 2,5s — mostra QUEM ganhou a melhoria.
   */
  pushBuffWave(color: string, alvo: 'todas' | AntClassT = 'todas'): void {
    this.buffWaves.push({ x: this.nest.x, y: this.nest.y, r: 0, maxR: 360, color, t: 0.9, tMax: 0.9 });
    for (const a of this.ants) {
      if (alvo === 'todas' || a.cls === alvo) {
        a.glowT = 2.5;
        a.glowColor = color;
      }
    }
    if (this.buffWaves.length > 6) this.buffWaves.shift();
  }

  onLevelUp(level: number, gained = 1): void {
    this.audio.play('levelUp');
    this.pushToast(`⭐ A colônia alcançou o nível ${level}!`, 'success');
    // [doc 03 §6.3] painel de cartas congela o mundo e espera a escolha
    for (let i = 0; i < gained; i++) this.pendingCardPanels.push('levelup');
    this.openCardPanelIfNeeded();
  }

  /** Abre o próximo painel pendente (level-up ou baú) — congela o mundo. */
  private openCardPanelIfNeeded(): void {
    if (!this.runActive || this.gameOver || this.cardPanel || this.replaceDialog) return;
    const origem = this.pendingCardPanels[0];
    if (!origem) return;
    const choices = drawPanel(this.cards, this.level, {
      tamanho: origem === 'bau_chefe' ? 5 : 3,
      garantia: origem === 'bau_chefe' ? 'rara' : undefined,
      garantirEvolucao: origem === 'bau_lendario',
      slotCaps: {
        passiva: this.slotCap('passiva'),
        especializacao: this.slotCap('especializacao'),
        comportamento: this.slotCap('comportamento'),
      },
      classesDesbloqueadas: this.classesDesbloqueadas,
    });
    this.cardPanel = { level: this.level, choices, origem };
    this.clock.paused = true; // congela o mundo [doc 03 §6.3]
    this.publishHud();
  }

  /** Escolhe uma carta/fallback do painel aberto e aplica o efeito. */
  chooseCard(id: string): void {
    if (!this.cardPanel || !this.runActive || this.gameOver || this.replaceDialog) return;
    const choice = this.cardPanel.choices.find((c) => c.id === id);
    if (!choice) return;

    if (choice.tipo === 'carta') {
      const def = cardById(choice.id);
      if (!def) return;
      const atual = this.cards[choice.id] ?? 0;
      if (atual >= def.valores.length) return;

      // evolução: exige receita válida e SUBSTITUI a carta base (doc 03 §5)
      if (def.categoria === 'evolucao') {
        const evo = evolucaoById(choice.id);
        if (!evo) return;
        const baseDef = cardById(evo.base);
        if (!baseDef || (this.cards[evo.base] ?? 0) < baseDef.valores.length) return;
        if ((this.cards[evo.suporte] ?? 0) < 1 || this.level < evo.nivelMin) return;
        delete this.cards[evo.base];
        this.cards[choice.id] = 1;
        this.cardMods = cardModsFrom(this.cards);
        this.audio.play('win');
        this.pushToast(`✨ EVOLUÇÃO: ${def.nome}! ${evo.desc}`, 'success');
        this.pushBuffWave(COR_EIXO[def.eixo] ?? '251,208,70');
        this.finishPanelChoice();
        return;
      }

      // carta NOVA em categoria cheia → diálogo de substituição (doc 03 §6)
      if (atual === 0 && choice.requerSubstituicao) {
        const categoria = def.categoria;
        const opcoes = Object.entries(this.cards)
          .filter(([cid, nv]) => nv > 0 && cardById(cid)?.categoria === categoria)
          .map(([cid, nv]) => {
            const c = cardById(cid)!;
            return { id: cid, nome: c.nome, icone: c.icone, nivel: nv, nivelMax: c.valores.length };
          });
        if (opcoes.length > 0) {
          this.replaceDialog = { novaId: choice.id, opcoes };
          this.publishHud();
          return; // aguarda escolher o que substituir (ou recusar)
        }
      }

      const prevNestMax = this.nestHpMax();
      const prevSoldierHp = this.cardMods.soldierHpBonus;
      const prevWorkerHp = this.cardMods.workerHpBonus;
      this.cards[choice.id] = atual + 1;
      this.cardMods = cardModsFrom(this.cards);
      this.applyCardSideEffects(choice.id, prevNestMax, prevSoldierHp, prevWorkerHp);
      this.audio.play('win');
      this.pushToast(`🃏 ${def.nome} — nível ${atual + 1}!`, 'success');
      // carta visível: onda na cor do eixo, formigas da classe brilham
      this.pushBuffWave(COR_EIXO[def.eixo] ?? '251,208,70', ALVO_CLASSE_CARTA[def.classe] ?? 'todas');
    } else if (choice.id === 'fallback_cura') {
      const max = this.nestHpMax();
      const heal = Math.round(max * 0.25);
      this.nestHp = Math.min(max, this.nestHp + heal);
      this.audio.play('win');
      this.pushToast(`🏠 O ninho recuperou ${heal} de vida.`, 'success');
    } else if (choice.id === 'fallback_comida') {
      this.grantResource('leaf', 30);
      this.audio.play('deposit');
      this.pushToast('🍂 +30 folhas no estoque.', 'success');
    } else if (choice.id === 'fallback_quitina') {
      this.chitin += 1;
      this.audio.play('win');
      this.pushToast('🦴 +1 quitina guardada para as classes futuras.', 'success');
    } else if (choice.id === 'fallback_xp') {
      this.addXp(100);
      this.audio.play('levelUp');
      this.pushToast('📘 +100 XP!', 'success');
    }

    this.finishPanelChoice();
  }

  /** Consome a escolha: fecha painel, avança a fila e salva. */
  private finishPanelChoice(): void {
    this.pendingCardPanels.shift();
    if (this.pendingCardPanels.length > 0) {
      this.cardPanel = null;
      this.openCardPanelIfNeeded();
    } else {
      this.cardPanel = null;
      this.clock.paused = false;
    }
    this.publishHud();
    writeSave(serialize(this));
  }

  /** Substituição confirmada: tira a antiga (reembolso 50% em XP) e põe a nova. */
  chooseReplace(oldId: string): void {
    if (!this.replaceDialog) return;
    const novaId = this.replaceDialog.novaId;
    const def = cardById(novaId);
    const oldDef = cardById(oldId);
    if (!def || !oldDef || (this.cards[oldId] ?? 0) <= 0) return;

    // reembolso: 50% dos níveis investidos, em XP (25 XP por nível) [doc 03 §6]
    const niveis = this.cards[oldId] ?? 0;
    const reembolso = Math.round(niveis * 25 * 0.5 * 2); // 25 XP/nível investido
    delete this.cards[oldId];
    this.cards[novaId] = 1;
    this.cardMods = cardModsFrom(this.cards);
    this.addXp(reembolso);
    this.replaceDialog = null;
    this.audio.play('win');
    this.pushToast(`♻️ ${oldDef.nome} → ${def.nome}! +${reembolso} XP de reembolso.`, 'success');
    this.pushBuffWave(COR_EIXO[def.eixo] ?? '251,208,70');
    this.finishPanelChoice();
  }

  /** Recusa a substituição: a carta nova é devolvida e o painel reabre. */
  refuseReplace(): void {
    if (!this.replaceDialog) return;
    this.replaceDialog = null;
    this.publishHud();
  }

  /** Efeitos imediatos ao subir de nível uma carta (vida extra, etc.). */
  private applyCardSideEffects(id: string, prevNestMax: number, prevSoldierHp: number, prevWorkerHp: number): void {
    if (id === 'paredes_grossas') {
      // o ganho de HP máximo também cura o ninho no mesmo valor
      const delta = this.nestHpMax() - prevNestMax;
      this.nestHp = Math.min(this.nestHpMax(), this.nestHp + delta);
      this.nest.hpMax = this.nestHpMax();
    }
    if (id === 'couraca') {
      // soldados vivos ganham a vida extra imediatamente
      const delta = this.cardMods.soldierHpBonus - prevSoldierHp;
      if (delta > 0) {
        for (const a of this.ants) {
          if (a.cls === 'soldier' && a.hp > 0) {
            a.hp += delta;
            a.hpMax += delta;
          }
        }
      }
    }
    if (id === 'casca_dura') {
      // coletoras vivas ganham a vida extra imediatamente
      const delta = this.cardMods.workerHpBonus - prevWorkerHp;
      if (delta > 0) {
        for (const a of this.ants) {
          if (a.cls === 'worker' && a.hp > 0) {
            a.hp += delta;
            a.hpMax += delta;
          }
        }
      }
    }
    if (id === 'estomago_amplo') {
      this.queen.hungerMax = Math.round(100 * this.cardMods.hungerMaxMult);
    }
    if (id === 'armadilha_resina') {
      // instala as 3 armadilhas ao redor do ninho
      this.traps = [0, 1, 2].map((i) => {
        const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
        return { x: this.nest.x + Math.cos(ang) * 130, y: this.nest.y + Math.sin(ang) * 130, cd: 0 };
      });
    }
  }

  onQueenDead(): void {
    if (this.gameOver) return;
    // Rainha eterna (carta 5A): revive 1× com 50% de fome e ninho
    if (this.cardMods.queenRevive && !this.queenReviveUsed) {
      this.queenReviveUsed = true;
      this.queen.dead = false;
      this.queen.hunger = Math.round(this.queen.hungerMax * 0.5);
      this.nestHp = Math.max(this.nestHp, Math.round(this.nestHpMax() * 0.5));
      this.audio.play('win');
      this.pushToast('👑 A Rainha Eterna renasce das cinzas!', 'success');
      this.publishHud();
      return;
    }
    this.gameOver = true;
    this.clock.paused = true;
    this.audio.play('kill');
    this.pushToast('A rainha morreu de fome...', 'danger');
    this.events.emit('run_end', { reason: 'queen_hunger_zero' });
    this.publishHud();
  }

  onBossDefeated(e: Enemy): void {
    const cfg = MAPS[this.mapId].boss;
    for (const [kind, n] of Object.entries(cfg.drops)) {
      this.grantResource(kind as ResourceKind, n ?? 0);
    }
    this.addXp(e.xp);
    this.totals.bossesKilled++;
    // [P 5B] quitina dos chefes (Coletor de quitina dá extra)
    const quitina = 2 + this.cardMods.chitinPerBoss;
    this.chitin += quitina;
    this.pushWorldText(e.x, e.y - e.scale * 0.55 - 20, `+${quitina} 🦴`, '220,170,110', 1.6);
    this.progressBoss();
    this.checkAchievements();
    this.audio.play('win');
    this.pushToast(`🏆 ${cfg.name} derrotado! +${e.xp} XP, recursos e ${quitina} quitina!`, 'success');
    // [P 5B] baú do chefe: 5 escolhas com 1 rara garantida; 2º chefe → lendário
    this.bossesThisRun++;
    this.pendingCardPanels.push(this.bossesThisRun === 2 ? 'bau_lendario' : 'bau_chefe');
    this.openCardPanelIfNeeded();
  }

  onMapUnlocked(mapId: MapId): void {
    if (this.unlockedMaps.includes(mapId)) return;
    this.unlockedMaps.push(mapId);
    this.audio.play('win');
    this.pushToast(`🗺️ NOVO MAPA LIBERADO: ${MAPS[mapId].name}!`, 'success');
    writeSave(serialize(this));
  }

  rebuildResourceIndex(): void {
    this.resourceIndex.clear();
    for (const r of this.resources) {
      if (r.amount > 0) this.resourceIndex.insert(r);
    }
  }

  recomputeFogActive(): void {
    // Mapeadoras (carta 5B): visão passiva do bando ampliada
    const passiva = FOG.PASSIVE_RADIUS * (1 + this.cardMods.passiveRevealPct / 100);
    const sources: Array<{ x: number; y: number; r: number }> = this.ants.map((a) => ({
      x: a.x, y: a.y,
      r: a.cls === 'scout' ? FOG.SCOUT_RADIUS + this.cardMods.scoutRevealBonus : passiva,
    }));
    sources.push({ x: this.nest.x, y: this.nest.y, r: FOG.NEST_RADIUS });
    this.fog.recomputeActive(sources);
  }

  // ═════════════════════════ CICLO DE VIDA ═════════════════════════

  attach(canvas: HTMLCanvasElement): void {
    this.renderer = new Renderer(canvas, this.camera, this.sprites);
    if (!this.running) {
      this.running = true;
      this.lastFrameMs = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  detach(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.renderer?.dispose();
    this.renderer = null;
  }

  private loop = (nowMs: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, ENGINE.MAX_FRAME_SEC);
    this.lastFrameMs = nowMs;

    this.clock.frame(nowMs, (dt) => stepSimulation(this, dt));
    if (!this.clock.paused) {
      this.camera.update(frameDt, this.followTarget(), this.keys);
    }
    this.renderer?.draw(this);

    if (nowMs - this.lastHudMs >= 1000 / ENGINE.HUD_PUBLISH_HZ) {
      this.lastHudMs = nowMs;
      this.publishHud();
    }
    if (this.runActive && !this.gameOver && nowMs - this.lastSaveMs >= SAVE.PERIODIC_MS) {
      this.lastSaveMs = nowMs;
      writeSave(serialize(this));
    }
  };

  private followTarget(): { x: number; y: number } {
    const sel = this.ants.find((a) => a.id === this.selectedAntId);
    if (sel) return { x: sel.x, y: sel.y };
    return { x: this.nest.x, y: this.nest.y };
  }

  // ═════════════════════════ PARTIDA ═══════════════════════════════

  private loadWorld(mapId: MapId): void {
    this.mapId = mapId;
    const world = generateWorld(mapId);
    this.w = world.w;
    this.h = world.h;
    this.props = world.props;
    // [O] o original NÃO tem fauna ambiente: inimigos só vêm das ondas
    this.resources = [];
    this.enemies = [];
    this.nest = { x: world.nestX, y: world.nestY, hp: this.nestHp, hpMax: this.nestHpMax() };
    this.fog = new FogOfWar(world.w, world.h);
    this.camera.setWorldSize(world.w, world.h);
    // [O] maxRes: teto de nós por tipo para a regeneração
    this.maxRes = { [MAPS[mapId].resource]: MAPS[mapId].resourceCount };
    this.rebuildResourceIndex();
  }

  /** [O computeFrontier] menor anel totalmente revelado a partir de 2 células. */
  computeFrontier(): void {
    const cell = FOG.CELL;
    const maxR = Math.hypot(
      Math.max(this.nest.x, this.w - this.nest.x),
      Math.max(this.nest.y, this.h - this.nest.y),
    );
    let r = cell * 2;
    while (r < maxR) {
      let revealed = true;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        if (!this.fog.isRevealed(this.nest.x + Math.cos(a) * r, this.nest.y + Math.sin(a) * r)) {
          revealed = false;
          break;
        }
      }
      if (!revealed) break;
      r += cell;
    }
    this.frontierR = Math.max(cell * 2, r);
  }

  /** [O buildWorld] revela o ninho e semeia os recursos INICIAIS na área
   *  revelada: maxRes × exploredFactor (piso 15%), a ≥170px do ninho. */
  private seedWorld(): void {
    this.fog.reveal(this.nest.x, this.nest.y, FOG.NEST_RADIUS);
    this.computeFrontier();
    this.exploredPct = Math.round(this.fog.revealedFraction() * 100);
    const kind = MAPS[this.mapId].resource;
    const factor = Math.max(RESOURCE_REGEN.FACTOR_MIN, this.exploredPct / 100);
    const n = Math.round((this.maxRes[kind] ?? 0) * factor);
    for (let i = 0; i < n; i++) this.spawnResource(kind);
    this.rebuildResourceIndex();
    // [P 5B] um baú de exploração começa escondido no mapa
    this.spawnChest();
  }

  private populate(): void {
    this.ants = [];
    this.ownedAnts = { worker: 0, soldier: 0, scout: 0 };
    const add = (cls: AntClass, n: number) => {
      for (let i = 0; i < n; i++) {
        this.ownedAnts[cls] += 1;
        this.spawnAnt(cls);
      }
    };
    for (const [cls, n] of Object.entries(POPULATION.START) as Array<[AntClass, number]>) {
      add(cls, n);
    }
    // formigas extras já compradas na loja
    add('worker', (this.upgrades.antlimit ?? 0) * 5);
    add('soldier', (this.upgrades.soldier ?? 0) * 5);
    add('scout', (this.upgrades.scout ?? 0) * 5);
  }

  newGame(mapId: MapId = 'campo'): void {
    resetAntIds();
    resetEnemyIds();
    this.runActive = true;
    this.gameOver = false;
    this.toasts = [];
    this.selectedAntId = null;
    this.tick = 0;
    this.timeSec = 0;
    this.xp = 0;
    this.level = 1;
    this.wallet = emptyResources();
    for (const [k, v] of Object.entries(ECONOMY.START_RESOURCES)) {
      this.wallet[k as ResourceKind] = v ?? 0;
    }
    this.upgrades = emptyUpgrades();
    this.mods = modsFrom(this.upgrades, this.rebirths);
    // [doc 03 §1] cartas são POR PARTIDA: zeram a cada run/renascimento
    this.cards = {};
    this.cardMods = emptyCardMods();
    this.pendingCardPanels = [];
    this.cardPanel = null;
    this.replaceDialog = null;
    this.queenReviveUsed = false;
    this.lastCapWasteToastT = -999;
    this.cardTimers = { swarmT: 8, acidT: 20, chargeT: 30, guardCd: 0 };
    this.traps = [];
    this.chests = [];
    this.nextChestId = 1;
    this.chitin = 0;
    this.bossesThisRun = 0;
    this.classesDesbloqueadas = [];
    this.acidProjectiles = [];
    this.clock.setSpeed(1);
    this.slotBonus = { especializacao: 0, comportamento: 0, passiva: 0 };
    this.eggCycle = 0;
    // [O] totais e conquistas são CUMULATIVOS (persistem entre runs);
    // missões reiniciam a cada run/renascimento
    this.unlockedMaps = ['campo'];
    this.wavesByMap = {};
    this.queen = createQueenState();
    this.nestHp = NEST.HP_MAX;
    this.missionsProgress = {};
    this.missionsDone = [];
    this.respawnQueue = [];
    this.reviveEvents = [];
    this.worldTexts = [];
    this.dust = [];
    this.buffWaves = [];
    this.rally = { attackBuffT: 0, collectBuffT: 0, attackCd: 0, collectCd: 0 };
    this.bossAggroT = 0;
    this.bossFirstHit = false;
    this.bossThrowT = 0;
    this.smashFx = [];
    this.shake = 0;
    this.wave = { num: 0, active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0 };
    this.rng = new Rng((Date.now() & 0x7fffffff) || 1);

    this.loadWorld(mapId);
    this.populate();
    this.seedWorld();
    this.recomputeFogActive();

    this.camera.mode = 'follow';
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();

    this.clock.reset(performance.now());
    this.clock.paused = false;
    this.audio.play('click');
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    this.events.emit('run_start', { seed: 0, mapId });
    writeSave(serialize(this));
  }

  continueGame(): boolean {
    const save = loadSave();
    if (!save) return false;
    if (!applySave(this, save)) return false;
    this.runActive = true;
    this.clock.paused = this.gameOver;
    // painel que ficou pendente ao sair do jogo volta aberto
    this.openCardPanelIfNeeded();
    this.recomputeFogActive();
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.publishHud();
    return true;
  }

  backToMenu(): void {
    if (this.runActive) writeSave(serialize(this));
    this.runActive = false;
    this.cardPanel = null; // painel volta a abrir no "continuar" (pendente no save)
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'menu' });
    this.publishHud();
  }

  restart(): void {
    this.newGame(this.mapId);
  }

  // ═════════════════════════ AÇÕES DA UI ═══════════════════════════

  buyUpgrade(id: string): boolean {
    const def = upgradeById(id);
    if (!def || !this.runActive || this.gameOver) return false;
    const bought = this.upgrades[id] ?? 0;
    if (bought >= def.max) return false;

    // [P 5A] teto de população: Ninhada maior amplia; Turno extra só operárias
    if (id === 'antlimit' || id === 'soldier' || id === 'scout') {
      const total = this.ownedAnts.worker + this.ownedAnts.soldier + this.ownedAnts.scout;
      const teto = this.populationMax() + (id === 'antlimit' ? this.cardMods.workerPopMaxBonus : 0);
      if (total + 5 > teto) {
        this.pushToast('🐜 População máxima! (Ninhada maior/Turno extra aumentam o teto)', 'warn');
        return false;
      }
    }

    // [O] nesthp custa VÁRIOS recursos (ob(l)); os demais, um só
    if (def.multiCost) {
      const costs = nesthpCost(bought);
      if (!costs.every((c) => (this.wallet[c.kind] ?? 0) >= c.amount)) return false;
      for (const c of costs) this.wallet[c.kind] -= c.amount;
    } else {
      const cost = upgradeCost(def, bought);
      if (!this.takeResource(cost.kind, cost.amount)) return false;
    }

    this.upgrades = { ...this.upgrades, [id]: bought + 1 };
    this.mods = modsFrom(this.upgrades, this.rebirths);

    if (def.id === 'antlimit') {
      this.ownedAnts.worker += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('worker');
    }
    if (def.id === 'soldier') {
      this.ownedAnts.soldier += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('soldier');
    }
    if (def.id === 'scout') {
      this.ownedAnts.scout += 5;
      for (let i = 0; i < 5; i++) this.spawnAnt('scout');
    }
    if (def.id === 'nesthp') {
      // [O] w.nestHp = qn + upgrades.nesthp × Er
      const max = this.nestHpMax();
      this.nest.hpMax = max;
      this.nestHp = Math.min(max, this.nestHp + NEST.HP_PER_UPGRADE);
    }

    this.audio.play('click');
    this.pushToast(`${def.name} — nível ${bought + 1}!`, 'success');
    // MELHORIA VISÍVEL: onda colorida sai do ninho e as formigas brilham
    this.pushBuffWave(COR_CATEGORIA[def.category] ?? '251,208,70', ALVO_UPGRADE[def.id] ?? 'todas');
    this.publishHud();
    writeSave(serialize(this));
    return true;
  }

  selectMap(mapId: MapId): boolean {
    if (!this.unlockedMaps.includes(mapId) || mapId === this.mapId) return false;
    this.wavesByMap[this.mapId] = this.wave.num;
    resetAntIds();
    resetEnemyIds();
    this.wave = {
      num: this.wavesByMap[mapId] ?? 0,
      active: false, tSec: WAVES.CALM_SEC, spawned: 0, spawnT: 0,
    };
    this.selectedAntId = null;
    this.loadWorld(mapId);
    this.populate();
    this.seedWorld();
    this.recomputeFogActive();
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();
    this.pushToast(`${MAPS[mapId].name} — boa exploração!`, 'info');
    this.publishHud();
    writeSave(serialize(this));
    return true;
  }

  setCameraMode(mode: CameraMode): void {
    this.camera.mode = mode;
    this.publishHud();
  }

  centerCamera(): void {
    this.selectedAntId = null;
    this.camera.mode = 'follow';
    this.camera.cx = this.nest.x;
    this.camera.cy = this.nest.y;
    this.camera.clamp();
    this.publishHud();
  }

  cycleAnt(): void {
    if (this.ants.length === 0) {
      this.selectedAntId = null;
      this.publishHud();
      return;
    }
    const idx = this.ants.findIndex((a) => a.id === this.selectedAntId);
    const next = this.ants[(idx + 1) % this.ants.length] as Ant;
    this.selectedAntId = next.id;
    this.camera.mode = 'follow';
    this.publishHud();
  }

  clickWorld(worldX: number, worldY: number): 'interior' | null {
    const d = Math.hypot(worldX - this.nest.x, worldY - this.nest.y);
    return d <= 90 ? 'interior' : null; // [O] toque no ninho < 90
  }

  enterInterior(): void {
    if (!this.runActive || this.gameOver) return;
    this.clock.paused = true;
    this.store.publish({ ...this.store.getSnapshot(), screen: 'interior' });
    this.publishHud();
  }

  exitInterior(): void {
    this.store.publish({ ...this.store.getSnapshot(), screen: 'game' });
    this.clock.paused = this.gameOver;
    this.publishHud();
  }

  togglePause(): void {
    this.clock.paused = !this.clock.paused;
    this.publishHud();
  }

  /** [O OPCOES] efeitos sonoros on/off (persiste formigueiro-sound-v1) */
  toggleMute(): void {
    this.audio.setSound(!this.audio.soundOn);
    this.publishHud();
  }

  /** [O OPCOES] musica on/off (persiste formigueiro-music-v1) */
  toggleMusic(): void {
    this.audio.setMusic(!this.audio.musicOn);
    this.publishHud();
  }

  /** [O OPCOES] resetar progresso: apaga save e volta ao zero */
  resetProgress(): void {
    try {
      window.localStorage.removeItem(SAVE.KEY);
    } catch { /* storage indisponível */ }
    this.achievementsDone = [];
    this.missionsDone = [];
    this.rebirths = 0;
    this.publishHud();
  }

  /** [O menu SAIR] he(): Android.exit → window.close → toast */
  exitGame(): void {
    const android = (window as unknown as { Android?: { exit?: () => void } }).Android;
    if (android?.exit) {
      android.exit();
      return;
    }
    window.close();
    // window.close() raramente fecha abas do usuário: confirma e avisa
    window.setTimeout(() => {
      this.pushToast('Use o botão do navegador para fechar.', 'info');
    }, 150);
  }

  /** [O CREDITOS] tela cheia com toasts exatos do original */
  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      this.pushToast(
        document.fullscreenEnabled
          ? 'Tela cheia bloqueada neste preview. Use F11.'
          : 'Este navegador não suporta tela cheia. Use F11.',
        'info',
      );
    }
  }

  panCamera(dxScreen: number, dyScreen: number): void {
    this.camera.mode = 'free';
    this.camera.pan(dxScreen / this.camera.zoom, dyScreen / this.camera.zoom);
  }

  keyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  keyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  // ═════════════════════ MISSÕES/CONQUISTAS [O] ═════════════════════

  private missionTotals(): MissionTotals {
    return {
      resources: this.totals.delivered,
      enemies: this.totals.enemiesKilled,
      bosses: this.totals.bossesKilled,
      byResource: this.totals.byResource,
      byEnemy: this.totals.byEnemy,
    };
  }

  /** [O] progressResource: atualiza missões de recurso e completa as prontas */
  progressResource(kind: ResourceKind, units: number): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'resource' || m.track.kind !== kind) continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + units;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  /** [O] progressEnemy */
  progressEnemy(kind: EnemyKind): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'enemy' || m.track.kind !== kind) continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + 1;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  /** [O] progressBoss */
  progressBoss(): void {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (m.track.type !== 'bosses') continue;
      this.missionsProgress[m.id] = (this.missionsProgress[m.id] ?? 0) + 1;
      if ((this.missionsProgress[m.id] ?? 0) >= m.goal) this.completeMission(m);
    }
  }

  private completeMission(m: (typeof MISSIONS)[number]): void {
    this.missionsDone.push(m.id);
    this.addXp(m.rewardXp);
    this.audio.play('win');
    this.pushToast(`📜 Missão concluída: ${m.title}! +${m.rewardXp} XP`, 'success');
  }

  /** [O] checkAchievements: completam sozinhas, dão XP+recursos+formigas */
  checkAchievements(): void {
    const totals = this.missionTotals();
    for (const a of ACHIEVEMENTS) {
      if (this.achievementsDone.includes(a.id)) continue;
      if (trackValue(a.track, totals) < a.goal) continue;
      this.achievementsDone.push(a.id);
      for (const [kind, n] of Object.entries(a.rewardResources)) {
        this.grantResource(kind as ResourceKind, n ?? 0);
      }
      for (const [cls, n] of Object.entries(a.rewardAnts)) {
        for (let i = 0; i < (n ?? 0); i++) {
          this.ownedAnts[cls as AntClass] += 1;
          this.spawnAnt(cls as AntClass);
        }
      }
      this.addXp(a.rewardXp);
      this.audio.play('win');
      this.pushToast(`🏆 Conquista: ${a.title}! +${a.rewardXp} XP`, 'success');
    }
  }

  /** [O advanceWave] adianta a próxima onda em troca de recursos. */
  advanceWave(): boolean {
    if (!this.runActive || this.gameOver || this.wave.active) return false;
    const kind = MAPS[this.mapId].resource;
    const n = 3 + this.wave.num + 1;
    this.grantResource(kind, n);
    this.wave.tSec = 0;
    this.audio.play('click');
    this.pushToast(`Onda adiantada! +${n} ${RESOURCES[kind].name}.`, 'success');
    this.publishHud();
    return true;
  }

  // ═════════════════════ COMANDOS DE TOQUE [O] ═════════════════════

  /** [O callScouts] toque simples: exploradoras acorrem ao ponto. */
  callScouts(x: number, y: number): void {
    if (!this.runActive || this.gameOver) return;
    const cx = Math.min(this.w - 30, Math.max(30, x));
    const cy = Math.min(this.h - 30, Math.max(30, y));
    for (const a of this.ants) {
      if (a.cls !== 'scout' || a.z > 0) continue;
      const p = (14 + this.rng.next() * 34) / this.cardMods.commandRangeMult;
      const ang = this.rng.next() * Math.PI * 2;
      a.tx = cx + Math.cos(ang) * p;
      a.ty = cy + Math.sin(ang) * p;
      a.state = 'command';
      a.scoutTx = a.tx;
      a.scoutTy = a.ty;
    }
    this.tapMarks.push({ x: cx, y: cy, t: 0.45, color: '102,202,104' });
    this.audio.play('click');
  }

  /** [O callSoldiers] toque duplo: soldados acorrem ao ponto. */
  callSoldiers(x: number, y: number): void {
    if (!this.runActive || this.gameOver) return;
    const cx = Math.min(this.w - 30, Math.max(30, x));
    const cy = Math.min(this.h - 30, Math.max(30, y));
    for (const a of this.ants) {
      if (a.cls !== 'soldier' || a.z > 0) continue;
      const p = (14 + this.rng.next() * 34) / this.cardMods.commandRangeMult;
      const ang = this.rng.next() * Math.PI * 2;
      a.tx = cx + Math.cos(ang) * p;
      a.ty = cy + Math.sin(ang) * p;
      a.state = 'command';
      a.targetEnemyId = null;
    }
    this.tapMarks.push({ x: cx, y: cy, t: 0.45, color: '240,101,92' });
    this.audio.play('click');
  }

  // ═════════════════════ RALLY / RENASCER [O] ═══════════════════════

  /** [O] ATACAR!: 6s de buff, soldados partem para o inimigo mais próximo */
  rallyAttack(): boolean {
    if (!this.runActive || this.gameOver || this.rally.attackCd > 0) return false;
    this.rally.attackBuffT = RALLY.ATTACK_BUFF_SEC;
    this.rally.attackCd = RALLY.ATTACK_CD_SEC;
    for (const a of this.ants) {
      if (a.cls !== 'soldier' || a.z > 0) continue;
      const enemy = this.nearestVisibleEnemy(a.x, a.y, 1e5);
      if (enemy) {
        a.targetEnemyId = enemy.id;
        a.tx = enemy.x;
        a.ty = enemy.y;
        a.state = 'command';
        a.targetResId = null;
      }
    }
    this.audio.play('click');
    this.pushToast('⚔️ Soldados convocados ao ataque!', 'info');
    this.publishHud();
    return true;
  }

  /** [O] COLETA!: 8s de velocidade ×1.6 para as operárias */
  rallyCollect(): boolean {
    if (!this.runActive || this.gameOver || this.rally.collectCd > 0) return false;
    this.rally.collectBuffT = RALLY.COLLECT_BUFF_SEC;
    this.rally.collectCd = RALLY.COLLECT_CD_SEC;
    this.audio.play('click');
    this.pushToast('🍃 Operárias em ritmo de colheita!', 'info');
    this.publishHud();
    return true;
  }

  /** [O] Renascimento: zera a run e deixa bônus permanentes */
  rebirth(): boolean {
    if (!this.runActive) return false;
    this.rebirths += 1;
    // [O] x.missions={}, x.missionsDone=[] — conquistas e totais persistem
    const rebirths = this.rebirths;
    this.newGame('campo');
    this.rebirths = rebirths;
    this.mods = modsFrom(this.upgrades, this.rebirths);
    this.audio.play('win');
    this.pushToast(
      `Renascimento ${this.rebirths}! A colônia volta mais forte.`,
      'success',
    );
    this.publishHud();
    return true;
  }

  // ═════════════════════════ HUD ═══════════════════════════════════

  publishHud(): void {
    const antsCount: Record<AntClass, number> = { ...this.ownedAnts };

    const shopCosts: HudState['shopCosts'] = {};
    for (const def of UPGRADES) {
      const bought = this.upgrades[def.id] ?? 0;
      const cost = upgradeCost(def, bought);
      shopCosts[def.id] = {
        kind: cost.kind, amount: cost.amount, maxed: bought >= def.max,
        multi: def.multiCost ? nesthpCost(bought) : undefined,
      };
    }

    const boss = this.boss;

    this.store.publish({
      screen: this.store.getSnapshot().screen,
      runActive: this.runActive,
      gameOver: this.gameOver,
      mapId: this.mapId,
      unlockedMaps: [...this.unlockedMaps],
      exploredPct: this.exploredPct,
      runSeconds: this.clock.runSeconds,
      resources: { ...this.wallet },
      level: this.level,
      xp: this.xp,
      xpToNext: 50 + 25 * (this.level - 1),
      queenHunger: this.queen.hunger,
      queenHungerMax: this.queen.hungerMax,
      nestHp: this.nestHp,
      nestHpMax: this.nestHpMax(),
      ants: antsCount,
      wave: { ...this.wave },
      boss: boss ? { name: MAPS[this.mapId].boss.name, hp: boss.hp, hpMax: boss.hpMax } : null,
      cameraMode: this.camera.mode,
      selectedAntId: this.selectedAntId,
      paused: this.clock.paused,
      totals: { ...this.totals },
      upgrades: { ...this.upgrades },
      shopCosts,
      hasSave: saveExists(),
      toasts: [...this.toasts],
      rally: {
        attackCd: Math.ceil(this.rally.attackCd),
        collectCd: Math.ceil(this.rally.collectCd),
        attackBuff: Math.ceil(this.rally.attackBuffT),
        collectBuff: Math.ceil(this.rally.collectBuffT),
      },
      bossAggro: this.bossAggroT > 0,
      missions: {
        done: this.missionsDone.length,
        total: MISSIONS.length,
        progress: MISSIONS.map((m) => ({
          id: m.id, title: m.title, desc: m.desc,
          value: Math.min(m.goal, this.missionsProgress[m.id] ?? 0),
          goal: m.goal, rewardXp: m.rewardXp,
          done: this.missionsDone.includes(m.id),
        })),
      },
      achievements: {
        done: this.achievementsDone.length,
        total: ACHIEVEMENTS.length,
        progress: ACHIEVEMENTS.map((a) => ({
          id: a.id, title: a.title, desc: a.desc,
          value: Math.min(a.goal, trackValue(a.track, this.missionTotals())),
          goal: a.goal,
          done: this.achievementsDone.includes(a.id),
        })),
      },
      rebirths: this.rebirths,
      score: this.score,
      chitin: this.chitin,
      cardPanel: this.cardPanel
        ? { level: this.cardPanel.level, origem: this.cardPanel.origem, choices: [...this.cardPanel.choices] }
        : null,
      cards: Object.entries(this.cards)
        .filter(([, nv]) => nv > 0)
        .map(([id, nv]) => {
          const c = cardById(id);
          return c
            ? { id, nome: c.nome, icone: c.icone, raridade: c.raridade, nivel: nv, nivelMax: c.valores.length, categoria: c.categoria, eixo: c.eixo }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      slots: this.slotUsage(),
      replaceDialog: this.replaceDialog ? { novaId: this.replaceDialog.novaId, opcoes: [...this.replaceDialog.opcoes] } : null,
      speed: this.clock.speed,
      unlockedClasses: [...this.classesDesbloqueadas],
    });
  }
}
