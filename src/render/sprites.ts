/**
 * Registro de todos os sprites do jogo — chamado uma vez no boot.
 * Contratos com as dimensões provisórias da Parte 12.8.
 */
import { ANTS, NEST, QUEEN, RESOURCES } from '../core/constants';
import { contractOf, registerSprite } from './spriteRegistry';
import {
  ANT_PLACEHOLDER_COLORS,
  drawAntPlaceholder,
  drawNestMound,
  drawQueenPlaceholder,
  drawResource,
} from './placeholderShapes';
import type { AntClass } from '../core/types';

const ANT_CLASSES: AntClass[] = ['worker', 'collector', 'scout', 'soldier', 'defender', 'toxic', 'giant'];

export function registerAllSprites(): void {
  // formigas
  for (const cls of ANT_CLASSES) {
    const stats = ANTS[cls];
    registerSprite(
      contractOf(`ant:${cls}`, stats.sprite, stats.sprite, `ant:${cls}`),
      (ctx, opts) => {
        drawAntPlaceholder(ctx, {
          x: opts.x,
          y: opts.y,
          dir: opts.dir ?? 1,
          size: stats.sprite,
          colors: ANT_PLACEHOLDER_COLORS[cls] ?? ANT_PLACEHOLDER_COLORS.worker,
          walkPhase: opts.walkPhase ?? 0,
          carrying: opts.carrying,
          highlight: opts.highlight,
        });
      },
    );
  }

  // rainha
  registerSprite(
    contractOf('queen:queen', QUEEN.SPRITE, QUEEN.SPRITE, 'queen', { anchorY: 0.6 }),
    (ctx, opts) => {
      drawQueenPlaceholder(ctx, { x: opts.x, y: opts.y, size: QUEEN.SPRITE });
    },
  );

  // ninho
  registerSprite(
    contractOf('nest:mound', NEST.MOUND_RADIUS * 2, NEST.MOUND_RADIUS, 'nest'),
    (ctx, opts) => {
      drawNestMound(ctx, { x: opts.x, y: opts.y, r: NEST.MOUND_RADIUS });
    },
  );

  // recursos
  for (const [kind, info] of Object.entries(RESOURCES)) {
    registerSprite(
      contractOf(`resource:${kind}`, info.sprite, info.sprite, `resource:${kind}`),
      (ctx, opts) => {
        drawResource(ctx, kind, opts.x, opts.y, info.sprite);
      },
    );
  }
}
