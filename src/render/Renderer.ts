/**
 * Renderer — Canvas 2D pixel-perfect (regra #8):
 * escala inteira quando a tela permite, smoothing desligado, coordenadas
 * arredondadas. Fiel ao original: chão quadriculado 2 tons por mapa,
 * sprites extraídos do HTML, inimigos-emoji, chefe com halo pulsante.
 */
import { ANTS, ENEMIES, MAPS, PALETTE, SPRITE_DRAW, WORLD } from '../core/constants';
import { BOSS_SMASH } from '../core/constants';
import type { Scene } from '../core/types';
import type { Camera } from './Camera';
import { drawAnt, drawEmoji, drawEnemyFrames, drawSprite, type SpriteSet } from './sprites';
import type { Ant, Enemy, Prop, ResourceNode } from '../core/types';

interface View { left: number; top: number; right: number; bottom: number }

type Drawable =
  | { y: number; kind: 'prop'; p: Prop }
  | { y: number; kind: 'res'; r: ResourceNode }
  | { y: number; kind: 'nest' }
  | { y: number; kind: 'ant'; a: Ant }
  | { y: number; kind: 'enemy'; e: Enemy };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private onResize: () => void;
  /** [O] nuvens à deriva (screen-space) */
  private clouds = Array.from({ length: 5 }, (_, i) => ({
    speed: 14 + i * 5,
    x: Math.random(),
    y: 0.06 + i * 0.17,
    scale: 0.9 + (i % 3) * 0.35,
  }));

  constructor(canvas: HTMLCanvasElement, private camera: Camera, private sprites: SpriteSet | null) {
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

    const z = camera.zoom * dpr;
    const camLeft = Math.round(camera.left);
    const camTop = Math.round(camera.top);
    const sh = scene.shake;
    const shX = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    const shY = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    ctx.setTransform(z, 0, 0, z, (-camLeft + shX) * z, (-camTop + shY) * z);
    ctx.imageSmoothingEnabled = false;

    const view: View = {
      left: camLeft,
      top: camTop,
      right: camLeft + camera.vw + 1,
      bottom: camTop + camera.vh + 1,
    };

    this.drawGround(ctx, scene, view);
    this.drawSorted(ctx, scene, view);
    this.drawSmashFx(ctx, scene);
    this.drawTapMarks(ctx, scene);
    this.drawFog(ctx, scene, view);
    this.drawClouds(ctx);
  }

  /** [O tapMarks] anel do comando CHAMAR (toque/toque duplo) */
  private drawTapMarks(ctx: CanvasRenderingContext2D, scene: Scene): void {
    for (const m of scene.tapMarks) {
      const k = 1 - m.t / 0.45;
      ctx.strokeStyle = `rgba(${m.color}, ${(0.9 * (1 - k)).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 14 + k * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${m.color}, ${(0.8 * (1 - k)).toFixed(3)})`;
      ctx.fill();
    }
  }

  /** [O] anel do smash do chefe */
  private drawSmashFx(ctx: CanvasRenderingContext2D, scene: Scene): void {
    for (const f of scene.smashFx) {
      const k = 1 - f.t / BOSS_SMASH.RING_SEC;
      const r = 40 + k * (BOSS_SMASH.RADIUS + 40);
      ctx.strokeStyle = `rgba(217, 74, 59, ${0.7 * (1 - k)})`;
      ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** [O] nuvens à deriva cobrindo a tela (screen-space) */
  private drawClouds(ctx: CanvasRenderingContext2D): void {
    const spr = this.sprites?.cloud;
    if (!spr) return;
    const vw = this.camera.vw;
    const vh = this.camera.vh;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = this.canvas.width / (this.canvas.clientWidth || 1);
    ctx.scale(dpr, dpr);
    ctx.globalAlpha = 0.45;
    const t = performance.now() / 1000;
    for (const c of this.clouds) {
      const w = vw * 0.16 * c.scale;
      const h = w * (spr.height / spr.width);
      const x = (((c.x + (t * c.speed) / vw) % 1.3) - 0.15) * vw;
      const y = c.y * vh + Math.sin(t * 0.3 + c.speed) * vh * 0.03;
      ctx.drawImage(spr, x - w / 2, y, w, h);
    }
    ctx.restore();
  }

  /** [O] chão quadriculado em 2 tons (célula 48, como a névoa). */
  private drawGround(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
    const map = MAPS[scene.mapId];
    ctx.fillStyle = map.ground;
    ctx.fillRect(view.left - 2, view.top - 2, view.right - view.left + 4, view.bottom - view.top + 4);

    const cell = 48;
    ctx.fillStyle = map.groundAlt;
    const c0 = Math.floor(view.left / cell);
    const c1 = Math.ceil(view.right / cell);
    const r0 = Math.floor(view.top / cell);
    const r1 = Math.ceil(view.bottom / cell);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if ((row + col) % 2 === 0) continue;
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }

  /** Desenha props/recursos/ninho/formigas/inimigos ordenados por y. */
  private drawSorted(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
    const items: Drawable[] = [];

    for (const p of scene.props) {
      if (p.x < view.left - 80 || p.x > view.right + 80 || p.y < view.top - 120 || p.y > view.bottom + 80) continue;
      items.push({ y: p.y, kind: 'prop', p });
    }
    for (const r of scene.resources) {
      if (r.amount <= 0) continue;
      if (r.x < view.left - 40 || r.x > view.right + 40 || r.y < view.top - 40 || r.y > view.bottom + 40) continue;
      items.push({ y: r.y, kind: 'res', r });
    }
    if (scene.nest.x > view.left - 120 && scene.nest.x < view.right + 120 &&
        scene.nest.y > view.top - 120 && scene.nest.y < view.bottom + 120) {
      items.push({ y: scene.nest.y, kind: 'nest' });
    }
    for (const a of scene.ants) {
      if (a.x < view.left - 40 || a.x > view.right + 40 || a.y < view.top - 40 || a.y > view.bottom + 40) continue;
      items.push({ y: a.y, kind: 'ant', a });
    }
    for (const e of scene.enemies) {
      if (e.x < view.left - 200 || e.x > view.right + 200 || e.y < view.top - 200 || e.y > view.bottom + 200) continue;
      items.push({ y: e.y, kind: 'enemy', e });
    }

    items.sort((p, q) => p.y - q.y);

    for (const it of items) {
      switch (it.kind) {
        case 'prop': this.drawProp(ctx, it.p); break;
        case 'res': this.drawResource(ctx, it.r, scene.timeSec); break;
        case 'nest': this.drawNest(ctx, scene); break;
        case 'ant': this.drawAntEntity(ctx, it.a, scene.selectedAntId === it.a.id); break;
        case 'enemy': this.drawEnemyEntity(ctx, it.e, scene.timeSec); break;
      }
    }
  }

  private drawProp(ctx: CanvasRenderingContext2D, p: Prop): void {
    const s = this.sprites;
    if (!s) return;
    switch (p.kind) {
      case 'tree':
        drawSprite(ctx, s.tree, p.x, p.y, SPRITE_DRAW.TREE * p.s);
        break;
      case 'stoneBig':
        drawSprite(ctx, s.stoneBig, p.x, p.y, SPRITE_DRAW.STONE_BIG * p.s);
        break;
      case 'stoneSmall':
        drawSprite(ctx, s.stoneSmall, p.x, p.y, SPRITE_DRAW.STONE_SMALL * p.s);
        break;
      case 'mushroomProp':
        drawSprite(ctx, s.mushroom, p.x, p.y, SPRITE_DRAW.MUSHROOM * p.s);
        break;
      case 'pool': {
        ctx.fillStyle = '#3d7a8c';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 46 * p.s, 30 * p.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5aa7b8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 3 * p.s, 36 * p.s, 22 * p.s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'mote':
        ctx.fillStyle = '#6b4a2f';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 26 * p.s, 12 * p.s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'grass': {
        ctx.strokeStyle = '#3e7a34';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(p.x + i * 5, p.y);
          ctx.lineTo(p.x + i * 7, p.y - 14 * p.s);
          ctx.stroke();
        }
        break;
      }
      case 'flower': {
        ctx.fillStyle = ['#e86a8a', '#f2c14e', '#b67ad9', '#f5f0e6'][(p.x | 0) % 4 & 3] ?? '#e86a8a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 * p.s, 4 * p.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3e7a34';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 4 * p.s);
        ctx.stroke();
        break;
      }
    }
  }

  private drawResource(ctx: CanvasRenderingContext2D, r: ResourceNode, timeSec: number): void {
    const s = this.sprites;
    if (!s) return;
    const bob = Math.sin(timeSec * 2 + r.phase) * 3;
    // folha e cogumelo têm sprite; demais são emoji (como no original)
    if (r.kind === 'leaf' && s.leaf) drawSprite(ctx, s.leaf, r.x, r.y + bob, SPRITE_DRAW.LEAF);
    else if (r.kind === 'mushroom' && s.mushroom) drawSprite(ctx, s.mushroom, r.x, r.y + bob, SPRITE_DRAW.MUSHROOM);
    else {
      const icon = r.kind === 'cactus' ? '🌵' : r.kind === 'banana' ? '🍌'
        : r.kind === 'flower' ? '🌸' : '💎';
      drawEmoji(ctx, icon, r.x, r.y + bob, 30);
    }
  }

  private drawNest(ctx: CanvasRenderingContext2D, scene: Scene): void {
    const s = this.sprites;
    // sombra/monte de terra sob o ninho
    ctx.fillStyle = '#5d4025';
    ctx.beginPath();
    ctx.ellipse(scene.nest.x, scene.nest.y + 18, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s) drawSprite(ctx, s.nest, scene.nest.x, scene.nest.y, SPRITE_DRAW.NEST);
    if (scene.nest.hp < scene.nest.hpMax) {
      const w = 64;
      ctx.fillStyle = '#14120f';
      ctx.fillRect(scene.nest.x - w / 2, scene.nest.y + 32, w, 5);
      ctx.fillStyle = scene.nest.hp / scene.nest.hpMax > 0.35 ? '#55b84b' : '#d94a3b';
      ctx.fillRect(scene.nest.x - w / 2 + 1, scene.nest.y + 33, (w - 2) * (scene.nest.hp / scene.nest.hpMax), 3);
    }
  }

  private drawAntEntity(ctx: CanvasRenderingContext2D, a: Ant, selected: boolean): void {
    const s = this.sprites;
    if (!s) return;
    if (selected) {
      ctx.strokeStyle = '#fbd046';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    const frames = s.antFrames[a.cls];
    // carga carregada: pequena folha sobre a formiga
    if (a.carrying > 0 && s.leaf) drawSprite(ctx, s.leaf, a.x - a.dir * 6, a.y - 12, 12);
    drawAnt(ctx, frames, a.x, a.y, a.dir, a.walkPhase, ANTS[a.cls].size, a.z);
  }

  private drawEnemyEntity(ctx: CanvasRenderingContext2D, e: Enemy, timeSec: number): void {
    const s = this.sprites;
    if (!s) return;

    if (e.boss) {
      // [O] halo pulsante: scale*(.52+.04·sin(t·3))
      const pulse = e.scale * (SPRITE_DRAW.BOSS_PULSE + SPRITE_DRAW.BOSS_PULSE_AMPL * Math.sin(timeSec * 3));
      const grad = ctx.createRadialGradient(e.x, e.y, pulse * 0.3, e.x, e.y, pulse);
      grad.addColorStop(0, 'rgba(217, 74, 59, 0.05)');
      grad.addColorStop(1, 'rgba(217, 74, 59, 0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, pulse, 0, Math.PI * 2);
      ctx.fill();

      const frame = s.boss[e.kind];
      if (frame) {
        drawSprite(ctx, frame, e.x, e.y, e.scale * SPRITE_DRAW.BOSS_W);
      } else {
        drawEmoji(ctx, ENEMIES[e.kind].icon, e.x, e.y, e.scale * SPRITE_DRAW.BOSS_W * 0.6);
      }
      return;
    }

    if (e.kind === 'spider') {
      drawEnemyFrames(ctx, s.spiderFrames, e.x, e.y, e.dir, e.walkPhase, e.scale);
    } else if (e.kind === 'caterpillar') {
      drawEnemyFrames(ctx, s.caterpillarFrames, e.x, e.y, e.dir, e.walkPhase, e.scale);
    } else {
      drawEmoji(ctx, ENEMIES[e.kind].icon, e.x, e.y, e.scale);
    }

    // barra de vida só quando ferido
    if (e.hp < e.hpMax) {
      const w = Math.max(24, e.scale * 0.5);
      ctx.fillStyle = '#14120f';
      ctx.fillRect(e.x - w / 2, e.y - e.scale * 0.55 - 8, w, 4);
      ctx.fillStyle = '#d94a3b';
      ctx.fillRect(e.x - w / 2 + 0.5, e.y - e.scale * 0.55 - 7.5, (w - 1) * (e.hp / e.hpMax), 3);
    }
  }

  /** Névoa: sólida no não revelado, sombra leve no revelado-inativo. */
  private drawFog(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
    const fog = scene.fog;
    const cell = fog.cell;
    const c0 = Math.max(0, Math.floor(view.left / cell));
    const c1 = Math.min(fog.cols - 1, Math.floor(view.right / cell));
    const r0 = Math.max(0, Math.floor(view.top / cell));
    const r1 = Math.min(fog.rows - 1, Math.floor(view.bottom / cell));

    for (let row = r0; row <= r1; row++) {
      let col = c0;
      while (col <= c1) {
        const i = row * fog.cols + col;
        if (fog.isRevealedCell(i)) {
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
