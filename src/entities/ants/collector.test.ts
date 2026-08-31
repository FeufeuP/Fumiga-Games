/**
 * O teste da Fase 2: o LOOP ECONÔMICO funciona de ponta a ponta.
 * Coletora: procurar → coletar → carregar → voltar → depositar.
 */
import { describe, expect, it } from 'vitest';
import { NEST, RESOURCES } from '../../core/constants';
import { Rng } from '../../core/rng';
import { EventBus } from '../../core/events';
import { FogOfWar } from '../../engine/fogOfWar';
import { createQueen } from '../queen/queen';
import { createAnt } from './registry';
import { updateCollector } from './collector';
import type { Ant, AntWorld, ResourceNode } from '../../core/types';

function makeWorld(
  resources: ResourceNode[],
  opts: { revealAll?: boolean } = {},
): {
  world: AntWorld;
  state: { food: number; delivered: number };
} {
  const state = { food: 0, delivered: 0 };
  const nest = { hp: NEST.HP_MAX, hpMax: NEST.HP_MAX, x: 0, y: 0 };
  const fog = new FogOfWar(2000, 2000);
  if (opts.revealAll !== false) fog.reveal(0, 0, 800); // tudo revelado por padrão
  const events = new EventBus();
  const queen = createQueen();

  const world: AntWorld = {
    w: 2000,
    h: 2000,
    nest,
    queen,
    resources,
    fog,
    rng: new Rng(42),
    events,
    food: () => state.food,
    depositFood: (units, kind, by) => {
      state.food += units * RESOURCES[kind].food;
      state.delivered += units;
      events.emit('food_deposited', { units, food: units * RESOURCES[kind].food, by });
    },
    takeFood: (units) => {
      if (state.food >= units) {
        state.food -= units;
        return true;
      }
      return false;
    },
    feedQueen: () => {},
    repairNest: () => {},
    nearestRevealedResource: (x, y, maxDist) => {
      let best: ResourceNode | null = null;
      let bestD2 = maxDist * maxDist;
      for (const r of resources) {
        if (r.amount <= 0) continue;
        if (!fog.isRevealed(r.x, r.y)) continue; // mesma regra do motor
        const d2 = (r.x - x) ** 2 + (r.y - y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = r;
        }
      }
      return best;
    },
    popTotal: () => 0,
    queueLength: () => 0,
  };
  return { world, state };
}

function makeCollector(): Ant {
  return createAnt('collector', 0, 0, () => 0.5);
}

describe('coletora — loop econômico completo', () => {
  it('colhe uma folha e deposita 2 de comida no ninho', () => {
    const resources: ResourceNode[] = [
      { id: 1, kind: 'leaf', x: 60, y: 0, amount: 1 },
    ];
    const { world, state } = makeWorld(resources);
    const ant = makeCollector();

    // 30s de simulação a 60Hz — viagem curta, sobra margem
    for (let i = 0; i < 30 * 60; i++) {
      updateCollector(ant, world, 1 / 60);
    }

    expect(state.delivered).toBe(1);
    expect(state.food).toBe(RESOURCES.leaf.food);
    expect(resources[0]?.amount).toBe(0);
  });

  it('carrega até 3 unidades antes de voltar', () => {
    const resources: ResourceNode[] = [
      { id: 1, kind: 'leaf', x: 50, y: 0, amount: 3 },
    ];
    const { world, state } = makeWorld(resources);
    const ant = makeCollector();

    for (let i = 0; i < 60 * 60; i++) {
      updateCollector(ant, world, 1 / 60);
    }

    expect(state.delivered).toBe(3);
    expect(state.food).toBe(3 * RESOURCES.leaf.food);
  });

  it('volta com carga parcial quando o nó esgota antes de encher', () => {
    const resources: ResourceNode[] = [
      { id: 1, kind: 'leaf', x: 50, y: 0, amount: 2 },
    ];
    const { world, state } = makeWorld(resources);
    const ant = makeCollector();

    for (let i = 0; i < 60 * 60; i++) {
      updateCollector(ant, world, 1 / 60);
    }

    expect(state.delivered).toBe(2);
  });

  it('sem recurso perto, vagueia sem travar nem depositar', () => {
    const resources: ResourceNode[] = [];
    const { world, state } = makeWorld(resources);
    const ant = makeCollector();

    for (let i = 0; i < 20 * 60; i++) {
      updateCollector(ant, world, 1 / 60);
    }

    expect(state.delivered).toBe(0);
    // continua dentro do mundo
    expect(ant.x).toBeGreaterThanOrEqual(0);
    expect(ant.x).toBeLessThanOrEqual(world.w);
  });

  it('não mira recurso fora da névoa', () => {
    const resources: ResourceNode[] = [
      { id: 1, kind: 'leaf', x: 60, y: 0, amount: 1 },
    ];
    const { world, state } = makeWorld(resources, { revealAll: false });
    const ant = makeCollector();

    for (let i = 0; i < 10 * 60; i++) {
      updateCollector(ant, world, 1 / 60);
    }

    expect(state.delivered).toBe(0); // nunca achou: invisível
    expect(resources[0]?.amount).toBe(1);
  });
});
