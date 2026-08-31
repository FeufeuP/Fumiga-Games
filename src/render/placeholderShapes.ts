/**
 * Placeholders geométricos (Parte 12.4 — silhuetas por função, cores da Parte 11.5).
 * Tudo em fillRect de coordenadas inteiras: contorno escuro, sem anti-aliasing,
 * leitura imediata de classe. Estes drawers são a "arte provisória oficial".
 */
import { PALETTE, PROP_COLORS } from '../core/constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AntColors {
  body: string;
  dark: string;
  accent: string;
}

export const ANT_PLACEHOLDER_COLORS: Record<string, AntColors> = {
  worker: { body: PALETTE.LARANJA, dark: '#8f3c12', accent: '#e8b06a' },
  collector: { body: PALETTE.LARANJA, dark: '#8f3c12', accent: PALETTE.VERDE },
  scout: { body: '#5fae52', dark: '#39703a', accent: '#a4e59a' },
  soldier: { body: '#c0392b', dark: '#6e1d16', accent: '#e8695a' },
  defender: { body: '#7c3b52', dark: '#4a2131', accent: '#c9a86a' },
  toxic: { body: '#7ec850', dark: '#4a7a2a', accent: '#d6f59a' },
  giant: { body: '#5a3a28', dark: '#33200f', accent: '#8a6a4a' },
  queen: { body: '#9c6b28', dark: '#5a3a12', accent: PALETTE.DOURADO },
};

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/**
 * Formiga placeholder: cabeça/tórax/abdômen com massas separadas,
 * pernas com espaços, antenas com curva (Parte 11.2).
 */
export function drawAntPlaceholder(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    dir: 1 | -1;
    size: number; // largura total do corpo em px
    colors: AntColors;
    walkPhase: number;
    carrying?: boolean;
    highlight?: boolean;
  },
): void {
  const { x, y, dir, size, colors, walkPhase } = opts;
  const s = size / 32; // escala relativa ao contrato de 32px
  const d = dir;
  const legSwing = Math.sin(walkPhase) * 2 * s;

  // sombra dura
  ctx.fillStyle = 'rgba(20, 18, 15, 0.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y + 9 * s), 10 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // pernas (3 por lado, alternando com a caminhada)
  for (let i = 0; i < 3; i++) {
    const lx = x + d * (-4 + i * 4) * s;
    const sw = (i % 2 === 0 ? legSwing : -legSwing);
    px(ctx, lx - 1 * s, y + 4 * s, 2 * s, 5 * s + sw, colors.dark);
    px(ctx, lx + d * 2 * s - 1 * s, y + 8 * s + sw, 2 * s, 3 * s, colors.dark);
  }

  // abdômen (traseira)
  const abW = 12 * s;
  const abH = 9 * s;
  px(ctx, x - d * 9 * s - abW / 2, y - 5 * s, abW, abH, colors.dark);
  px(ctx, x - d * 9 * s - abW / 2 + 1 * s, y - 5 * s + 1 * s, abW - 2 * s, abH - 3 * s, colors.body);
  // brilho superior (luz 15-25% mais claro — Parte 11.4)
  px(ctx, x - d * 9 * s - abW / 2 + 2 * s, y - 5 * s + 1 * s, abW - 6 * s, 2 * s, colors.accent);

  // tórax
  px(ctx, x - 4 * s, y - 4 * s, 8 * s, 7 * s, colors.dark);
  px(ctx, x - 4 * s + 1 * s, y - 4 * s + 1 * s, 8 * s - 2 * s, 7 * s - 3 * s, colors.body);

  // cabeça (ligeiramente maior — Parte 11.3)
  const hW = 9 * s;
  const hH = 8 * s;
  px(ctx, x + d * 7 * s - hW / 2, y - 5 * s, hW, hH, colors.dark);
  px(ctx, x + d * 7 * s - hW / 2 + 1 * s, y - 5 * s + 1 * s, hW - 2 * s, hH - 3 * s, colors.body);
  // olho
  px(ctx, x + d * 9 * s, y - 3 * s, 2 * s, 2 * s, PALETTE.CONTORNO);
  // mandíbula
  px(ctx, x + d * 11 * s, y + 0 * s, 2 * s, 2 * s, colors.accent);

  // antenas com curva clara
  const antWob = Math.sin(walkPhase * 0.7) * 1.5 * s;
  px(ctx, x + d * 8 * s, y - 8 * s, 1.5 * s, 3 * s, colors.dark);
  px(ctx, x + d * 10 * s + antWob, y - 11 * s, 1.5 * s, 3 * s, colors.dark);

  // carga (coletora carregando)
  if (opts.carrying) {
    px(ctx, x - 2 * s, y - 14 * s, 6 * s, 5 * s, PALETTE.VERDE);
    px(ctx, x - 2 * s, y - 14 * s, 6 * s, 1.5 * s, '#7ed06f');
  }

  // seleção
  if (opts.highlight) {
    ctx.strokeStyle = PALETTE.DOURADO;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x - 13 * s), Math.round(y - 15 * s), Math.round(26 * s), Math.round(24 * s));
  }
}

