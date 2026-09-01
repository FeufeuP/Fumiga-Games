/**
 * Passo de simulação (delta fixo 60 Hz) — o coração do jogo:
 * ondas 20s/90s, spawn na sombra, IA de inimigos, combate, fome da Rainha,
 * regeneração/reparo do ninho, XP/níveis, exploração e desbloqueio de mapas.
 */
import {
  ANT_RESPAWN, BOSS_SMASH, ENEMIES, ENGINE, FOG, MAPS, MAP_UNLOCK, NEST,
  RESOURCE_REGEN, RALLY, WAVES, XP,
  levelFromXp, type EnemyKind, type MapId, type ResourceKind,
} from '../core/constants';
import { updateAnt } from '../entities/ants';
import { createEnemy, createBoss, updateEnemy } from '../entities/enemies';
import { updateQueen, nestRegen, nestRepair } from '../systems/queen';
import { applySeparation, clampToWorld } from './movement';
import type { Ant, AntClass, AntWorld, Enemy, Toast } from '../core/types';

export interface SimHost extends AntWorld {
  ants: Ant[];
  enemies: Enemy[];
  damageAnt(antId: number, dmg: number, by: EnemyKind, fromX?: number, fromY?: number): void;
  damageNest(dmg: number, fromX?: number, fromY?: number): void;
  readonly boss: Enemy | null;
  readonly mapId: MapId;
  timeSec: number;
  tick: number;
  toasts: Toast[];
  gameOver: boolean;

  // economia / meta
  wallet: Record<ResourceKind, number>;
  xp: number;
  level: number;
  wave: { num: number; active: boolean; tSec: number; spawned: number; spawnT: number };
  exploredPct: number;

  // rainha / ninho
  queen: { hunger: number; dead: boolean; feedT: number; warn30: boolean; warn10: boolean };
  nestHp: number;

  spawnAnt(cls: AntClass): void;
  spawnWaveEnemy(power?: number): void;
  spawnBoss(): void;
  pushToast(text: string, kind: Toast['kind']): void;
  onLevelUp(level: number): void;
  onQueenDead(): void;
  onBossDefeated(e: Enemy): void;
  onMapUnlocked(mapId: MapId): void;
  rebuildResourceIndex(): void;
  recomputeFogActive(): void;

  // ── ciclo A [O] ──────────────────────────────────────────────────
  /** contagem de formigas por classe (estado, não derivada) */
  ownedAnts: Record<AntClass, number>;
  /** fila do cemitério: {cls, t} */
  respawnQueue: Array<{ cls: AntClass; t: number }>;
  /** buffs/cds do rally */
  rally: { attackBuffT: number; collectBuffT: number; attackCd: number; collectCd: number };
  /** chefe: aggro 4s pós-dano e smash após o 1º golpe */
  bossAggroT: number;
  bossFirstHit: boolean;
  bossThrowT: number;
  smashFx: Array<{ x: number; y: number; t: number }>;
  shake: number;
  /** anel de fronteira da exploração [O] */
  frontierR: number;
  frontierT: number;
  /** marcas de toque [O] */
  tapMarks: Array<{ x: number; y: number; t: number; color: string }>;
  /** regeneração de recursos */
  regenT: number;
  maxRes: Partial<Record<ResourceKind, number>>;
  spawnResource(kind: ResourceKind): void;
  killAnt(a: Ant): void;
  onAntRespawned(cls: AntClass): void;
}

