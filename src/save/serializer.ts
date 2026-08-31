/**
 * Serialização engine ⇄ save. O mundo (props) NÃO é salvo: a seed é fixa
 * por mapa (docs/05) e a geração é determinística — save menor.
 */
import type { GameEngine } from '../engine/GameEngine';
import type { RunSaveV1, SavedAnt, SavedResource } from './saveTypes';
import { SAVE } from '../core/constants';

export function serialize(engine: GameEngine): RunSaveV1 {
  const ants: SavedAnt[] = engine.ants.map((a) => ({
    id: a.id,
    cls: a.cls,
    x: a.x,
    y: a.y,
    dir: a.dir,
    hp: a.hp,
    carrying: a.carrying,
    carryKind: a.carryKind,
    state: a.state,
    timer: a.timer,
    targetResId: a.targetResId,
    tx: a.tx,
    ty: a.ty,
    walkPhase: a.walkPhase,
    seed: a.seed,
    internal: a.internal,
  }));

  const resources: SavedResource[] = engine.resources
    .filter((r) => r.amount > 0)
    .map((r) => ({ id: r.id, kind: r.kind, x: r.x, y: r.y, amount: r.amount }));

  return {
    version: SAVE.VERSION,
    savedAt: Date.now(),
    mapId: engine.mapId,
    seed: engine.seed,
    runSeconds: engine.clock.runSeconds,
    food: engine.foodAmount,
    chitin: engine.chitinAmount,
    delivered: engine.deliveredTotal,
    producedTotal: engine.producedTotal,
    queen: {
      hp: engine.queen.hp,
      hunger: engine.queen.hunger,
      lastBand: engine.queen.lastBand,
    },
    queue: engine.queen.queue.map((q) => ({
      cls: q.cls,
      remainingMs: q.remainingMs,
      totalMs: q.totalMs,
    })),
    nest: { hp: engine.nest.hp },
    ants,
    resources,
    fogRLE: engine.fog.serializeRLE(),
    camera: { cx: engine.camera.cx, cy: engine.camera.cy, mode: engine.camera.mode },
    selectedAntId: engine.selectedAntId,
    gameOver: engine.gameOver,
  };
}
