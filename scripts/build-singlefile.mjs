/**
 * Build do executável único `Formigueiro-Jogo-Completo.html` (doc 09, critério 4).
 *
 * Pós-processa `dist/` (gerado por `vite build`) num único arquivo HTML:
 *  1. Inlina o JS (<script type="module">) e o CSS (<style>);
 *  2. Substitui toda referência a assets (./assets/NAME.ext) por data URI base64
 *     — sprites, menu_background.jpg, favicon etc.;
 *  3. Remove atributos `crossorigin` (sem sentido em arquivo inline/file://).
 *
 * Uso: `npm run build && node scripts/build-singlefile.mjs`
 * Saída: `Formigueiro-Jogo-Completo.html` na raiz (abre com 2 cliques, offline).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const OUT = 'Formigueiro-Jogo-Completo.html';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// data URIs de todos os assets binários
const dataUris = new Map();
for (const f of readdirSync(join(DIST, 'assets'))) {
  const mime = MIME[extname(f).toLowerCase()];
  if (!mime) continue;
  const b64 = readFileSync(join(DIST, 'assets', f)).toString('base64');
  dataUris.set(f, `data:${mime};base64,${b64}`);
}

// 1) inlina JS
html = html.replace(
  /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
  (_m, src) => {
    const file = src.replace(/^\.?\//, '').split('/').pop();
    const code = readFileSync(join(DIST, 'assets', file), 'utf8');
    return `<script type="module">\n${code}\n</script>`;
  },
);

// 2) inlina CSS
html = html.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_m, href) => {
    const file = href.replace(/^\.?\//, '').split('/').pop();
    const code = readFileSync(join(DIST, 'assets', file), 'utf8');
    return `<style>\n${code}\n</style>`;
  },
);

// 3) substitui referências a assets por data URI.
//    O vite emite sprites como `new URL("nome-HASH.png", import.meta.url).href`
//    (import.meta.glob com query '?url') — cobrimos os 3 formatos possíveis.
let refs = 0;
for (const [file, uri] of dataUris) {
  const forms = [
    // vite/rollup emite SEM espaço após a vírgula
    [`new URL("${file}",import.meta.url).href`, JSON.stringify(uri)],
    [`new URL("${file}", import.meta.url).href`, JSON.stringify(uri)],
    [`"./assets/${file}"`, JSON.stringify(uri)],
    [`"assets/${file}"`, JSON.stringify(uri)],
    [`./assets/${file}`, uri],
    [`assets/${file}`, uri],
  ];
  for (const [from, to] of forms) {
    while (html.includes(from)) {
      html = html.replace(from, to);
      refs++;
    }
  }
}

// 4) favicon relativo, se sobrou
html = html.replace(/<link rel="icon"[^>]*href="[^"]*"[^>]*>/g, '');
html = html.replaceAll(' crossorigin=""', '').replaceAll(' crossorigin', '');

if (/(src|href)="\.?\/?assets\//.test(html)) {
  throw new Error("Ainda há referências externas a assets — build único incompleto!");
}

writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(2);
console.log(`✓ ${OUT} gerado (${kb} kB) — ${refs} referências a assets embutidas, 100% offline.`);
