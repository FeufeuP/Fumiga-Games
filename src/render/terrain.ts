/**
 * Terreno procedural — gera o chão do mundo a partir do tileset extraído da
 * arte de referência (`src/assets/tiles/*.png`, ver `scripts/extract-tiles.py`).
 *
 * Como funciona, em três camadas:
 *
 *  1. CAMPO DE VALOR (determinístico): value noise com 3 oitavas, semeado pelo
 *     `seed` do mapa. Duas amostras independentes por célula — uma decide o
 *     BIOMA local (grama → terra → areia), outra escolhe a VARIAÇÃO do tile.
 *     Como o ruído é função pura de (x, y, seed), o mesmo mapa gera sempre o
 *     mesmo chão, sem precisar guardar nada no save.
 *
 *  2. TRANSIÇÃO SUAVE: o problema clássico de tileset é a borda dura entre
 *     grama e terra. Aqui a passagem é feita por *dithering espacial* — na
 *     faixa de fronteira, a chance de um tile ser do bioma seguinte cresce
 *     junto com o ruído, usando uma matriz de Bayer 4×4 como limiar. Isso
 *     mistura os dois tipos numa faixa larga, como um degradê pontilhado, em
 *     vez de um recorte reto. Por cima, as bordas ainda recebem um recorte
 *     alfa orgânico (`edgeMask`) que dissolve o quadrado do tile.
 *
 *  3. CACHE EM CHUNK: o chão é rasterizado uma vez por bloco de 8×8 tiles num
 *     canvas fora de tela e depois só copiado. Sem isso seriam ~1500
 *     drawImage por frame; com o cache são ~12 blits.
 */
import { Rng } from '../core/rng';
import type { MapId } from '../core/constants';

export const TILE = 64;              // px de um tile no atlas
export const CHUNK = 8;              // tiles por lado de um chunk
const CHUNK_PX = TILE * CHUNK;

/** Classes de terreno, da mais "viva" para a mais "seca". */
export type TerrainKind = 'grass' | 'detail' | 'dirt' | 'sand';

export interface TileAtlas {
  image: CanvasImageSource;
  cols: number;
  tile: number;
  groups: Record<TerrainKind, number[]>;
}

export type TerrainAtlases = Partial<Record<MapId, TileAtlas>>;

// ---------------------------------------------------------------- ruído ----

/**
 * Hash inteiro estável (função pura de x, y, seed), em [0,1).
 * Tudo com `Math.imul` e `| 0`: multiplicação de float perde precisão acima de
 * 2^53 e faria o hash colapsar num valor só (o terreno saía todo do mesmo
 * tipo). Aqui a aritmética é sempre 32 bits, então cada célula recebe um
 * valor distinto.
 */
function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise bilinear em [0,1). */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
}

/** Ruído fracionário (3 oitavas) — manchas grandes com detalhe fino. */
function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < 3; o++) {
    sum += valueNoise(x * freq, y * freq, seed + o * 7919) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return sum / norm;
}

// ------------------------------------------------------------- seleção -----

export interface TerrainParams {
  /** escala das manchas (menor = manchas maiores) */
  scale: number;
  /** limiar grama→terra */
  dirtAt: number;
  /** limiar terra→areia */
  sandAt: number;
  /** reservado: largura de mistura (a suavidade real vem da máscara) */
  blend: number;
  /** chance de um tile de grama virar tile com detalhe (flor, pedra…) */
  detail: number;
}

export const DEFAULT_PARAMS: TerrainParams = {
  scale: 0.055,
  dirtAt: 0.62,
  sandAt: 0.80,
  blend: 0.09,
  detail: 0.30,
};

/**
 * Decide a classe de terreno da célula (tx, ty).
 * A transição usa o dithering de Bayer: dentro da faixa `blend`, quanto mais
 * perto do limiar, maior a chance da célula já pertencer ao próximo bioma.
 */
export function kindAt(tx: number, ty: number, seed: number, p: TerrainParams): TerrainKind {
  const n = fbm(tx * p.scale, ty * p.scale, seed);
  // Sem dithering aqui: a mancha tem de ser MACIÇA. Dither no limiar picotava
  // a clareira num xadrez (26% dos tiles de terra ficavam isolados). A
  // suavidade da transição vem da máscara direcional aplicada no desenho,
  // não de furar o miolo da mancha.
  if (n > p.sandAt) return 'sand';
  if (n > p.dirtAt) return 'dirt';

  // grama: parte vira "detail" (flor/pedra/moita) para quebrar a repetição
  const d = hash2(tx, ty, seed ^ 0x5bf03635);
  return d < p.detail ? 'detail' : 'grass';
}

/** Índice do tile dentro do grupo — variação estável por célula. */
export function variantAt(tx: number, ty: number, seed: number, count: number): number {
  if (count <= 1) return 0;
  return Math.floor(hash2(tx, ty, seed ^ 0x27d4eb2d) * count) % count;
}

