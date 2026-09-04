/**
 * Render offline do chão procedural — prova visual das transições.
 * Reimplementa a MESMA matemática de src/render/terrain.ts em Node (sem DOM)
 * e escreve um PNG grande, para conferir manchas e faixas de mistura sem
 * precisar abrir o navegador.
 *
 *   node scripts/preview-terrain.mjs campo 1234 out.png
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TILE = 64;

// ---------------------------------------------------------- PNG mínimo -----
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

// ------------------------------------------------------------ PNG read -----
function readPng(file) {
  const buf = fs.readFileSync(file);
  let off = 8, w = 0, h = 0, bitDepth = 8, colorType = 2;
  const idat = [];
  let palette = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} não suportado`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (colorType === 3) {
      const pi = out[i] * 3;
      rgb[i * 3] = palette[pi]; rgb[i * 3 + 1] = palette[pi + 1]; rgb[i * 3 + 2] = palette[pi + 2];
    } else if (colorType === 2) {
      rgb[i * 3] = out[i * 3]; rgb[i * 3 + 1] = out[i * 3 + 1]; rgb[i * 3 + 2] = out[i * 3 + 2];
    } else if (colorType === 6) {
      rgb[i * 3] = out[i * 4]; rgb[i * 3 + 1] = out[i * 4 + 1]; rgb[i * 3 + 2] = out[i * 4 + 2];
    } else {
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = out[i * ch];
    }
  }
  void trns;
  return { w, h, rgb };
}

// ------------------------------------------- mesma matemática do jogo ------
function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
}
function fbm(x, y, seed) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let o = 0; o < 3; o++) {
    s += valueNoise(x * f, y * f, seed + o * 7919) * amp;
    n += amp; amp *= 0.5; f *= 2.07;
  }
  return s / n;
}
function kindAt(tx, ty, seed, p) {
  const n = fbm(tx * p.scale, ty * p.scale, seed);
  if (n > p.sandAt) return 'sand';
  if (n > p.dirtAt) return 'dirt';
  return hash2(tx, ty, seed ^ 0x5bf03635) < p.detail ? 'detail' : 'grass';
}
const variantAt = (tx, ty, seed, count) =>
  count <= 1 ? 0 : Math.floor(hash2(tx, ty, seed ^ 0x27d4eb2d) * count) % count;

// máscara de borda (versão simplificada, mesma forma de onda)
function edgeAlpha(x, y, ph, sides) {
  const half = TILE * 0.5;
  let d = 1;
  if (sides & 1) d = Math.min(d, y / half);
  if (sides & 2) d = Math.min(d, (TILE - 1 - x) / half);
  if (sides & 4) d = Math.min(d, (TILE - 1 - y) / half);
  if (sides & 8) d = Math.min(d, x / half);
  const a = (x / TILE) * 6.283, b = (y / TILE) * 6.283;
  const wob = 0.15 * Math.sin(a * 2 + ph[0]) + 0.10 * Math.sin(b * 3 + ph[1])
    + 0.07 * Math.sin((a + b) * 5 + ph[2]);
  const t = Math.max(0, Math.min(1, (d + wob) / 0.46));
  return t * t * (3 - 2 * t);
}

const PARAMS = {
  campo: { scale: 0.055, dirtAt: 0.62, sandAt: 0.79, blend: 0.085, detail: 0.30 },
  pantano: { scale: 0.050, dirtAt: 0.58, sandAt: 0.99, blend: 0.09, detail: 0.26 },
  deserto: { scale: 0.062, dirtAt: 0.99, sandAt: 0.99, blend: 0.09, detail: 0.22 },
};
const LAYER = ['grass', 'detail', 'dirt', 'sand'];

const mapId = process.argv[2] ?? 'campo';
const seed = Number(process.argv[3] ?? 1234);
const outFile = process.argv[4] ?? `/tmp/terrain_${mapId}.png`;
const COLS = Number(process.argv[5] ?? 20);
const ROWS = Number(process.argv[6] ?? 13);

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/tiles/tiles.json'), 'utf8'));
const m = manifest[mapId];
if (!m) { console.error(`sem atlas para ${mapId}`); process.exit(1); }
const atlas = readPng(path.join(root, `src/assets/tiles/${mapId}.png`));
const p = PARAMS[mapId] ?? PARAMS.campo;

const W = COLS * TILE, H = ROWS * TILE;
const out = Buffer.alloc(W * H * 3);

function groupOf(kind) {
  const g = m[kind];
  if (g && g.length) return g;
  for (const k of ['dirt', 'sand', 'detail', 'grass']) if (m[k]?.length) return m[k];
  return [0];
}
function tilePixel(idx, x, y) {
  const sx = (idx % m.cols) * TILE + x, sy = Math.floor(idx / m.cols) * TILE + y;
  const o = (sy * atlas.w + sx) * 3;
  return [atlas.rgb[o], atlas.rgb[o + 1], atlas.rgb[o + 2]];
}

const kinds = [];
for (let j = -1; j <= ROWS; j++) {
  for (let i = -1; i <= COLS; i++) kinds.push(kindAt(i, j, seed, p));
}
const at = (i, j) => kinds[(j + 1) * (COLS + 2) + (i + 1)];
const rank = (k) => LAYER.indexOf(k);
const counts = { grass: 0, detail: 0, dirt: 0, sand: 0 };
let borders = 0;

for (let j = 0; j < ROWS; j++) {
  for (let i = 0; i < COLS; i++) {
    const k = at(i, j); counts[k]++;
    // base
    let low = k;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const kk = at(i + dx, j + dy); if (rank(kk) < rank(low)) low = kk;
    }
    const base = low === 'detail' ? 'grass' : low;
    const gb = groupOf(base);
    const bi = gb[variantAt(i, j, seed, gb.length)];
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const [r, g, b] = tilePixel(bi, x, y);
      const o = ((j * TILE + y) * W + i * TILE + x) * 3;
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
    // topo
    if (rank(k) >= 1) {
      const gt = groupOf(k);
      const ti = gt[variantAt(i, j, seed, gt.length)];
      let sides = 0;
      if (rank(at(i, j - 1)) < rank(k)) sides |= 1;
      if (rank(at(i + 1, j)) < rank(k)) sides |= 2;
      if (rank(at(i, j + 1)) < rank(k)) sides |= 4;
      if (rank(at(i - 1, j)) < rank(k)) sides |= 8;
      if (sides) borders++;
      const hh = hash2(i, j, seed ^ 0x1b56c4e9);
      const ph = [hh * 6.283, hh * 12.9, hh * 3.7];
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const a = sides ? edgeAlpha(x, y, ph, sides) : 1;
        if (a <= 0) continue;
        const [r, g, b] = tilePixel(ti, x, y);
        const o = ((j * TILE + y) * W + i * TILE + x) * 3;
        out[o] = Math.round(out[o] * (1 - a) + r * a);
        out[o + 1] = Math.round(out[o + 1] * (1 - a) + g * a);
        out[o + 2] = Math.round(out[o + 2] * (1 - a) + b * a);
      }
    }
  }
}
writePng(outFile, W, H, out);
const tot = COLS * ROWS;
console.log(`[${mapId}] seed=${seed} ${W}x${H} -> ${outFile}`);
console.log('  distribuição:', Object.entries(counts)
  .map(([k, v]) => `${k}=${(100 * v / tot).toFixed(1)}%`).join('  '));
console.log(`  tiles de transição (borda suavizada): ${borders} (${(100 * borders / tot).toFixed(1)}%)`);
