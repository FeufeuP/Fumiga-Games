/**
 * Formigas — IA fiel ao bundle original (updateAnt/updateWorker/updateScout):
 *   Operária: coleta instantânea (R0+Ii/2), carrega até a capacidade,
 *             vagueia DENTRO da área revelada, se defende (GA=110) e
 *             foge ao tomar dano (fearT=0.9s).
 *   Soldado:   engaja inimigos revelados (X0=280) ou defende o ninho
 *             (inimigos revelados a 340+ext), movimento de enxame.
 *   Exploradora: anel de fronteira expansivo (frontierR), separação
 *             entre exploradoras, desvio de inimigos (140px).
 * Apenas exploradoras revelam a névoa (fogCell×2) [O].
 */
import { ANTS, ANT_SPRITE, BEHAVIOR, FOG, type AntClass, type ResourceKind } from '../core/constants';
import type { Ant, AntWorld, Enemy, Prop } from '../core/types';
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
  const ang = rnd() * Math.PI * 2;
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
    state: 'idle',
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
    angle: ang,
    wanderAngle: ang,
    wanderT: 0,
    fearT: 0,
    fearAx: 0,
    fearAy: 0,
    stunT: 0,
    scoutA: ang,
    scoutR: 1,
    scoutTx: x,
    scoutTy: y,
    scoutDecideT: 0,
  };
}

