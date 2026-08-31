/**
 * Renderer — Canvas 2D pixel-perfect (regra de engenharia #8):
 * escala inteira quando a tela permite, smoothing desligado, coordenadas
 * arredondadas no desenho. A câmera transform é aplicada uma vez por frame.
 */
import { PALETTE, WORLD } from '../core/constants';
import type { Scene } from '../core/types';
import { drawGrassland } from './drawGrassland';
import { drawEntities } from './drawEntities';
import type { Camera } from './Camera';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private onResize: () => void;

  constructor(canvas: HTMLCanvasElement, private camera: Camera) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível.');
    this.ctx = ctx;
    this.onResize = () => this.resize();
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
  }

  /**
   * Recalcula o backing store (dpr) e o zoom. Zoom inteiro sempre que a
   * janela cobre a viewport lógica; abaixo disso, escala fracionária para
   * não mostrar um recorte minúsculo no celular.
   */
  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = this.canvas.clientWidth || window.innerWidth;
    const ch = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    const fit = Math.min(cw / WORLD.VIEWPORT_WIDTH, ch / WORLD.VIEWPORT_HEIGHT);
    this.camera.zoom = fit >= 1 ? Math.max(1, Math.floor(fit)) : Math.max(0.45, fit);
    this.camera.vw = cw / this.camera.zoom;
    this.camera.vh = ch / this.camera.zoom;
    this.camera.clamp();
  }

  draw(scene: Scene): void {
    const { ctx, camera } = this;
    const dpr = this.canvas.width / (this.canvas.clientWidth || 1);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.FUNDO;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // escala do dispositivo × zoom do jogo, câmera em pixels inteiros
    const z = camera.zoom * dpr;
    const camLeft = Math.round(camera.left);
    const camTop = Math.round(camera.top);
    ctx.setTransform(z, 0, 0, z, -camLeft * z, -camTop * z);
    ctx.imageSmoothingEnabled = false;

    const view = {
      left: camLeft,
      top: camTop,
      width: camera.vw + 1,
      height: camera.vh + 1,
      right: camLeft + camera.vw + 1,
      bottom: camTop + camera.vh + 1,
    };

    drawGrassland(ctx, view, scene.w, scene.h);
    drawEntities(ctx, scene, view);
    this.drawFog(ctx, scene, view);
  }

  /** Névoa: sólida no não revelado, sombra leve no revelado-inativo. */
  private drawFog(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    view: { left: number; top: number; right: number; bottom: number },
  ): void {
    const fog = scene.fog;
    const cell = fog.cell;
    const c0 = Math.max(0, Math.floor(view.left / cell));
    const c1 = Math.min(fog.cols - 1, Math.floor(view.right / cell));
    const r0 = Math.max(0, Math.floor(view.top / cell));
    const r1 = Math.min(fog.rows - 1, Math.floor(view.bottom / cell));

    for (let row = r0; row <= r1; row++) {
      // varre por faixas de mesmo estado para um fill por run
      let col = c0;
      while (col <= c1) {
        const i = row * fog.cols + col;
        const revealed = fog.isRevealedCell(i);
        if (revealed) {
          col++;
          continue;
        }
        let end = col + 1;
        while (end <= c1 && !fog.isRevealedCell(row * fog.cols + end)) end++;
        ctx.fillStyle = PALETTE.FUNDO;
        ctx.fillRect(col * cell, row * cell, (end - col) * cell, cell);
        col = end;
      }
    }

    // revelado mas fora do raio ativo: sombra
    ctx.fillStyle = 'rgba(20, 18, 15, 0.45)';
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const i = row * fog.cols + col;
        if (!fog.isRevealedCell(i) || fog.isActiveCell(i)) continue;
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }
}