/** Rainha — só no menu/interior (ela nunca sai — Parte 4.6). */
export function drawQueenPlaceholder(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; y: number; size: number },
): void {
  const { x, y, size } = opts;
  const s = size / 96;
  const c = ANT_PLACEHOLDER_COLORS.queen as AntColors;

  ctx.fillStyle = 'rgba(20, 18, 15, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 26 * s, 30 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // abdômen amplo
  px(ctx, x - 26 * s, y - 6 * s, 34 * s, 30 * s, c.dark);
  px(ctx, x - 24 * s, y - 4 * s, 30 * s, 26 * s, c.body);
  px(ctx, x - 20 * s, y - 4 * s, 18 * s, 5 * s, c.accent);
  // listras de abdômen
  px(ctx, x - 12 * s, y - 2 * s, 3 * s, 22 * s, c.dark);
  px(ctx, x - 2 * s, y - 2 * s, 3 * s, 22 * s, c.dark);

  // tórax + cabeça
  px(ctx, x + 6 * s, y - 8 * s, 14 * s, 18 * s, c.dark);
  px(ctx, x + 8 * s, y - 6 * s, 10 * s, 14 * s, c.body);
  px(ctx, x + 18 * s, y - 12 * s, 14 * s, 14 * s, c.dark);
  px(ctx, x + 20 * s, y - 10 * s, 10 * s, 10 * s, c.body);
  px(ctx, x + 27 * s, y - 7 * s, 3 * s, 3 * s, PALETTE.CONTORNO);

  // coroa dourada
  px(ctx, x + 18 * s, y - 18 * s, 14 * s, 4 * s, PALETTE.DOURADO);
  px(ctx, x + 19 * s, y - 22 * s, 3 * s, 4 * s, PALETTE.DOURADO);
  px(ctx, x + 24 * s, y - 23 * s, 3 * s, 5 * s, PALETTE.DOURADO);
  px(ctx, x + 28 * s, y - 22 * s, 3 * s, 4 * s, PALETTE.DOURADO);

  // antenas
  px(ctx, x + 22 * s, y - 24 * s, 2 * s, 5 * s, c.dark);
  px(ctx, x + 27 * s, y - 26 * s, 2 * s, 5 * s, c.dark);
}

/** Monte de terra do ninho com entrada escura — clicável (decisão de cenário). */
export function drawNestMound(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; y: number; r: number },
): void {
  const { x, y, r } = opts;

  // sombra no chão
  ctx.fillStyle = 'rgba(20, 18, 15, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.42, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // monte (elipse achatada em camadas de terra)
  const layers: Array<[number, number, string]> = [
    [1.0, 0.72, PALETTE.TERRA_MEDIA],
    [0.82, 0.60, PALETTE.TERRA_CLARA],
    [0.6, 0.45, PALETTE.TERRA_MEDIA],
  ];
  for (const [sw, sh, color] of layers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, r * sw, r * sh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // contorno
  ctx.strokeStyle = PALETTE.CONTORNO;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();

  // entrada escura (buraco)
  ctx.fillStyle = PALETTE.TERRA_ESCURA;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.28, r * 0.26, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.CONTORNO;
  ctx.lineWidth = 2;
  ctx.stroke();

  // granulado de terra
  ctx.fillStyle = PALETTE.TERRA_ESCURA;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.fillRect(
      Math.round(x + Math.cos(a) * r * 0.55),
      Math.round(y + Math.sin(a) * r * 0.34),
      3,
      3,
    );
  }
}