/** Raio de revelação na névoa — SÓ a exploradora revela [O]. */
export function revealRadiusOf(cls: AntClass): number {
  return cls === 'scout' ? FOG.SCOUT_RADIUS : 0;
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

/** [O] distância ao corpo do inimigo (extensão descontada) */
export function enemyBodyDist(e: Enemy, x: number, y: number, extent: number): number {
  return Math.max(0, Math.hypot(e.x - x, e.y - y) - extent);
}

/** Resolve colisão com obstáculos sólidos: empurra para fora [O enemyMove]. */
export function resolveProps(m: { x: number; y: number; angle?: number }, props: readonly Prop[]): void {
  for (const p of props) {
    if (!p.solid) continue;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d = Math.hypot(dx, dy);
    const min = p.r + 10;
    if (d < min && d > 0.001) {
      m.x = p.x + (dx / d) * min;
      m.y = p.y + (dy / d) * min;
    }
  }
}

/** Move na direção do ângulo com curva suave [O steerTo]. */
function steerAlong(a: Ant, angle: number, speed: number, dt: number, turn: number): void {
  let d = angle - a.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  a.angle += Math.max(-turn * dt, Math.min(turn * dt, d));
  const step = speed * dt;
  a.x += Math.cos(a.angle) * step;
  a.y += Math.sin(a.angle) * step;
  a.dir = Math.cos(a.angle) >= 0 ? 1 : -1;
  a.walkPhase += (step / 10) * 0.35;
}

/** Vagueio dentro da área revelada [O]: muda o rumo quando aponta para a sombra. */
function wanderRevealed(a: Ant, w: AntWorld, dt: number, ahead: number, turn: number, spread: number): void {
  a.wanderT -= dt;
  const px = a.x + Math.cos(a.wanderAngle) * ahead;
  const py = a.y + Math.sin(a.wanderAngle) * ahead;
  if (a.wanderT <= 0 || !w.fog.isRevealed(px, py)) {
    a.wanderT = 0.5 + w.rng.next() * 1.1;
    a.wanderAngle = a.angle + (w.rng.next() - 0.5) * spread;
  }
  steerAlong(a, a.wanderAngle, antSpeed(a, w), dt, turn);
}

// ═════════════════════════════ OPERÁRIA (coleta) ═══════════════════

export function updateWorker(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  const detect = BEHAVIOR.WORKER_DETECT * w.mods.visionMult;
  const cap = w.mods.carryCap;
  a.attackCd = Math.max(0, a.attackCd - dt);

  // [O] carregando: pega mais se der, senão volta ao ninho
  if (a.carrying > 0) {
    if (a.carrying < cap) {
      const res = w.nearestRevealedResource(a.x, a.y, detect);
      if (res) {
        if (gotoAndPickup(a, w, res.x, res.y, res.kind, res.id, speed, dt)) return;
      }
    }
    if (seek(a, w.nest.x, w.nest.y, speed, dt) || dist(a, w.nest.x, w.nest.y) < BEHAVIOR.DEPOSIT_RADIUS) {
      w.deposit(a.carrying, a.carryKind ?? 'leaf', 'worker');
      a.hp = a.hpMax; // [O] entregar no ninho restaura a formiga
      a.carrying = 0;
      a.carryKind = null;
      a.targetResId = null;
    }
    return;
  }

  // [O] auto-defesa (GA): operária revida inimigo revelado próximo
  const foe = w.nearestVisibleEnemy(a.x, a.y, BEHAVIOR.WORKER_SELFDEFENSE * w.mods.visionMult);
  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

  // [O] procura recurso revelado dentro de N0×visão → coleta instantânea
  const res = w.nearestRevealedResource(a.x, a.y, detect);
  if (res) {
    if (gotoAndPickup(a, w, res.x, res.y, res.kind, res.id, speed, dt)) return;
  }

  // [O] vagueio mantendo-se na área revelada
  wanderRevealed(a, w, dt, BEHAVIOR.WANDER_AHEAD, 4, 2.6);
}

/** Vai até o nó e pega instantaneamente quando R0+Ii/2 [O pickup]. */
function gotoAndPickup(
  a: Ant, w: AntWorld, x: number, y: number, kind: ResourceKind, id: number,
  speed: number, dt: number,
): boolean {
  const d = Math.hypot(x - a.x, y - a.y);
  if (d < BEHAVIOR.PICKUP_BASE + BEHAVIOR.RESOURCE_SIZE[kind] / 2) {
    a.carrying += 1;
    a.carryKind = kind;
    w.removeResource(id);
    w.playSfx('collect');
    return true;
  }
  a.targetResId = id;
  seek(a, x, y, speed, dt);
  return true;
}

function dist(a: Ant, x: number, y: number): number {
  return Math.hypot(x - a.x, y - a.y);
}

/** [O engageEnemy] persegue e ataca (corpo a Hr=12). */
function engage(a: Ant, w: AntWorld, e: Enemy, dt: number): void {
  const ext = w.enemyExtent(e);
  const speed = antSpeed(a, w);
  a.targetEnemyId = e.id;
  if (enemyBodyDist(e, a.x, a.y, ext) > BEHAVIOR.ATTACK_RANGE_PAD) {
    seek(a, e.x, e.y, speed, dt);
  } else {
    a.dir = e.x >= a.x ? 1 : -1;
    if (a.attackCd <= 0) {
      const { dmg, crit } = antDamage(a, w);
      w.damageEnemy(e, dmg, a.cls);
      w.playSfx('attack');
      if (crit) w.events.emit('toast', { text: 'Golpe crítico!', kind: 'info' });
      a.attackCd = (BEHAVIOR.ATTACK_COOLDOWN_SEC * w.buffs.attackCdMult) / w.mods.attackSpeedMult;
    }
  }
}

// ═════════════════════════════ SOLDADO (combate) ═══════════════════

export function updateSoldier(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  a.attackCd = Math.max(0, a.attackCd - dt);

  // [O] engaja inimigo revelado dentro de X0×visão…
  let foe = w.nearestVisibleEnemy(a.x, a.y, BEHAVIOR.SOLDIER_AGGRO * w.mods.visionMult);
  if (!foe) {
    // …ou defende o ninho: inimigo revelado a 340+extensão do ninho [O]
    let best = Infinity;
    for (const e of w.enemies) {
      if (e.hp <= 0 || !w.fog.isRevealed(e.x, e.y)) continue;
      if (Math.hypot(e.x - w.nest.x, e.y - w.nest.y) > BEHAVIOR.NEST_DEFEND_RADIUS + w.enemyExtent(e)) continue;
      const d = enemyBodyDist(e, a.x, a.y, w.enemyExtent(e));
      if (d < best) {
        best = d;
        foe = e;
      }
    }
  }
  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

  // [O swarmDir] enxame: coesão+alinhamento com outros soldados
  const swarm = swarmDir(a, w.ants);
  if (swarm) {
    let hx = a.x + (swarm.x * 0.6 + Math.cos(a.angle)) * 46;
    let hy = a.y + (swarm.y * 0.6 + Math.sin(a.angle)) * 46;
    if (!w.fog.isRevealed(hx, hy)) {
      hx = a.x + Math.cos(a.angle) * 46;
      hy = a.y + Math.sin(a.angle) * 46;
    }
    if (!w.fog.isRevealed(hx, hy)) {
      a.wanderAngle = a.angle + (w.rng.next() - 0.5) * 3;
      hx = a.x + Math.cos(a.wanderAngle) * 60;
      hy = a.y + Math.sin(a.wanderAngle) * 60;
    }
    steerAlong(a, Math.atan2(hy - a.y, hx - a.x), speed, dt, 5);
    return;
  }

  // [O] vagueio do soldado dentro do revelado
  wanderRevealed(a, w, dt, 60, 3, 2.2);
}

/** [O swarmDir] direção do bando: separação (40) + coesão (44) + alinhamento (66). */
function swarmDir(a: Ant, ants: readonly Ant[]): { x: number; y: number } | null {
  let cx = 0, cy = 0, n = 0;
  let ax = 0, ay = 0, m = 0;
  let sx = 0, sy = 0;
  const SEP = 40;
  for (const o of ants) {
    if (o.id === a.id || o.cls !== a.cls) continue;
    const dx = o.x - a.x;
    const dy = o.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < SEP * SEP && d2 > 0.001) {
      const d = Math.sqrt(d2);
      const k = (SEP - d) / SEP;
      sx -= (dx / d) * k;
      sy -= (dy / d) * k;
    }
    if (d2 < 44 * 44) {
      cx += dx;
      cy += dy;
      n++;
    }
    if (d2 < 66 * 66) {
      ax += Math.cos(o.angle);
      ay += Math.sin(o.angle);
      m++;
    }
  }
  if (n === 0 && m === 0) return null;
  let vx = sx * 1.8;
  let vy = sy * 1.8;
  if (n > 0) {
    vx += (cx / n) * 1.4;
    vy += (cy / n) * 1.4;
  }
  if (m > 0) {
    vx += (ax / m) * 0.9;
    vy += (ay / m) * 0.9;
  }
  const len = Math.hypot(vx, vy);
  if (len < 0.001) return null;
  return { x: vx / len, y: vy / len };
}

