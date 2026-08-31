/**
 * Passo de simulação (delta fixo 60 Hz) — o coração do jogo:
 * ondas 20s/90s, spawn na sombra, IA de inimigos, combate, fome da Rainha,
 * regeneração/reparo do ninho, XP/níveis, exploração e desbloqueio de mapas.
 */
import {
  ENEMIES, ENGINE, MAPS, MAP_UNLOCK, NEST, WAVES, XP,
  levelFromXp, type EnemyKind, type MapId, type ResourceKind,
} from '../core/constants';
import { updateAnt, revealRadiusOf } from '../entities/ants';
import { createEnemy, createBoss, updateEnemy } from '../entities/enemies';
import { updateQueen, nestRegen, nestRepair } from '../systems/queen';
import { applySeparation, clampToWorld } from './movement';
import type { Ant, AntClass, AntWorld, Enemy, Toast } from '../core/types';

export interface SimHost extends AntWorld {
  ants: Ant[];
  enemies: Enemy[];
  damageAnt(antId: number, dmg: number, by: EnemyKind): void;
  damageNest(dmg: number): void;
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
}

export function stepSimulation(host: SimHost, dt: number): void {
  host.tick++;
  host.timeSec += dt;

  updateWaves(host, dt);

  // ── formigas ─────────────────────────────────────────────────────
  for (const a of host.ants) updateAnt(a, host, dt);
  if (host.tick % ENGINE.SEPARATION_EVERY_STEPS === 0) {
    applySeparation(host.ants, dt * ENGINE.SEPARATION_EVERY_STEPS, 14);
  }
  for (const a of host.ants) clampToWorld(a, host.w, host.h);

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
    host.ants = host.ants.filter((a) => a.hp > 0);
  }

  // ── névoa ────────────────────────────────────────────────────────
  for (const a of host.ants) host.fog.reveal(a.x, a.y, revealRadiusOf(a.cls));
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
      workerCount: () => host.ants.filter((a) => a.cls === 'worker' && a.hp > 0).length,
      toast: (text, kind) => host.pushToast(text, kind),
      onQueenDead: () => host.onQueenDead(),
    }, dt);

    // ── ninho: regen fora de combate ou reparo em ruína ────────────
    const enemyNear = host.enemies.some(
      (e) => Math.hypot(e.x - host.nest.x, e.y - host.nest.y) < NEST.REGEN_ENEMY_RADIUS,
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
  const spot = randomShadowSpawn(host, host.rng) ?? { x: host.w / 2, y: 60 };
  return createEnemy(kind, spot.x, spot.y, p, () => host.rng.next(), { wave: true });
}

export function makeBoss(host: SimHost): Enemy {
  const cfg = MAPS[host.mapId].boss;
  const spot = randomShadowSpawn(host, host.rng) ?? { x: host.w / 2, y: 60 };
  const e = createBoss(cfg.kind, cfg.name, spot.x, spot.y, cfg, () => host.rng.next());
  host.pushToast(`CHEFE: ${cfg.name} apareceu na onda ${host.wave.num}!`, 'danger');
  return e;
}

export { ENEMIES };