export function stepSimulation(host: SimHost, dt: number): void {
  host.tick++;
  host.timeSec += dt;

  updateWaves(host, dt);

  // ── formigas ─────────────────────────────────────────────────────
  for (const a of host.ants) updateAnt(a, host, dt);
  updateAntFlight(host, dt);
  if (host.tick % ENGINE.SEPARATION_EVERY_STEPS === 0) {
    applySeparation(host.ants, dt * ENGINE.SEPARATION_EVERY_STEPS, 14);
  }
  for (const a of host.ants) clampToWorld(a, host.w, host.h);

  // ── timers do ciclo A [O] ────────────────────────────────────────
  updateRally(host, dt);
  updateBossTimers(host, dt);
  updateRespawnQueue(host, dt);
  updateResourceRegen(host, dt);
  updateFrontier(host, dt);
  for (const m of host.tapMarks) m.t -= dt;
  if (host.tapMarks.some((m) => m.t <= 0)) {
    host.tapMarks = host.tapMarks.filter((m) => m.t > 0);
  }
  for (const f of host.smashFx) f.t -= dt;
  if (host.smashFx.some((f) => f.t <= 0)) {
    host.smashFx = host.smashFx.filter((f) => f.t > 0);
  }
  host.shake = Math.max(0, host.shake - dt * 1.6);

  // ── inimigos (morta a formiga, sai da lista) ─────────────────────
  for (const e of host.enemies) {
    updateEnemy(e, host, dt);
    clampToWorld(e, host.w, host.h);
  }
  if (host.enemies.some((e) => e.hp <= 0)) {
    for (const e of host.enemies) {
      if (e.hp > 0) continue;
      if (e.boss) host.onBossDefeated(e);
    }
    host.enemies = host.enemies.filter((e) => e.hp > 0);
  }
  if (host.ants.some((a) => a.hp <= 0)) {
    for (const a of host.ants) {
      if (a.hp <= 0) host.killAnt(a);
    }
    host.ants = host.ants.filter((a) => a.hp > 0);
  }

  // ── névoa: SÓ a exploradora revela (fogCell×2) [O] ───────────────
  for (const a of host.ants) {
    if (a.cls === 'scout') host.fog.reveal(a.x, a.y, FOG.SCOUT_RADIUS);
  }
  if (host.tick % Math.max(1, Math.round(60 / ENGINE.FOG_ACTIVE_HZ)) === 0) {
    host.recomputeFogActive();
    host.rebuildResourceIndex();
  }

  // ── Rainha ───────────────────────────────────────────────────────
  if (!host.gameOver) {
    updateQueen(host.queen, {
      takeFoodItem: () => {
        for (const kind of ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'] as ResourceKind[]) {
          if ((host.wallet[kind] ?? 0) > 0) {
            host.wallet[kind] -= 1;
            return kind;
          }
        }
        return null;
      },
      workerCount: () => host.ownedAnts.worker,
      toast: (text, kind) => host.pushToast(text, kind),
      onQueenDead: () => host.onQueenDead(),
    }, dt);

    // ── ninho: regen fora de combate ou reparo em ruína ────────────
    const enemyNear = host.enemies.some(
      (e) =>
        host.fog.isRevealed(e.x, e.y) &&
        Math.hypot(e.x - host.nest.x, e.y - host.nest.y) < NEST.REGEN_ENEMY_RADIUS,
    );
    if (host.nestHp > 0) {
      host.nestHp = nestRegen(host.nestHp, NEST.HP_MAX, enemyNear, dt);
    } else {
      const workers = host.ants.filter((a) => a.cls === 'worker' && a.hp > 0).length;
      const r = nestRepair(host.nestHp, NEST.HP_MAX, workers, dt);
      if (r.rebuilt) {
        host.nestHp = r.hp;
        host.pushToast('O formigueiro foi reconstruído pelas operárias!', 'success');
      } else {
        host.nestHp = r.hp;
      }
    }
  }

  // ── XP / nível ───────────────────────────────────────────────────
  const lv = levelFromXp(host.xp);
  if (lv > host.level) {
    host.level = lv;
    host.onLevelUp(lv);
  }

  // ── exploração (0,5s) e desbloqueio ─────────────────────────────
  if (host.tick % 30 === 0) {
    host.exploredPct = Math.round(host.fog.revealedFraction() * 100);
    const unlock = MAP_UNLOCK[host.mapId];
    if (unlock && host.exploredPct >= unlock.pct) {
      host.onMapUnlocked(unlock.next);
    }
  }

  // ── toasts ───────────────────────────────────────────────────────
  for (const t of host.toasts) t.tSec -= dt;
  if (host.toasts.some((t) => t.tSec <= 0)) {
    host.toasts = host.toasts.filter((t) => t.tSec > 0);
  }
}

// ═════════════════════════════ ONDAS ═══════════════════════════════

