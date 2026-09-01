/**
 * Inimigos — 12 espécies com os stats REAIS do bundle (Ur).
 * IA fiel [O updateEnemy]:
 *  · Inimigo de ONDA marcha direto ao ninho, ataca formiga apenas se ela
 *    estiver no caminho (corpo ≤12) e ataca o ninho ao alcance.
 *  · Inimigo AMBIENTE persegue formiga no aggro (max(aggro, ext+120)),
 *    só ataca o ninho se estiver perto dele (aggro×2.5) e vagueia
 *    fora disso (patrolT, meia velocidade).
 */
import { BEHAVIOR, ENEMIES, ENEMY_COMBAT, type EnemyKind } from '../core/constants';
import type { Enemy, Prop } from '../core/types';

let nextEnemyId = 1;

export function resetEnemyIds(): void {
  nextEnemyId = 1;
}

/** após restaurar um save, evita colisão de ids */
export function resumeEnemyIds(maxId: number): void {
  nextEnemyId = Math.max(nextEnemyId, maxId + 1);
}

export function createEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  power: number,
  rnd: () => number,
  opts: { wave?: boolean; boss?: boolean } = {},
): Enemy {
  const st = ENEMIES[kind];
  // [O] p=round(hp·v), A=round(damage·v), m=scale·v, h=r·v
  const hp = Math.round(st.hp * power);
  return {
    id: nextEnemyId++,
    kind,
    x,
    y,
    dir: 1,
    hp,
    hpMax: hp,
    dmg: Math.round(st.damage * power),
    speed: st.speed,
    aggro: st.aggro,
    r: st.r * power,
    scale: st.scale * power,
    xp: st.xp,
    wave: opts.wave ?? false,
    boss: opts.boss ?? false,
    state: 'wander',
    targetAntId: null,
    tx: x,
    ty: y,
    attackCd: 0,
    walkPhase: 0,
    seed: rnd(),
    angle: rnd() * Math.PI * 2,
    patrolT: 2,
  };
}

/** Cria o chefe do mapa com os stats próprios (hp/dano não escalam). */
export function createBoss(
  kind: EnemyKind,
  _name: string,
  x: number,
  y: number,
  bossCfg: { hp: number; damage: number; speed: number; aggro: number; r: number; scale: number; xp: number },
  rnd: () => number,
): Enemy {
  return {
    id: nextEnemyId++,
    kind,
    x,
    y,
    dir: 1,
    hp: bossCfg.hp,
    hpMax: bossCfg.hp,
    dmg: bossCfg.damage,
    speed: bossCfg.speed,
    aggro: bossCfg.aggro,
    r: bossCfg.r,
    scale: bossCfg.scale,
    xp: bossCfg.xp,
    wave: true,
    boss: true,
    state: 'chase',
    targetAntId: null,
    tx: x,
    ty: y,
    attackCd: 0,
    walkPhase: 0,
    seed: rnd(),
    angle: rnd() * Math.PI * 2,
    patrolT: 2,
  };
}

export interface EnemyHost {
  readonly w: number;
  readonly h: number;
  readonly nest: { x: number; y: number };
  readonly ants: ReadonlyArray<{ id: number; x: number; y: number; hp: number; cls: string }>;
  readonly props: readonly Prop[];
  readonly rng: { next(): number; float(a: number, b: number): number };
  /** Provocação (carta 5B): raio em que soldados puxam inimigos (0 = off) */
  readonly tauntRadius: number;
  damageAnt(antId: number, dmg: number, by: EnemyKind, fromX?: number, fromY?: number): void;
  damageNest(dmg: number, fromX?: number, fromY?: number): void;
}

/** [O enemySteer] vira suavemente em direção ao alvo. */
function steer(e: Enemy, tx: number, ty: number, dt: number, turn: number): void {
  const want = Math.atan2(ty - e.y, tx - e.x);
  let d = want - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += Math.max(-turn * dt, Math.min(turn * dt, d));
}

/** [O enemyMove] anda no rumo atual; meia velocidade vagueando; desvia de obstáculos. */
function move(e: Enemy, host: EnemyHost, dt: number, forced: boolean): void {
  const antNear = host.ants.some((a) => a.hp > 0 && Math.hypot(a.x - e.x, a.y - e.y) < Math.max(e.aggro, e.r + 120));
  const v = forced || antNear ? e.speed : e.speed * ENEMY_COMBAT.AMBIENT_SPEED_MULT;
  let nx = e.x + Math.cos(e.angle) * v * dt;
  let ny = e.y + Math.sin(e.angle) * v * dt;
  // obstáculos: empurra para fora e muda o rumo [O]
  for (const p of host.props) {
    if (!p.solid) continue;
    const min = p.r + e.r;
    const d = Math.hypot(nx - p.x, ny - p.y);
    if (d < min) {
      if (d > 0.001) {
        nx = p.x + ((nx - p.x) / d) * min;
        ny = p.y + ((ny - p.y) / d) * min;
      } else {
        nx = p.x + min;
      }
      e.angle = Math.atan2(ny - p.y, nx - p.x) + (host.rng.next() - 0.5);
    }
  }
  // bordas: inimigos de onda não quicam (nascem fora e entram)
  if (nx < e.r) {
    nx = e.r;
    if (!e.wave) e.angle = Math.PI - e.angle;
  }
  if (nx > host.w - e.r) {
    nx = host.w - e.r;
    if (!e.wave) e.angle = Math.PI - e.angle;
  }
  if (ny < e.r) {
    ny = e.r;
    if (!e.wave) e.angle = -e.angle;
  }
  if (ny > host.h - e.r) {
    ny = host.h - e.r;
    if (!e.wave) e.angle = -e.angle;
  }
  e.x = nx;
  e.y = ny;
  e.dir = Math.cos(e.angle) >= 0 ? 1 : -1;
  e.walkPhase += 0.25 * dt * 60;
}

