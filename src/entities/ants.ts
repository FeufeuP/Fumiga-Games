/**
 * Formigas — IA fiel ao bundle original (updateAnt/updateWorker/updateScout):
 *   Operária: coleta instantânea (R0+Ii/2), carrega até a capacidade,
 *             vagueia DENTRO da área revelada, se defende (GA=110) e
 *             foge ao tomar dano (fearT=0.9s).
 *   Soldado:   engaja inimigos revelados (X0=280) ou defende o ninho
 *             (inimigos revelados a 340+ext), movimento de enxame.
 *             [P 5C] Suporta as 3 classes: Defensora, Tóxica e Gigante.
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
  let pct = w.cardMods.speedPct + w.cardMods.efficiencyPct + w.cardMods.colonyAllPct;
  if (a.cls === 'worker') pct += w.cardMods.workerSpeedPct;
  if (a.cls === 'scout') pct += w.cardMods.scoutSpeedPct;
  if (a.cls === 'soldier' && w.unlockedClasses?.includes('gigante')) {
    pct -= 15; // Gigante base: -15% velocidade
    pct += w.cardMods.giantSpeedPct;
  }
  if (a.nearAlly) pct += w.cardMods.nearAllyPct;
  // Passo interno: acelera perto do ninho (≤180px)
  if (a.cls === 'worker' && w.cardMods.nearNestSpeedPct > 0) {
    const dNest = Math.hypot(a.x - w.nest.x, a.y - w.nest.y);
    if (dNest <= 180) pct += w.cardMods.nearNestSpeedPct;
  }
  // Nuvem de feromônio: zona ao redor do ninho (raio 190px)
  if (w.cardMods.pheromoneZonePct > 0) {
    const dNest = Math.hypot(a.x - w.nest.x, a.y - w.nest.y);
    if (dNest <= 190) pct += w.cardMods.pheromoneZonePct;
  }
  if (pct !== 0) v *= 1 + pct / 100;
  if (a.carrying > 0) v *= ANT_SPRITE.CARRY_SLOWDOWN;
  // [O] rally COLETA!: operárias ×1.6 por 8s
  if (a.cls === 'worker' && w.buffs.collectSpeedMult !== 1) {
    v *= w.buffs.collectSpeedMult;
  }
  return v;
}

export function antDamage(a: Ant, w: AntWorld): { dmg: number; crit: boolean } {
  let pct = w.cardMods.efficiencyPct + w.cardMods.colonyAllPct;
  if (a.nearAlly) pct += w.cardMods.nearAllyPct;
  if (w.cardMods.furyPerAntPct > 0) {
    const vivas = w.ants.reduce((n, x) => n + (x.hp > 0 ? 1 : 0), 0);
    pct += Math.min(w.cardMods.furyCapPct, vivas * w.cardMods.furyPerAntPct);
  }
  const nest = w.nest as { x: number; y: number; hp?: number; hpMax?: number };
  if (w.cardMods.nestLowHpFuryPct > 0 && nest.hpMax && nest.hp !== undefined) {
    if (nest.hp < nest.hpMax * 0.3) pct += w.cardMods.nestLowHpFuryPct;
  }
  if (w.cardMods.pheromoneZonePct > 0) {
    const dNest = Math.hypot(a.x - w.nest.x, a.y - w.nest.y);
    if (dNest <= 190) pct += w.cardMods.pheromoneZonePct * 0.5;
  }
  const base = ANTS[a.cls].dmg * w.mods.dmgMult * (1 + pct / 100);
  const crit = w.rng.chance(Math.min(0.9, w.mods.critChance + w.cardMods.critBonus));
  let flat = a.cls === 'soldier' ? w.cardMods.soldierDmgBonus : 0;
  if (a.cls === 'soldier' && w.unlockedClasses?.includes('gigante')) {
    flat += 5 + w.cardMods.giantDmgBonus;
  }
  return { dmg: (crit ? base * w.mods.critMult : base) + flat, crit };
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

// ═════════════════════════ OPERÁRIA (coleta) ═══════════════════

export function updateWorker(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  let detect = BEHAVIOR.WORKER_DETECT * w.mods.visionMult + w.cardMods.workerDetectBonus;
  if (w.cardMods.workerDetectAnywhere) detect = 1e9;
  const cap = w.mods.carryCap + w.cardMods.workerCarryBonus;
  a.attackCd = Math.max(0, a.attackCd - dt);
  if (w.cardMods.workerAutoFleePx > 0 && a.state !== 'returnNest' && a.state !== 'harvest') {
    const perigo = w.nearestVisibleEnemy(a.x, a.y, w.cardMods.workerAutoFleePx);
    if (perigo) {
      a.state = 'returnNest';
      a.targetResId = null;
    }
  }

  if (a.carrying > 0) {
    if (a.carrying < cap) {
      const res = w.nearestRevealedResource(a.x, a.y, detect);
      if (res) {
        if (gotoAndPickup(a, w, res.x, res.y, res.kind, res.id, speed, dt)) return;
      }
    }
    if (seek(a, w.nest.x, w.nest.y, speed, dt) || dist(a, w.nest.x, w.nest.y) < BEHAVIOR.DEPOSIT_RADIUS) {
      w.deposit(a.carrying, a.carryKind ?? 'leaf', 'worker');
      a.hp = a.hpMax;
      a.carrying = 0;
      a.carryKind = null;
      a.targetResId = null;
    }
    return;
  }

  const foe = w.nearestVisibleEnemy(a.x, a.y, BEHAVIOR.WORKER_SELFDEFENSE * w.mods.visionMult);
  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

  const res = w.nearestRevealedResource(a.x, a.y, detect);
  if (res) {
    if (gotoAndPickup(a, w, res.x, res.y, res.kind, res.id, speed, dt)) return;
  }

  wanderRevealed(a, w, dt, BEHAVIOR.WANDER_AHEAD, 4, 2.6);
}

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
      w.damageEnemy(e, dmg, a.cls, crit);
      w.playSfx('attack');
      if (crit) w.events.emit('toast', { text: 'Golpe crítico!', kind: 'info' });
      a.attackCd = (BEHAVIOR.ATTACK_COOLDOWN_SEC * w.buffs.attackCdMult) / w.mods.attackSpeedMult;

      // [P 5C] Gigante: knockback + dano em área
      if (a.cls === 'soldier' && w.unlockedClasses?.includes('gigante')) {
        const dx = e.x - a.x;
        const dy = e.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const kb = 20 + w.cardMods.giantKnockbackPx;
        e.x += (dx / d) * kb;
        e.y += (dy / d) * kb;
        if (w.cardMods.giantAoePx > 0) {
          for (const o of w.enemies) {
            if (o === e || o.hp <= 0) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) <= w.cardMods.giantAoePx) {
              w.damageEnemy(o, dmg * 0.5, 'soldier');
            }
          }
        }
      }
    }
  }
}

// ═════════════════════════ SOLDADO (combate) ═══════════════════

export function updateSoldier(a: Ant, w: AntWorld, dt: number): void {
  const speed = antSpeed(a, w);
  a.attackCd = Math.max(0, a.attackCd - dt);

  const isToxica = w.unlockedClasses?.includes('toxica');
  const isDefensora = w.unlockedClasses?.includes('defensora');

  let aggroDist = BEHAVIOR.SOLDIER_AGGRO * w.mods.visionMult + w.cardMods.soldierAggroBonus;
  if (isToxica) aggroDist = Math.max(aggroDist, 180 + w.cardMods.toxicRangeBonus);

  let foe = w.nearestVisibleEnemy(a.x, a.y, aggroDist);
  if (!foe) {
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

  // [P 5C] Tóxica: cuspir ácido a distância (180px)
  if (foe && isToxica) {
    const dFoe = Math.hypot(foe.x - a.x, foe.y - a.y);
    const spitRange = 180 + w.cardMods.toxicRangeBonus;
    if (dFoe <= spitRange) {
      a.dir = foe.x >= a.x ? 1 : -1;
      if (a.attackCd <= 0) {
        const dx = foe.x - a.x;
        const dy = foe.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const baseDmg = 5 + w.cardMods.toxicAcidDmg;
        const crit = w.rng.chance(w.cardMods.toxicCritChance);
        if (w.spawnAcidProjectile) {
          w.spawnAcidProjectile({
            id: Math.random(),
            x: a.x,
            y: a.y,
            vx: (dx / len) * 340,
            vy: (dy / len) * 340,
            dmg: crit ? baseDmg * 2 : baseDmg,
            corrosionSec: 2 + w.cardMods.toxicCorrosionSecBonus,
            spread: w.cardMods.toxicSpreadTargets,
            crit,
          });
        }
        w.playSfx('attack');
        a.attackCd = (BEHAVIOR.ATTACK_COOLDOWN_SEC / (1 + w.cardMods.toxicRatePct / 100)) / w.mods.attackSpeedMult;
      }
      return;
    }
  }

  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

  // [P 5C] Defensora: patrulha anel de defesa ao redor do ninho (150px)
  if (isDefensora) {
    const ringR = 150 + w.cardMods.defenderRingRadiusBonus;
    const ang = a.seed * Math.PI * 2;
    const tx = w.nest.x + Math.cos(ang) * ringR;
    const ty = w.nest.y + Math.sin(ang) * ringR;
    seek(a, tx, ty, speed, dt);
    if (w.cardMods.defenderRegen > 0 && a.hp < a.hpMax) {
      a.hp = Math.min(a.hpMax, a.hp + w.cardMods.defenderRegen * dt);
    }
    return;
  }

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

  wanderRevealed(a, w, dt, 60, 3, 2.2);
}

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

  const foe = w.nearestVisibleEnemy(a.x, a.y, BEHAVIOR.OTHER_SELFDEFENSE * w.mods.visionMult);
  if (foe) {
    engage(a, w, foe, dt);
    return;
  }

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

export function updateAnt(a: Ant, w: AntWorld, dt: number): void {
  if (a.z > 0) return;
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