function updateWaves(host: SimHost, dt: number): void {
  const w = host.wave;

  if (w.active) {
    w.tSec -= dt;
    w.spawnT -= dt;
    const total = WAVES.COUNT_PER_WAVE(w.num);
    const concurrent = host.enemies.filter((e) => e.wave).length;

    if (w.tSec > 0 && w.spawnT <= 0 && w.spawned < total && concurrent < WAVES.MAX_CONCURRENT) {
      const batch = Math.min(WAVES.BATCH_SIZE, total - w.spawned);
      for (let i = 0; i < batch; i++) host.spawnWaveEnemy();
      w.spawned += batch;
      const batches = Math.max(1, Math.ceil(total / WAVES.BATCH_SIZE));
      w.spawnT = WAVES.COMBAT_SEC / batches;
    }

    if (w.tSec <= 0) {
      w.active = false;
      w.tSec = WAVES.CALM_SEC;
      waveReward(host);
    }
  } else {
    w.tSec -= dt;
    if (w.tSec <= 0) {
      w.num += 1;
      w.active = true;
      w.tSec = WAVES.COMBAT_SEC;
      w.spawned = 0;
      w.spawnT = 0;
      host.pushToast(`🌊 ONDA ${w.num}! Defenda o formigueiro!`, 'warn');
      if (w.num % WAVES.BOSS_EVERY === 0 && !host.boss) {
        host.spawnBoss();
        for (let i = 0; i < WAVES.BOSS_ESCORTS; i++) {
          host.spawnWaveEnemy(WAVES.BOSS_ESCORT_POWER);
        }
      }
    }
  }
}

/** [O] recompensa por repelir onda: folhas + XP + ninho +20% */
function waveReward(host: SimHost): void {
  const n = host.wave.num;
  const leaves = WAVES.REWARD_LEAVES(n);
  host.wallet.leaf = (host.wallet.leaf ?? 0) + leaves;
  host.xp += XP.WAVE_REWARD_BASE + XP.WAVE_REWARD_PER * n;
  const heal = Math.round(NEST.HP_MAX * WAVES.NEST_HEAL_FRAC);
  const before = host.nestHp;
  host.nestHp = Math.min(NEST.HP_MAX, host.nestHp + heal);
  const healed = Math.round(host.nestHp - before);
  host.pushToast(
    `Onda repelida! +${leaves} folhas${healed > 0 ? ` e o ninho recuperou ${healed} de vida` : ''}.`,
    'success',
  );
}

/** [O] spawn na sombra: procura célula de névoa não revelada num anel */
export function randomShadowSpawn(
  host: SimHost,
  rng: { next(): number },
): { x: number; y: number } | null {
  const cell = host.fog.cell;
  const maxRing = Math.ceil(Math.max(host.w, host.h) / 2 / cell) + 2;
  for (let t = 0; t < 24; t++) {
    const ang = rng.next() * Math.PI * 2;
    for (let ring = 1; ring < maxRing; ring++) {
      const dist = (ring + 0.5) * cell;
      const cx = Math.floor((host.nest.x + Math.cos(ang) * dist) / cell);
      const cy = Math.floor((host.nest.y + Math.sin(ang) * dist) / cell);
      if (cx < 0 || cy < 0 || cx >= host.fog.cols || cy >= host.fog.rows) break;
      if (!host.fog.isRevealed(cx * cell + cell / 2, cy * cell + cell / 2)) {
        return { x: cx * cell + cell / 2, y: cy * cell + cell / 2 };
      }
    }
  }
  // fallback: borda do mundo
  const ang = rng.next() * Math.PI * 2;
  return {
    x: Math.min(host.w - 40, Math.max(40, host.nest.x + Math.cos(ang) * 500)),
    y: Math.min(host.h - 40, Math.max(40, host.nest.y + Math.sin(ang) * 500)),
  };
}

/** Sorteia uma espécie da fauna do mapa [O] waveKinds */
export function pickWaveKind(host: SimHost, rng: { next(): number }): EnemyKind {
  const kinds = MAPS[host.mapId].enemies.map((e) => e.kind);
  if (kinds.length === 0) return 'spider';
  return kinds[Math.floor(rng.next() * kinds.length)] as EnemyKind;
}

