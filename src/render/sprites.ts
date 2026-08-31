/**
 * Carregador dos sprites ORIGINAIS (extraídos de Formigueiro.original.html).
 * Técnicas do bundle preservadas:
 *  · recoloração por faixa de pixel (H0): laranja→corA, marrom-escuro→corB
 *    — é assim que Operária/Soldado/Exploradora compartilham a mesma folha;
 *  · formiga 96×96 desenhada a ⅓ (32px), âncora (43, 45.5)/3;
 *  · animações: operária 7 frames, lagarta 7, aranha 6.
 */
import { ANT_RECOLOR, ANT_SPRITE, type AntClass, type EnemyKind } from '../core/constants';

const urls = import.meta.glob('../assets/sprites/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function url(name: string): string {
  const u = urls[`../assets/sprites/${name}`];
  if (!u) throw new Error(`Sprite ausente: ${name}`);
  return u;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = src;
  });
}

/** [O] recoloração do original: pixels laranja→a, marrom-escuro→b */
export function recolor(img: Frame, a: string, b: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  const pa = hex(a);
  const pb = hex(b);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    const r = p[i], g = p[i + 1], bch = p[i + 2];
    if (r > 180 && g > 60 && g < 130 && bch < 80) {
      p[i] = pa[0]; p[i + 1] = pa[1]; p[i + 2] = pa[2];
    } else if (r > 90 && r < 160 && g < 80 && bch < 60) {
      p[i] = pb[0]; p[i + 1] = pb[1]; p[i + 2] = pb[2];
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function hex(h: string): [number, number, number] {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export type Frame = CanvasImageSource & { width: number; height: number };

export interface SpriteSet {
  antFrames: Record<AntClass, Frame[]>;   // worker/soldier/scout (recolored)
  caterpillarFrames: Frame[];
  spiderFrames: Frame[];
  tree: Frame;
  mushroom: Frame;
  leaf: Frame;
  nest: Frame;
  stoneSmall: Frame;
  stoneBig: Frame;
  boss: Partial<Record<EnemyKind, Frame>>;
  heroAnt: Frame;
  heroAntUrl: string;
  menuBg: string;
  btnBack: string;
  soundOn: string;
  soundOff: string;
  woodTile: string;
}

let cached: SpriteSet | null = null;

export async function loadSprites(): Promise<SpriteSet> {
  if (cached) return cached;

  const [
    w1, w2, w3, w4, w5, w6, w7,
    c1, c2, c3, c4, c5, c6, c7,
    s1, s2, s3, s4, s5, s6,
    tree, mushroom, leaf, nest, stoneSmall, stoneBig,
    bAntlion, bMosquito, bScorpion, bMantis, bCentipede, bMoth, heroAnt,
  ] = await Promise.all([
    loadImage(url('ant_worker_frame1.png')), loadImage(url('ant_worker_frame2.png')),
    loadImage(url('ant_worker_frame3.png')), loadImage(url('ant_worker_frame4.png')),
    loadImage(url('ant_worker_frame5.png')), loadImage(url('ant_worker_frame6.png')),
    loadImage(url('ant_worker_frame7.png')),
    loadImage(url('caterpillar_frame1.png')), loadImage(url('caterpillar_frame2.png')),
    loadImage(url('caterpillar_frame3.png')), loadImage(url('caterpillar_frame4.png')),
    loadImage(url('caterpillar_frame5.png')), loadImage(url('caterpillar_frame6.png')),
    loadImage(url('caterpillar_frame7.png')),
    loadImage(url('spider_frame1.png')), loadImage(url('spider_frame2.png')),
    loadImage(url('spider_frame3.png')), loadImage(url('spider_frame4.png')),
    loadImage(url('spider_frame5.png')), loadImage(url('spider_frame6.png')),
    loadImage(url('tree.png')), loadImage(url('mushroom.png')), loadImage(url('leaf.png')),
    loadImage(url('nest.png')), loadImage(url('stone_small.png')), loadImage(url('stone_big.png')),
    loadImage(url('boss_antlion.png')), loadImage(url('boss_mosquito.png')),
    loadImage(url('boss_scorpion.png')), loadImage(url('boss_mantis.png')),
    loadImage(url('boss_centipede.png')), loadImage(url('boss_moth.png')),
    loadImage(url('hero_ant.png')),
  ]);

  const workerFrames = [w1, w2, w3, w4, w5, w6, w7] as Frame[];
  const soldierFrames = workerFrames.map((f) => recolor(f, ANT_RECOLOR.soldier.a, ANT_RECOLOR.soldier.b) as unknown as Frame);
  const scoutFrames = workerFrames.map((f) => recolor(f, ANT_RECOLOR.scout.a, ANT_RECOLOR.scout.b) as unknown as Frame);

  cached = {
    antFrames: { worker: workerFrames, soldier: soldierFrames, scout: scoutFrames },
    caterpillarFrames: [c1, c2, c3, c4, c5, c6, c7] as Frame[],
    spiderFrames: [s1, s2, s3, s4, s5, s6] as Frame[],
    tree, mushroom, leaf, nest, stoneSmall, stoneBig,
    boss: {
      antlion: bAntlion, mosquito: bMosquito, scorpion: bScorpion,
      mantis: bMantis, centipede: bCentipede, moth: bMoth,
    },
    heroAnt, heroAntUrl: url('hero_ant.png'),
    menuBg: url('menu_background.jpg'),
    btnBack: url('btn_back.png'),
    soundOn: url('sound_on.png'),
    soundOff: url('sound_off.png'),
    woodTile: url('interior_wood_tile.png'),
  };
  return cached;
}

/** Desenha uma formiga animada — tamanho por classe [O K0], âncora z=y/32. */
export function drawAnt(
  ctx: CanvasRenderingContext2D,
  frames: Frame[],
  x: number,
  y: number,
  dir: 1 | -1,
  walkPhase: number,
  size: number,
): void {
  if (frames.length === 0) return;
  const idx = Math.floor(walkPhase) % frames.length;
  const f = frames[idx] as Frame;
  const z = size / ANT_SPRITE.DRAW_BASE;
  const ax = ANT_SPRITE.ANCHOR_X * z;
  const ay = ANT_SPRITE.ANCHOR_Y * z;
  // sombra [O]: elipse rgba(0,0,0,0.22), raio = size/22×6
  const p = (size / 22) * 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y) + 3, p, p * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(f, -ax, -ay, size, size);
  ctx.restore();
}

/** Desenha sprite centralizado com largura alvo (pixel-perfect). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  x: number,
  y: number,
  width: number,
): void {
  const h = (f.height / f.width) * width;
  ctx.drawImage(f, Math.round(x - width / 2), Math.round(y - h / 2), Math.round(width), Math.round(h));
}

/** Desenha frame animado de inimigo (aranha/lagarta). */
export function drawEnemyFrames(
  ctx: CanvasRenderingContext2D,
  frames: Frame[],
  x: number,
  y: number,
  dir: 1 | -1,
  walkPhase: number,
  width: number,
): void {
  if (frames.length === 0) return;
  const idx = Math.floor(walkPhase * 0.5) % frames.length;
  const f = frames[idx] as Frame;
  const h = (f.height / f.width) * width;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(f, -width / 2, -h / 2, width, h);
  ctx.restore();
}

/** Inimigos por emoji — técnica do original (de() renderiza emoji em canvas). */
export function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size: number,
): void {
  ctx.save();
  ctx.font = `${Math.round(size)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, Math.round(x), Math.round(y));
  ctx.restore();
}
