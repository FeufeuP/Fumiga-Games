/**
 * Gramado — o mapa externo é um GRAMADO (decisão do usuário), não terra.
 * Detalhes por célula com hash determinístico: o cenário não treme entre
 * frames e nada precisa ser armazenado — só matemática.
 */
import { GRASS, PALETTE } from '../core/constants';

function hash2(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const CELL = 40;

/**
 * Desenha o chão do gramado na área visível (left/top/width/height em px
 * de mundo). Fora dos limites do mundo: cor de fundo.
 */
export function drawGrassland(
  ctx: CanvasRenderingContext2D,
  view: { left: number; top: number; width: number; height: number },
  worldW: number,
  worldH: number,
): void {
  // base
  ctx.fillStyle = PALETTE.FUNDO;
  ctx.fillRect(
    Math.floor(view.left),
    Math.floor(view.top),
    Math.ceil(view.width) + 1,
    Math.ceil(view.height) + 1,
  );

  const x0 = Math.max(0, view.left);
  const y0 = Math.max(0, view.top);
  const x1 = Math.min(worldW, view.left + view.width);
  const y1 = Math.min(worldH, view.top + view.height);
  if (x1 <= x0 || y1 <= y0) return;

  ctx.fillStyle = GRASS.BASE;
  ctx.fillRect(Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0), Math.ceil(y1 - y0));

  const c0 = Math.floor(x0 / CELL);
  const c1 = Math.floor(x1 / CELL);
  const r0 = Math.floor(y0 / CELL);
  const r1 = Math.floor(y1 / CELL);

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const h = hash2(col, row);
      const cx = col * CELL;
      const cy = row * CELL;

      if (h < 0.1) {
        // mancha escura orgânica
        ctx.fillStyle = GRASS.PATCH_DARK;
        const w = 14 + Math.floor(hash2(col * 3 + 1, row) * 18);
        const hh = 8 + Math.floor(hash2(col, row * 3 + 2) * 12);
        ctx.fillRect(cx + 6, cy + 8, w, hh);
      } else if (h < 0.18) {
        // mancha clara
        ctx.fillStyle = GRASS.PATCH_LIGHT;
        const w = 12 + Math.floor(hash2(col * 5 + 3, row) * 14);
        ctx.fillRect(cx + 10, cy + 14, w, 8);
      }

      // tufos de grama (2-3 traços verticais)
      const th = hash2(col + 7777, row + 1234);
      if (th < 0.34) {
        ctx.fillStyle = GRASS.TUFT;
        const bx = cx + Math.floor(th * 30) + 3;
        const by = cy + Math.floor(hash2(col, row + 555) * 28) + 4;
        ctx.fillRect(bx, by, 2, 5);
        ctx.fillRect(bx + 4, by + 2, 2, 4);
        if (th < 0.15) ctx.fillRect(bx - 4, by + 1, 2, 4);
      }
    }
  }
}