export function makeWaveEnemy(host: SimHost, power?: number): Enemy {
  const kind = pickWaveKind(host, host.rng);
  const p = power ?? WAVES.POWER(host.wave.num);
  const h = ENEMIES[kind].r * p;
  const spot = randomShadowSpawn(host, host.rng);
  let x: number;
  let y: number;
  if (spot) {
    x = spot.x + (host.rng.next() - 0.5) * FOG.CELL;
    y = spot.y + (host.rng.next() - 0.5) * FOG.CELL;
  } else {
    // [O] sem sombra: nasce fora de uma borda aleatória
    const side = Math.floor(host.rng.next() * 4);
    const pad = h + WAVES.EDGE_SPAWN_PAD;
    if (side === 0) { x = -pad; y = host.rng.next() * host.h; }
    else if (side === 1) { x = host.w + pad; y = host.rng.next() * host.h; }
    else if (side === 2) { x = host.rng.next() * host.w; y = -pad; }
    else { x = host.rng.next() * host.w; y = host.h + pad; }
  }
  return createEnemy(kind, x, y, p, () => host.rng.next(), { wave: true });
}

export function makeBoss(host: SimHost): Enemy {
  const cfg = MAPS[host.mapId].boss;
  // [O] chefe nasce em ponto livre: ≥240 das bordas, ≥720 do ninho
  let x = host.w / 2;
  let y = 60;
  for (let t = 0; t < 80; t++) {
    const cx = 240 + host.rng.next() * (host.w - 480);
    const cy = 240 + host.rng.next() * (host.h - 480);
    if (Math.hypot(cx - host.nest.x, cy - host.nest.y) < 720) continue;
    if (host.props.some((p) => p.solid && Math.hypot(cx - p.x, cy - p.y) < p.r + cfg.r + 24)) continue;
    x = cx;
    y = cy;
    break;
  }
  const e = createBoss(cfg.kind, cfg.name, x, y, cfg, () => host.rng.next());
  host.pushToast(`CHEFE: ${cfg.name} apareceu na onda ${host.wave.num}!`, 'danger');
  return e;
}

export { ENEMIES };

// ═════════════════════ CICLO A [O] ═════════════════════════════════

/** Física de voo: formiga no ar (z>0) segue balística, sem agir. */
function updateAntFlight(host: SimHost, dt: number): void {
  const G = 900;
  for (const a of host.ants) {
    if (a.z <= 0 && a.vz <= 0) continue;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.z += a.vz * dt;
    a.vz -= G * dt;
    // [O] arrasto horizontal no ar
    const drag = Math.max(0, 1 - 1.6 * dt);
    a.vx *= drag;
    a.vy *= drag;
    a.walkPhase += 12 * dt; // patas pedalando no ar
    if (a.x < 8) { a.x = 8; a.vx = Math.abs(a.vx); }
    if (a.y < 8) { a.y = 8; a.vy = Math.abs(a.vy); }
    if (a.x > host.w - 8) { a.x = host.w - 8; a.vx = -Math.abs(a.vx); }
    if (a.y > host.h - 8) { a.y = host.h - 8; a.vy = -Math.abs(a.vy); }
    if (a.z <= 0) {
      a.z = 0; a.vx = 0; a.vy = 0; a.vz = 0;
      a.stunT = 0.9; // [O] atordoa ao aterrissar
      a.state = 'idle';
      a.targetResId = null;
      a.targetEnemyId = null;
    }
  }
}

/** [O computeFrontier] anel cresce 1 célula quando o anel atual está revelado. */
function updateFrontier(host: SimHost, dt: number): void {
  host.frontierT -= dt;
  if (host.frontierT > 0) return;
  host.frontierT = 0.6;
  const cell = host.fog.cell;
  const maxR = Math.hypot(
    Math.max(host.nest.x, host.w - host.nest.x),
    Math.max(host.nest.y, host.h - host.nest.y),
  );
  if (host.frontierR >= maxR) return;
  // anel revelado? 18 amostras ao redor
  const r = host.frontierR;
  let revealed = true;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (!host.fog.isRevealed(host.nest.x + Math.cos(a) * r, host.nest.y + Math.sin(a) * r)) {
      revealed = false;
      break;
    }
  }
  if (revealed) host.frontierR = Math.min(host.frontierR + cell, maxR);
}

