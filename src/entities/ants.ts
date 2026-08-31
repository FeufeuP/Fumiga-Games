/**
 * Formigas — as 3 classes do original (pb/vb/K0 do bundle):
 *   Operária: coleta recursos na área descoberta
 *   Soldado:   ataca inimigos próximos na área descoberta
 *   Exploradora: revela a sombra por onde passa
 * Fábrica + comportamentos no mesmo arquivo (código semelhante junto).
 */
import { ANTS, ANT_SPRITE, BEHAVIOR, FOG, type AntClass } from '../core/constants';
import type { Ant, AntWorld } from '../core/types';
import { seek } from '../engine/movement';

let nextAntId = 1;

export function resetAntIds(): void {
  nextAntId = 1;
}

/** após restaurar um save, evita colisão de ids */
export function resumeAntIds(maxId: number): void {
  nextAntId = Math.max(nextAntId, maxId + 1);
}

export function createAnt(cls: AntClass, x: number, y: number, rnd: () => number): Ant {
  const stats = ANTS[cls];
  return {
    id: nextAntId++,
    cls,
    x,
    y,
    dir: 1,
    hp: stats.hp,
    hpMax: stats.hp,
    carrying: 0,
    carryKind: null,
    state: cls === 'scout' ? 'explore' : cls === 'soldier' ? 'patrol' : 'idle',
    timer: 0,
    attackCd: 0,
    targetResId: null,
    targetEnemyId: null,
    tx: x,
    ty: y,
    walkPhase: 0,
    seed: rnd(),
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  };
}

/** Raio de revelação na névoa (fogCell × 1; exploradora × 2 — original). */
export function revealRadiusOf(cls: AntClass): number {
  return cls === 'scout' ? FOG.SCOUT_RADIUS : FOG.PASSIVE_RADIUS;
}

export function antSpeed(a: Ant, w: AntWorld): number {
  // [O] base 82 (scout ×1.35) · upgrade speed +10%/nível · carregando ×0.9
  let v = ANTS[a.cls].speed * w.mods.speedMult;
  if (a.carrying > 0) v *= ANT_SPRITE.CARRY_SLOWDOWN;
  // [O] rally COLETA!: operárias ×1.6 por 8s
  if (a.cls === 'worker' && w.buffs.collectSpeedMult !== 1) {
    v *= w.buffs.collectSpeedMult;
  }
  return v;
}

export function antDamage(a: Ant, w: AntWorld): { dmg: number; crit: boolean } {
  const base = ANTS[a.cls].dmg * w.mods.dmgMult;
  const crit = w.rng.chance(w.mods.critChance);
  return { dmg: crit ? base * w.mods.critMult : base, crit };
}

// ═════════════════════════════ OPERÁRIA (coleta) ═══════════════════

export function updateWorker(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  const detect = BEHAVIOR.WORKER_DETECT * w.mods.visionMult;
  const cap = w.mods.carryCap;

  switch (a.state) {
    case 'idle': {
      if (a.carrying >= cap) {
        a.state = 'returnNest';
        break;
      }
      const res = w.nearestRevealedResource(a.x, a.y, detect);
      if (res) {
        a.targetResId = res.id;
        a.tx = res.x;
        a.ty = res.y;
        a.state = 'gotoResource';
      } else {
        wanderToRevealed(a, w);
      }
      break;
    }

    case 'gotoResource': {
      if (a.targetResId === null) {
        // vagueio até um ponto revelado
        if (seek(a, a.tx, a.ty, speed, dt)) a.state = 'idle';
        break;
      }
      const res = w.resources.find((r) => r.id === a.targetResId && r.amount > 0);
      if (!res) {
        a.state = a.carrying > 0 ? 'returnNest' : 'idle';
        break;
      }
      a.tx = res.x;
      a.ty = res.y;
      // [O] coleta quando dist < R0 + tamanho/2
      const dist = Math.hypot(res.x - a.x, res.y - a.y);
      if (dist <= BEHAVIOR.PICKUP_BASE + BEHAVIOR.RESOURCE_SIZE[res.kind] / 2) {
        a.state = 'harvest';
        a.timer = BEHAVIOR.HARVEST_SEC_PER_UNIT;
      } else {
        seek(a, res.x, res.y, speed, dt);
      }
      break;
    }

    case 'harvest': {
      const res = w.resources.find((r) => r.id === a.targetResId && r.amount > 0);
      if (!res) {
        a.state = a.carrying > 0 ? 'returnNest' : 'idle';
        break;
      }
      a.timer -= dt;
      if (a.timer <= 0) {
        res.amount -= 1;
        a.carrying += 1;
        a.carryKind = res.kind;
        if (res.amount <= 0 || a.carrying >= cap) {
          a.state = 'returnNest';
        } else {
          a.timer = BEHAVIOR.HARVEST_SEC_PER_UNIT;
        }
      }
      break;
    }

    case 'returnNest': {
      if (seek(a, w.nest.x, w.nest.y, speed, dt)) {
        const kind = a.carryKind;
        const units = a.carrying;
        if (kind && units > 0) w.deposit(units, kind, 'worker');
        a.carrying = 0;
        a.carryKind = null;
        a.targetResId = null;
        a.state = 'idle';
      }
      break;
    }

    default:
      a.state = 'idle';
  }
}

function wanderToRevealed(a: Ant, w: AntWorld): void {
  for (let tries = 0; tries < 6; tries++) {
    const tx = w.rng.float(40, w.w - 40);
    const ty = w.rng.float(40, w.h - 40);
    if (w.fog.isRevealed(tx, ty)) {
      a.tx = tx;
      a.ty = ty;
      a.state = 'gotoResource';
      a.targetResId = null;
      return;
    }
  }
  const ang = w.rng.next() * Math.PI * 2;
  const dist = w.rng.float(120, 260);
  a.tx = Math.min(w.w - 20, Math.max(20, a.x + Math.cos(ang) * dist));
  a.ty = Math.min(w.h - 20, Math.max(20, a.y + Math.sin(ang) * dist));
  a.state = 'gotoResource';
  a.targetResId = null;
}

