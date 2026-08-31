/**
 * Inimigos — 12 espécies com os stats REAIS do bundle (Ur).
 * IA: vagueia → persegue formiga no aggro → ataca; ataca o ninho ao chegar.
 */
import { ENEMIES, type EnemyKind } from '../core/constants';
import type { Enemy, Vec2 } from '../core/types';
import { seek } from '../engine/movement';

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
  };
}

export interface EnemyHost {
  readonly w: number;
  readonly h: number;
  readonly nest: { x: number; y: number };
  readonly ants: ReadonlyArray<{ id: number; x: number; y: number; hp: number }>;
  readonly rng: { next(): number; float(a: number, b: number): number };
  damageAnt(antId: number, dmg: number, by: EnemyKind): void;
  damageNest(dmg: number): void;
}

const NEST_REACH = 42;
const ATTACK_CD = 1.0;

export function updateEnemy(e: Enemy, host: EnemyHost, dt: number): void {
  if (e.hp <= 0) return;
  e.attackCd = Math.max(0, e.attackCd - dt);

  // alvo: formiga mais próxima dentro do aggro
  let target: { id: number; x: number; y: number } | null = null;
  let bestD2 = e.aggro * e.aggro;
  for (const a of host.ants) {
    if (a.hp <= 0) continue;
    const d2 = (a.x - e.x) ** 2 + (a.y - e.y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      target = a;
    }
  }

  const goto = (p: Vec2) => {
    seek(e, p.x, p.y, e.speed, dt);
    e.walkPhase += 0.25 * dt * 60;
  };

  if (target) {
    // persegue e ataca a formiga
    const dist = Math.hypot(target.x - e.x, target.y - e.y);
    if (dist <= e.r + 12) {
      e.dir = target.x >= e.x ? 1 : -1;
      if (e.attackCd <= 0) {
        host.damageAnt(target.id, e.dmg, e.kind);
        e.attackCd = ATTACK_CD;
      }
    } else {
      goto(target);
    }
    return;
  }

  // sem formiga por perto: marcha até o ninho
  const dNest = Math.hypot(host.nest.x - e.x, host.nest.y - e.y);
  if (dNest > NEST_REACH + e.r * 0.4) {
    goto(host.nest);
  } else {
    e.dir = host.nest.x >= e.x ? 1 : -1;
    if (e.attackCd <= 0) {
      host.damageNest(e.dmg);
      e.attackCd = ATTACK_CD;
    }
  }
}