/** Rally: decai buffs e cooldowns. */
function updateRally(host: SimHost, dt: number): void {
  const r = host.rally;
  r.attackBuffT = Math.max(0, r.attackBuffT - dt);
  r.collectBuffT = Math.max(0, r.collectBuffT - dt);
  r.attackCd = Math.max(0, r.attackCd - dt);
  r.collectCd = Math.max(0, r.collectCd - dt);
}

/** Chefe: aggro da barra + smash a cada 15s após o 1º golpe. */
function updateBossTimers(host: SimHost, dt: number): void {
  host.bossAggroT = Math.max(0, host.bossAggroT - dt);
  const boss = host.boss;
  if (!boss || !host.bossFirstHit) return;
  host.bossThrowT -= dt;
  if (host.bossThrowT <= 0) {
    host.bossThrowT = BOSS_SMASH.INTERVAL_SEC;
    bossSmash(host, boss);
  }
}

/** [O] bossSmash: dano + arremesso em área de 90px. */
function bossSmash(host: SimHost, boss: Enemy): void {
  host.shake = Math.max(host.shake, 1);
  host.playSfx('smash');
  host.smashFx.push({ x: boss.x, y: boss.y, t: BOSS_SMASH.RING_SEC });
  for (const a of host.ants) {
    if (Math.hypot(a.x - boss.x, a.y - boss.y) > BOSS_SMASH.RADIUS) continue;
    host.damageAnt(a.id, boss.dmg, boss.kind, boss.x, boss.y);
    if (a.hp <= 0) continue; // morreu com o golpe
    const dx = a.x - boss.x;
    const dy = a.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    const kb = BOSS_SMASH.KNOCKBACK_MIN + host.rng.next() * BOSS_SMASH.KNOCKBACK_RANGE;
    a.vx = (dx / d) * kb;
    a.vy = (dy / d) * kb;
    a.vz = BOSS_SMASH.KNOCKUP_MIN + host.rng.next() * BOSS_SMASH.KNOCKUP_RANGE;
    a.z = Math.max(a.z, 1);
    a.targetResId = null;
    a.targetEnemyId = null;
  }
}

/** [O] cemitério: formigas renascem (YA×(1−0.3·upgrade), mín. 3s). */
function updateRespawnQueue(host: SimHost, dt: number): void {
  for (let i = host.respawnQueue.length - 1; i >= 0; i--) {
    const q = host.respawnQueue[i] as { cls: AntClass; t: number };
    q.t -= dt;
    if (q.t <= 0) {
      host.respawnQueue.splice(i, 1);
      host.spawnAnt(q.cls);
      host.onAntRespawned(q.cls);
    }
  }
}

/** [O] regeneração de recursos: até 2/tipo a cada 0.8s até maxRes×fator. */
function updateResourceRegen(host: SimHost, dt: number): void {
  host.regenT -= dt;
  if (host.regenT > 0) return;
  host.regenT = RESOURCE_REGEN.INTERVAL_SEC;

  const counts: Partial<Record<ResourceKind, number>> = {};
  for (const r of host.resources) {
    if (r.amount > 0) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  }
  const factor = Math.min(1, Math.max(RESOURCE_REGEN.FACTOR_MIN, host.exploredPct / 100));
  for (const kind of Object.keys(host.maxRes) as ResourceKind[]) {
    const target = Math.round((host.maxRes[kind] ?? 0) * factor);
    const deficit = target - (counts[kind] ?? 0);
    for (let i = 0; i < Math.min(RESOURCE_REGEN.MAX_PER_TICK, deficit); i++) {
      host.spawnResource(kind);
    }
  }
  host.rebuildResourceIndex();
}

/** Tempo de respawn [O]: YA×(1−0.3·upgrade), mínimo 3s. */
export function respawnSeconds(respawnLevel: number): number {
  return Math.max(
    ANT_RESPAWN.MIN_SEC,
    ANT_RESPAWN.BASE_SEC * (1 - ANT_RESPAWN.PER_LEVEL_MULT * respawnLevel),
  );
}

/** Rally: multiplicador do cooldown de ataque dos soldados. */
export function soldierAttackCdMult(host: SimHost): number {
  return host.rally.attackBuffT > 0 ? RALLY.ATTACK_SPEED_MULT : 1;
}