// ═══════════════════════ EXPLORADORA (revela) ══════════════════════

export function updateScout(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  a.attackCd = Math.max(0, a.attackCd - dt);

  // [O] auto-defesa (BA): revida inimigo revelado próximo
  const foe = w.nearestVisibleEnemy(a.x, a.y, BEHAVIOR.OTHER_SELFDEFENSE * w.mods.visionMult);
  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

  // [O] decide o alvo no anel de fronteira (a cada 0.4s ou ao chegar)
  const maxFrontier = Math.hypot(
    Math.max(w.nest.x, w.w - w.nest.x),
    Math.max(w.nest.y, w.h - w.nest.y),
  );
  const ringR = Math.min(w.frontierR * a.scoutR, maxFrontier);
  const arrived = Math.hypot(a.x - a.scoutTx, a.y - a.scoutTy) < 42;
  if (arrived) a.scoutA += 0.5;
  a.scoutDecideT -= dt;
  if (arrived || a.scoutDecideT <= 0 || (a.scoutTx === a.x && a.scoutTy === a.y)) {
    a.scoutDecideT = 0.4;
    let tx = w.nest.x + Math.cos(a.scoutA) * ringR;
    let ty = w.nest.y + Math.sin(a.scoutA) * ringR;
    // separação de outras exploradoras (60px)
    for (const o of w.ants) {
      if (o.id === a.id || o.cls !== 'scout') continue;
      const dx = a.x - o.x;
      const dy = a.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 3600 && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const k = (60 - d) / 60;
        tx += (dx / d) * k * 40;
        ty += (dy / d) * k * 40;
      }
    }
    a.scoutTx = Math.min(w.w - 30, Math.max(30, tx));
    a.scoutTy = Math.min(w.h - 30, Math.max(30, ty));
  }

  // [O] desvio de inimigos próximos (140px)
  let hx = a.scoutTx;
  let hy = a.scoutTy;
  let near: Enemy | null = null;
  let nd = Infinity;
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const d = enemyBodyDist(e, a.x, a.y, w.enemyExtent(e));
    if (d < BEHAVIOR.SCOUT_AVOID_ENEMY && d < nd) {
      nd = d;
      near = e;
    }
  }
  if (near) {
    const dx = a.x - near.x;
    const dy = a.y - near.y;
    const d = Math.hypot(dx, dy) || 1;
    const p = Math.max(0, (BEHAVIOR.SCOUT_AVOID_ENEMY - Math.min(nd, BEHAVIOR.SCOUT_AVOID_ENEMY)) / BEHAVIOR.SCOUT_AVOID_ENEMY);
    hx += (dx / d) * p * 90;
    hy += (dy / d) * p * 90;
  }

  if (seek(a, hx, hy, speed, dt)) {
    a.scoutA += 0.5;
  }
}

// ═════════════════════════════ DESPACHO ════════════════════════════

/** Despacho por classe — chamado pelo passo de simulação. */
export function updateAnt(a: Ant, w: AntWorld, dt: number): void {
  if (a.z > 0) return; // voando com o smash do chefe — física cuida
  if (a.hp <= 0) return;
  if (a.stunT > 0) {
    a.stunT -= dt;
    return;
  }
  if (a.fearT > 0) {
    a.fearT -= dt;
    steerAlong(a, Math.atan2(a.fearAy, a.fearAx), antSpeed(a, w), dt, 8);
    return;
  }
  if (a.hp < a.hpMax && w.mods.healPerSec > 0) {
    a.hp = Math.min(a.hpMax, a.hp + w.mods.healPerSec * dt);
  }
  // [O] comando do jogador (toque duplo/simplez): vai ao ponto marcado
  if (a.state === 'command') {
    if (seek(a, a.tx, a.ty, antSpeed(a, w), dt)) {
      a.state = 'idle';
      a.timer = 0;
    }
    resolveProps(a, w.props);
    return;
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
  resolveProps(a, w.props);
}