export function updateEnemy(e: Enemy, host: EnemyHost, dt: number): void {
  if (e.hp <= 0) return;
  // Armadilha de resina (carta 5B): preso não anda nem ataca
  if (e.rootT && e.rootT > 0) {
    e.rootT -= dt;
    return;
  }
  e.attackCd = Math.max(0, e.attackCd - dt);
  const cd = e.boss ? ENEMY_COMBAT.BOSS_ATTACK_CD_SEC : ENEMY_COMBAT.ATTACK_CD_SEC;
  const extent = e.r;

  // ── inimigo de ONDA: marcha ao ninho [O] ─────────────────────────
  if (e.wave) {
    const reach = ENEMY_COMBAT.NEST_REACH_PAD + extent + 8;
    const dNest = Math.hypot(host.nest.x - e.x, host.nest.y - e.y);
    e.dir = host.nest.x >= e.x ? 1 : -1;
    // Provocação (carta 5B): soldado perto puxa o inimigo para longe do ninho
    if (host.tauntRadius > 0 && dNest > reach) {
      let taunter: { id: number; x: number; y: number } | null = null;
      let bd = host.tauntRadius;
      for (const a of host.ants) {
        if (a.hp <= 0 || a.cls !== 'soldier') continue;
        const d = Math.hypot(a.x - e.x, a.y - e.y);
        if (d < bd) { bd = d; taunter = a; }
      }
      if (taunter) {
        const dT = Math.hypot(taunter.x - e.x, taunter.y - e.y);
        if (dT > BEHAVIOR.ATTACK_RANGE_PAD && e.attackCd <= 0) {
          steer(e, taunter.x, taunter.y, dt, 5);
          move(e, host, dt, true);
        } else if (e.attackCd <= 0) {
          e.attackCd = cd;
          host.damageAnt(taunter.id, e.dmg, e.kind, e.x, e.y);
        }
        return;
      }
    }
    if (dNest > reach) {
      // ataca formiga apenas se ela estiver colada no corpo (≤12)
      let ant: { id: number; x: number; y: number } | null = null;
      let bd = Infinity;
      for (const a of host.ants) {
        if (a.hp <= 0) continue;
        const d = Math.hypot(a.x - e.x, a.y - e.y) - extent;
        if (d < bd) {
          bd = d;
          ant = a;
        }
      }
      if (ant && bd <= BEHAVIOR.ATTACK_RANGE_PAD && e.attackCd <= 0) {
        e.attackCd = cd;
        host.damageAnt(ant.id, e.dmg, e.kind, e.x, e.y);
      } else {
        steer(e, host.nest.x, host.nest.y, dt, 5);
        move(e, host, dt, true);
      }
    } else if (e.attackCd <= 0) {
      e.attackCd = cd;
      host.damageNest(e.dmg, e.x, e.y);
    }
    return;
  }

  // ── inimigo AMBIENTE ─────────────────────────────────────────────
  const aggroR = Math.max(e.aggro, extent + 120);
  let ant: { id: number; x: number; y: number } | null = null;
  let bd = Infinity;
  for (const a of host.ants) {
    if (a.hp <= 0) continue;
    const d = Math.hypot(a.x - e.x, a.y - e.y);
    if (d < aggroR && d < bd) {
      bd = d;
      ant = a;
    }
  }
  if (ant) {
    e.dir = ant.x >= e.x ? 1 : -1;
    if (bd - extent > 40) {
      steer(e, ant.x, ant.y, dt, 4);
      move(e, host, dt, false);
    } else if (e.attackCd <= 0) {
      e.attackCd = cd;
      host.damageAnt(ant.id, e.dmg, e.kind, e.x, e.y);
    }
    return;
  }

  // perto do ninho (aggro×2.5): ataca o ninho [O]
  const dNest = Math.hypot(host.nest.x - e.x, host.nest.y - e.y);
  if (dNest <= aggroR * 2.5) {
    const reach = ENEMY_COMBAT.NEST_REACH_PAD + extent + 8;
    e.dir = host.nest.x >= e.x ? 1 : -1;
    if (dNest > reach) {
      steer(e, host.nest.x, host.nest.y, dt, 4);
      move(e, host, dt, false);
    } else if (e.attackCd <= 0) {
      e.attackCd = cd;
      host.damageNest(e.dmg, e.x, e.y);
    }
    return;
  }

  // vagueio [O]: patrolT 1.2–3.4s, rumo ±3 rad
  e.patrolT -= dt;
  if (e.patrolT <= 0) {
    e.patrolT = 1.2 + host.rng.next() * 2.2;
    e.angle += (host.rng.next() - 0.5) * 3;
  }
  e.dir = Math.cos(e.angle) >= 0 ? 1 : -1;
  move(e, host, dt, false);
}