// ---------------------------------------------------- máscara de borda -----

/**
 * Máscara alfa que dissolve a silhueta quadrada do tile de transição.
 * Gerada uma vez e reaproveitada; o recorte é orgânico (harmônicos de seno),
 * então a borda entre grama e terra fica irregular como na arte.
 */
/**
 * Máscaras DIRECIONAIS: a chave é o conjunto de lados que fazem fronteira
 * (bitmask N/E/S/W) mais uma variação. O tile só desbota do lado em que
 * realmente encosta num terreno mais raso — do lado em que continua a mesma
 * mancha ele fica opaco até a borda, e os vizinhos se emendam num bloco só.
 *
 * Era esse o defeito de usar uma máscara radial única: cada tile de terra
 * apagava nos 4 lados e virava uma bolinha solta no meio da grama.
 */
const MASK_VARIANTS = 3;
const edgeMasks = new Map<number, HTMLCanvasElement>();

function buildEdgeMask(sides: number, variant: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const rng = new Rng(0x7e44a1 + sides * 131 + variant * 977);
  const ph = [rng.float(0, 6.283), rng.float(0, 6.283), rng.float(0, 6.283)];
  const img = ctx.createImageData(TILE, TILE);
  const half = TILE * 0.5;
  const FADE = 0.46;            // largura da faixa que desbota (em meia-célula)

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      // distância a cada lado, só contando os que são fronteira
      let d = 1;
      if (sides & 1) d = Math.min(d, y / half);                    // N
      if (sides & 2) d = Math.min(d, (TILE - 1 - x) / half);       // E
      if (sides & 4) d = Math.min(d, (TILE - 1 - y) / half);       // S
      if (sides & 8) d = Math.min(d, x / half);                    // W

      const a = (x / TILE) * 6.283;
      const b = (y / TILE) * 6.283;
      const wob =
        0.15 * Math.sin(a * 2 + ph[0]) +
        0.10 * Math.sin(b * 3 + ph[1]) +
        0.07 * Math.sin((a + b) * 5 + ph[2]);
      const t = Math.max(0, Math.min(1, (d + wob) / FADE));
      const alpha = t * t * (3 - 2 * t);
      const i = (y * TILE + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function getEdgeMask(sides: number, variant: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = sides * 16 + (variant % MASK_VARIANTS);
  let m = edgeMasks.get(key);
  if (!m) {
    m = buildEdgeMask(sides, variant % MASK_VARIANTS);
    edgeMasks.set(key, m);
  }
  return m;
}

// ----------------------------------------------------------- rasteriza -----

/** Ordem de "profundidade": um bioma só é desenhado por cima do anterior. */
const LAYER: TerrainKind[] = ['grass', 'detail', 'dirt', 'sand'];

function pickGroup(atlas: TileAtlas, kind: TerrainKind): number[] {
  const g = atlas.groups[kind];
  if (g && g.length) return g;
  // fallback: se o bioma não tem tiles próprios, cai para o mais parecido
  const order: TerrainKind[] =
    kind === 'sand' ? ['sand', 'dirt', 'detail', 'grass']
      : kind === 'dirt' ? ['dirt', 'sand', 'detail', 'grass']
        : kind === 'detail' ? ['detail', 'grass', 'dirt', 'sand']
          : ['grass', 'detail', 'dirt', 'sand'];
  for (const k of order) {
    const alt = atlas.groups[k];
    if (alt && alt.length) return alt;
  }
  return [0];
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  index: number,
  dx: number,
  dy: number,
): void {
  const sx = (index % atlas.cols) * atlas.tile;
  const sy = Math.floor(index / atlas.cols) * atlas.tile;
  ctx.drawImage(atlas.image, sx, sy, atlas.tile, atlas.tile, dx, dy, TILE, TILE);
}

/**
 * Desenha um tile já recortado pela máscara orgânica (usado nas transições).
 * O recorte é feito num canvas temporário por chamada — mas só acontece na
 * construção do chunk (uma vez), nunca por frame.
 */
function drawTileMasked(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  index: number,
  dx: number,
  dy: number,
  sides: number,
  variant: number,
  scratch: HTMLCanvasElement,
): void {
  const sctx = scratch.getContext('2d');
  const mask = getEdgeMask(sides, variant);
  if (!sctx || !mask) {
    drawTile(ctx, atlas, index, dx, dy);
    return;
  }
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, TILE, TILE);
  sctx.globalCompositeOperation = 'source-over';
  const sx = (index % atlas.cols) * atlas.tile;
  const sy = Math.floor(index / atlas.cols) * atlas.tile;
  sctx.drawImage(atlas.image, sx, sy, atlas.tile, atlas.tile, 0, 0, TILE, TILE);
  sctx.globalCompositeOperation = 'destination-in';
  sctx.drawImage(mask, 0, 0);
  sctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(scratch, dx, dy);
}

// --------------------------------------------------------------- cache -----

export class TerrainCache {
  private chunks = new Map<string, HTMLCanvasElement>();
  private scratch: HTMLCanvasElement | null = null;
  private order = 0;
  private lru = new Map<string, number>();
  private readonly maxChunks = 64;

  constructor(
    private atlas: TileAtlas,
    private seed: number,
    private params: TerrainParams = DEFAULT_PARAMS,
  ) {}

  /** Troca o atlas/semente (mudança de mapa) sem recriar o objeto. */
  reset(atlas: TileAtlas, seed: number, params: TerrainParams = DEFAULT_PARAMS): void {
    this.atlas = atlas;
    this.seed = seed;
    this.params = params;
    this.chunks.clear();
    this.lru.clear();
  }

  private build(cx: number, cy: number): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = CHUNK_PX;
    cv.height = CHUNK_PX;
    const ctx = cv.getContext('2d');
    if (!ctx) return cv;
    ctx.imageSmoothingEnabled = false;

    if (!this.scratch) {
      this.scratch = document.createElement('canvas');
      this.scratch.width = TILE;
      this.scratch.height = TILE;
    }

    const t0x = cx * CHUNK;
    const t0y = cy * CHUNK;

    // classifica uma borda a mais de cada lado: o tile vizinho decide se a
    // célula atual é fronteira (e portanto precisa do recorte suave).
    const n = CHUNK + 2;
    const kinds: TerrainKind[] = new Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        kinds[j * n + i] = kindAt(t0x + i - 1, t0y + j - 1, this.seed, this.params);
      }
    }
    const at = (i: number, j: number): TerrainKind => kinds[(j + 1) * n + (i + 1)];
    const rank = (k: TerrainKind): number => LAYER.indexOf(k);

    // camada base: preenche tudo com o bioma "mais raso" da vizinhança,
    // assim nenhuma transição deixa buraco.
    for (let j = 0; j < CHUNK; j++) {
      for (let i = 0; i < CHUNK; i++) {
        let low: TerrainKind = at(i, j);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const k = at(i + dx, j + dy);
            if (rank(k) < rank(low)) low = k;
          }
        }
        const base: TerrainKind = low === 'detail' ? 'grass' : low;
        const g = pickGroup(this.atlas, base);
        const idx = g[variantAt(t0x + i, t0y + j, this.seed, g.length)];
        drawTile(ctx, this.atlas, idx, i * TILE, j * TILE);
      }
    }

    // camadas superiores, em ordem de profundidade
    for (let li = 1; li < LAYER.length; li++) {
      const kind = LAYER[li];
      for (let j = 0; j < CHUNK; j++) {
        for (let i = 0; i < CHUNK; i++) {
          if (at(i, j) !== kind) continue;
          const g = pickGroup(this.atlas, kind);
          const idx = g[variantAt(t0x + i, t0y + j, this.seed, g.length)];
          // De que lados esta célula encosta em terreno mais raso? Só esses
          // desbotam — assim o interior da mancha continua sólido.
          let sides = 0;
          if (rank(at(i, j - 1)) < li) sides |= 1;   // N
          if (rank(at(i + 1, j)) < li) sides |= 2;   // E
          if (rank(at(i, j + 1)) < li) sides |= 4;   // S
          if (rank(at(i - 1, j)) < li) sides |= 8;   // W
          if (sides) {
            const v = Math.floor(hash2(t0x + i, t0y + j, this.seed ^ 0x1b56c4e9) * MASK_VARIANTS);
            drawTileMasked(ctx, this.atlas, idx, i * TILE, j * TILE, sides, v, this.scratch);
          } else {
            drawTile(ctx, this.atlas, idx, i * TILE, j * TILE);
          }
        }
      }
    }
    return cv;
  }

  get(cx: number, cy: number): HTMLCanvasElement {
    const key = `${cx},${cy}`;
    let c = this.chunks.get(key);
    if (!c) {
      c = this.build(cx, cy);
      this.chunks.set(key, c);
      if (this.chunks.size > this.maxChunks) {
        // descarta o chunk usado há mais tempo
        let oldestKey: string | null = null;
        let oldest = Infinity;
        for (const [k, t] of this.lru) {
          if (t < oldest) { oldest = t; oldestKey = k; }
        }
        if (oldestKey) {
          this.chunks.delete(oldestKey);
          this.lru.delete(oldestKey);
        }
      }
    }
    this.lru.set(key, this.order++);
    return c;
  }

  /** Desenha o chão visível. `view` em coordenadas de mundo. */
  drawView(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): void {
    const c0 = Math.floor(left / CHUNK_PX);
    const c1 = Math.floor((right - 1) / CHUNK_PX);
    const r0 = Math.floor(top / CHUNK_PX);
    const r1 = Math.floor((bottom - 1) / CHUNK_PX);
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        ctx.drawImage(this.get(cx, cy), cx * CHUNK_PX, cy * CHUNK_PX);
      }
    }
  }
}