// ═════════════════════════════ SOLDADO (combate) ═══════════════════

export function updateSoldier(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  const aggro = BEHAVIOR.SOLDIER_AGGRO * w.mods.visionMult;
  a.attackCd = Math.max(0, a.attackCd - dt);

  switch (a.state) {
    case 'patrol':
    case 'returnHome': {
      // procura inimigo visível no alcance
      const enemy = w.nearestVisibleEnemy(a.x, a.y, aggro);
      if (enemy) {
        a.targetEnemyId = enemy.id;
        a.state = 'seekEnemy';
        break;
      }
      if (seek(a, a.tx, a.ty, speed, dt)) {
        // novo ponto de patrulha no anel do ninho
        const ang = w.rng.next() * Math.PI * 2;
        const dist = w.rng.float(80, 160);
        a.tx = Math.min(w.w - 20, Math.max(20, w.nest.x + Math.cos(ang) * dist));
        a.ty = Math.min(w.h - 20, Math.max(20, w.nest.y + Math.sin(ang) * dist));
      }
      break;
    }

    case 'seekEnemy': {
      const enemy = w.enemies.find((e) => e.id === a.targetEnemyId && e.hp > 0);
      if (!enemy) {
        a.targetEnemyId = null;
        a.state = 'patrol';
        break;
      }
      const dist = Math.hypot(enemy.x - a.x, enemy.y - a.y);
      const reach = enemy.r + ANTS.soldier.size / 2 + BEHAVIOR.ATTACK_RANGE_PAD;
      if (dist <= reach) {
        a.state = 'attack';
        break;
      }
      // perdeu o alvo de vista? (só persegue no revelado/visível)
      if (dist > aggro * 1.4) {
        a.targetEnemyId = null;
        a.state = 'patrol';
        break;
      }
      seek(a, enemy.x, enemy.y, speed, dt);
      break;
    }

    case 'attack': {
      const enemy = w.enemies.find((e) => e.id === a.targetEnemyId && e.hp > 0);
      if (!enemy) {
        a.targetEnemyId = null;
        a.state = 'patrol';
        break;
      }
      const dist = Math.hypot(enemy.x - a.x, enemy.y - a.y);
      const reach = enemy.r + ANTS.soldier.size / 2 + BEHAVIOR.ATTACK_RANGE_PAD;
      if (dist > reach) {
        a.state = 'seekEnemy';
        break;
      }
      a.dir = enemy.x >= a.x ? 1 : -1;
      if (a.attackCd <= 0) {
        const { dmg, crit } = antDamage(a, w);
        w.damageEnemy(enemy, dmg, 'soldier');
        if (crit) w.events.emit('toast', { text: 'Golpe crítico!', kind: 'info' });
        a.attackCd = (BEHAVIOR.ATTACK_COOLDOWN_SEC * w.buffs.attackCdMult) / w.mods.attackSpeedMult;
      }
      break;
    }

    default:
      a.state = 'patrol';
      pickPatrol(a, w);
  }
}

function pickPatrol(a: Ant, w: AntWorld): void {
  const ang = w.rng.next() * Math.PI * 2;
  const dist = w.rng.float(80, 160);
  a.tx = Math.min(w.w - 20, Math.max(20, w.nest.x + Math.cos(ang) * dist));
  a.ty = Math.min(w.h - 20, Math.max(20, w.nest.y + Math.sin(ang) * dist));
}

// ═════════════════════════ EXPLORADORA (revela) ════════════════════

export function updateScout(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  switch (a.state) {
    case 'idle': {
      a.timer -= dt;
      if (a.timer <= 0) pickScoutDestination(a, w);
      break;
    }
    case 'explore': {
      if (seek(a, a.tx, a.ty, speed, dt)) {
        a.state = 'idle';
        a.timer = w.rng.float(1.5, 3.5);
      }
      break;
    }
    default:
      pickScoutDestination(a, w);
  }
}

function pickScoutDestination(a: Ant, w: AntWorld): void {
  const candidate = () => {
    const ang = w.rng.next() * Math.PI * 2;
    const dist = w.rng.float(200, 700);
    const x = Math.min(w.w - 30, Math.max(30, a.x + Math.cos(ang) * dist));
    const y = Math.min(w.h - 30, Math.max(30, a.y + Math.sin(ang) * dist));
    const score = w.fog.isRevealed(x, y) ? 1 + w.rng.next() : w.rng.next() * 0.5;
    return { x, y, score };
  };
  let best = candidate();
  for (let i = 1; i < 8; i++) {
    const c = candidate();
    if (c.score < best.score) best = c;
  }
  a.tx = best.x;
  a.ty = best.y;
  a.state = 'explore';
}

/** Despacho por classe — chamado pelo passo de simulação. */
export function updateAnt(a: Ant, w: AntWorld, dt: number): void {
  if (a.z > 0) return; // voando com o smash do chefe — física cuida
  if (a.hp <= 0) return;
  if (a.hp < a.hpMax && w.mods.healPerSec > 0) {
    a.hp = Math.min(a.hpMax, a.hp + w.mods.healPerSec * dt);
  }
  switch (a.cls) {
    case 'worker':
      updateWorker(a, w, dt);
      break;
    case 'soldier':
      updateSoldier(a, w, dt);
      break;
    case 'scout':
      updateScout(a, w, dt);
      break;
  }
}
