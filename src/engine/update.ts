/**
 * Passo de simulação (delta fixo 60 Hz). Orquestra comportamentos,
 * névoa, Rainha e expiração de toasts. O GameEngine implementa SimHost.
 */
import { ENGINE, FOG, WORLD } from '../core/constants';
import { updateCollector } from '../entities/ants/collector';
import { updateWorker } from '../entities/ants/worker';
import { updateScout } from '../entities/ants/scout';
import { updateSoldier } from '../entities/ants/soldier';
import { revealRadiusOf } from '../entities/ants/registry';
import { updateQueen } from '../entities/queen/queen';
import { applySeparation, clampToWorld } from './movement';
import type { Ant, AntClass, AntWorld, HungerBand, Toast } from '../core/types';

export interface SimHost extends AntWorld {
  readonly ants: Ant[];
  timeSec: number;
  tick: number;
  toasts: Toast[];
  gameOver: boolean;

  spawnAntAtNest(cls: AntClass): void;
  pushToast(text: string, kind: Toast['kind']): void;
  onQueenBandChange(band: HungerBand): void;
  onQueenDead(): void;
  rebuildResourceIndex(): void;
}

export function stepSimulation(host: SimHost, dt: number): void {
  host.tick++;
  host.timeSec += dt;

  // ── 1. comportamentos por classe ────────────────────────────────
  for (const a of host.ants) {
    switch (a.cls) {
      case 'worker':
        updateWorker(a, host, dt);
        break;
      case 'collector':
        updateCollector(a, host, dt);
        break;
      case 'scout':
        updateScout(a, host, dt);
        break;
      case 'soldier':
        updateSoldier(a, host, dt);
        break;
      default:
        break; // classes futuras (Fase 6)
    }
  }

  // ── 2. separação + limites do mundo ─────────────────────────────
  if (host.tick % ENGINE.SEPARATION_EVERY_STEPS === 0) {
    applySeparation(host.ants, dt * ENGINE.SEPARATION_EVERY_STEPS);
  }
  for (const a of host.ants) {
    if (!a.internal) clampToWorld(a, host.w, host.h);
  }

  // ── 3. névoa: revela continuamente, recalcula o raio ativo ──────
  for (const a of host.ants) {
    if (!a.internal) host.fog.reveal(a.x, a.y, revealRadiusOf(a.cls));
  }
  if (host.tick % Math.max(1, Math.round(WORLD.SIM_HZ / ENGINE.FOG_ACTIVE_HZ)) === 0) {
    const sources = host.ants
      .filter((a) => !a.internal)
      .map((a) => ({ x: a.x, y: a.y, r: revealRadiusOf(a.cls) }));
    sources.push({ x: host.nest.x, y: host.nest.y, r: FOG.NEST_RADIUS });
    host.fog.recomputeActive(sources);
    host.rebuildResourceIndex();
  }

  // ── 4. Rainha: fome, produção serial, morte ─────────────────────
  updateQueen(
    host.queen,
    {
      onProduced: (cls) => {
        host.spawnAntAtNest(cls);
      },
      onBandChange: (band) => host.onQueenBandChange(band),
    },
    dt,
  );

  // ── 5. toasts ───────────────────────────────────────────────────
  for (const t of host.toasts) t.tSec -= dt;
  if (host.toasts.some((t) => t.tSec <= 0)) {
    host.toasts = host.toasts.filter((t) => t.tSec > 0);
  }

  if (!host.gameOver && host.queen.hp <= 0) {
    host.onQueenDead();
  }
}
