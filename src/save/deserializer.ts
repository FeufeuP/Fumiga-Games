/**
 * Desserialização save → engine. Regenera o mundo pela seed fixa do mapa
 * e reaplica apenas o que é dinâmico (recursos vivos, névoa, formigas).
 */
import { MAPS, type MapId } from '../core/constants';
import { FogOfWar } from '../engine/fogOfWar';
import { createAnt, resetAntIds } from '../entities/ants/registry';
import type { GameEngine } from '../engine/GameEngine';
import type { AntClass, AntState, ResourceKind } from '../core/types';
import type { RunSaveV1 } from './saveTypes';

export function applySave(engine: GameEngine, save: RunSaveV1): boolean {
  const mapId = save.mapId as MapId;
  if (!MAPS[mapId]) return false;

  // 1. mundo base (determinístico pela seed do mapa)
  engine.loadWorld(mapId, save.seed);

  // 2. recursos vivos substituem os gerados (ids preservados)
  engine.resources = save.resources.map((r) => ({
    id: r.id,
    kind: r.kind as ResourceKind,
    x: r.x,
    y: r.y,
    amount: r.amount,
  }));

  // 3. névoa
  engine.fog = FogOfWar.fromRLE(MAPS[mapId].world.w, MAPS[mapId].world.h, save.fogRLE);

  // 4. formigas — ids preservados (selectedAntId aponta para eles)
  resetAntIds();
  engine.ants = save.ants.map((a) => {
    const ant = createAnt(a.cls as AntClass, a.x, a.y, () => a.seed);
    ant.id = a.id;
    ant.x = a.x;
    ant.y = a.y;
    ant.dir = a.dir;
    ant.hp = a.hp;
    ant.carrying = a.carrying;
    ant.carryKind = (a.carryKind as ResourceKind | null) ?? null;
    ant.state = a.state as AntState;
    ant.timer = a.timer;
    ant.targetResId = a.targetResId;
    ant.tx = a.tx;
    ant.ty = a.ty;
    ant.walkPhase = a.walkPhase;
    ant.seed = a.seed;
    ant.internal = a.internal;
    return ant;
  });

  // 5. estado da Rainha, ninho, carteira
  engine.queen.hp = save.queen.hp;
  engine.queen.hunger = save.queen.hunger;
  engine.queen.queue = save.queue.map((q) => ({
    cls: q.cls as AntClass,
    remainingMs: q.remainingMs,
    totalMs: q.totalMs,
  }));
  engine.nest.hp = save.nest.hp;
  engine.foodAmount = save.food;
  engine.chitinAmount = save.chitin;
  engine.deliveredTotal = save.delivered;
  engine.producedTotal = save.producedTotal;
  engine.clock.reset(performance.now());
  engine.clock.runSeconds = save.runSeconds;
  engine.gameOver = save.gameOver;
  engine.selectedAntId = save.selectedAntId;
  engine.camera.cx = save.camera.cx;
  engine.camera.cy = save.camera.cy;
  engine.camera.mode = save.camera.mode === 'free' ? 'free' : 'follow';
  engine.camera.clamp();

  return true;
}