/** Props do gramado — silhuetas simples por função. */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  s: number,
): void {
  switch (kind) {
    case 'tree': {
      // tronco
      px(ctx, x - 3 * s, y - 10 * s, 6 * s, 22 * s, PROP_COLORS.TREE_TRUNK);
      // copa em duas massas
      ctx.fillStyle = PROP_COLORS.TREE_CANOPY;
      ctx.beginPath();
      ctx.ellipse(x, y - 22 * s, 16 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PROP_COLORS.TREE_CANOPY2;
      ctx.beginPath();
      ctx.ellipse(x - 5 * s, y - 26 * s, 9 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bush': {
      ctx.fillStyle = PROP_COLORS.BUSH;
      ctx.beginPath();
      ctx.ellipse(x, y - 5 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PROP_COLORS.TREE_CANOPY2;
      ctx.beginPath();
      ctx.ellipse(x - 3 * s, y - 8 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'stone': {
      ctx.fillStyle = PROP_COLORS.STONE_DARK;
      ctx.beginPath();
      ctx.ellipse(x, y - 2 * s, 7 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PROP_COLORS.STONE;
      ctx.beginPath();
      ctx.ellipse(x - 1 * s, y - 4 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rock': {
      ctx.fillStyle = PROP_COLORS.ROCK;
      ctx.beginPath();
      ctx.ellipse(x, y - 5 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PROP_COLORS.STONE;
      ctx.beginPath();
      ctx.ellipse(x - 4 * s, y - 8 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.CONTORNO;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - 5 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'twig': {
      ctx.strokeStyle = PROP_COLORS.TWIG;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x - 9 * s, y + 3 * s);
      ctx.lineTo(x + 9 * s, y - 3 * s);
      ctx.stroke();
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x + 2 * s, y - 1 * s);
      ctx.lineTo(x + 7 * s, y - 6 * s);
      ctx.stroke();
      break;
    }
    case 'leafpile': {
      px(ctx, x - 8 * s, y - 2 * s, 6 * s, 4 * s, PROP_COLORS.LEAFPILE);
      px(ctx, x - 1 * s, y - 4 * s, 6 * s, 4 * s, '#7a9a3e');
      px(ctx, x + 5 * s, y - 1 * s, 5 * s, 4 * s, PROP_COLORS.LEAFPILE);
      break;
    }
    case 'clover':
    default: {
      ctx.fillStyle = '#3e8f3e';
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 2.5 * s, y + Math.sin(a) * 2.5 * s, 3 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

/** Cores de recurso por tipo (placeholder até a arte oficial). */
export const RESOURCE_COLORS: Record<string, { a: string; b: string }> = {
  leaf: { a: '#55b84b', b: '#3e8f3e' },
  mushroom: { a: '#d94a3b', b: '#f5e6c8' },
  cactus: { a: '#3e8f3e', b: '#549140' },
  banana: { a: '#fbd046', b: '#c9a12e' },
  flower: { a: '#b67ad9', b: '#fbd046' },
  crystal: { a: '#63b5dc', b: '#a4d8f0' },
};

/** Recurso no chão — silhueta por tipo, ~24-32px (Parte 12.8). */
export function drawResource(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  size: number,
): void {
  const c = RESOURCE_COLORS[kind] ?? RESOURCE_COLORS.leaf;
  const s = size / 24;
  ctx.fillStyle = 'rgba(20, 18, 15, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8 * s, 8 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (kind) {
    case 'leaf': {
      px(ctx, x - 8 * s, y - 4 * s, 10 * s, 8 * s, c.b);
      px(ctx, x - 7 * s, y - 3 * s, 9 * s, 5 * s, c.a);
      px(ctx, x + 2 * s, y - 6 * s, 4 * s, 10 * s, c.b);
      px(ctx, x + 3 * s, y - 5 * s, 3 * s, 8 * s, c.a);
      px(ctx, x + 5 * s, y + 3 * s, 2 * s, 3 * s, '#7a5a33');
      break;
    }
    case 'mushroom': {
      px(ctx, x - 2 * s, y - 1 * s, 5 * s, 8 * s, c.b);
      px(ctx, x - 8 * s, y - 7 * s, 16 * s, 7 * s, c.a);
      px(ctx, x - 5 * s, y - 10 * s, 10 * s, 4 * s, c.a);
      px(ctx, x - 4 * s, y - 6 * s, 2 * s, 2 * s, c.b);
      px(ctx, x + 1 * s, y - 8 * s, 2 * s, 2 * s, c.b);
      break;
    }
    case 'cactus': {
      px(ctx, x - 3 * s, y - 10 * s, 6 * s, 16 * s, c.a);
      px(ctx, x - 8 * s, y - 4 * s, 5 * s, 4 * s, c.a);
      px(ctx, x - 8 * s, y - 8 * s, 4 * s, 5 * s, c.a);
      px(ctx, x + 3 * s, y - 2 * s, 5 * s, 4 * s, c.a);
      px(ctx, x - 1 * s, y - 9 * s, 2 * s, 13 * s, c.b);
      break;
    }
    case 'banana': {
      ctx.strokeStyle = c.a;
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.arc(x, y - 2 * s, 8 * s, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = c.b;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(x, y - 2 * s, 9.5 * s, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.fillStyle = c.a;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s, 4 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = c.b;
      ctx.beginPath();
      ctx.ellipse(x, y, 3.5 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crystal': {
      ctx.fillStyle = c.b;
      ctx.beginPath();
      ctx.moveTo(x, y - 11 * s);
      ctx.lineTo(x + 6 * s, y);
      ctx.lineTo(x, y + 9 * s);
      ctx.lineTo(x - 6 * s, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c.a;
      ctx.beginPath();
      ctx.moveTo(x, y - 11 * s);
      ctx.lineTo(x + 6 * s, y);
      ctx.lineTo(x, y + 9 * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      px(ctx, x - 6 * s, y - 6 * s, 12 * s, 12 * s, c.a);
  }
}
