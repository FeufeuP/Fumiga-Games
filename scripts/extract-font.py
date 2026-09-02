#!/usr/bin/env python3
"""
Constroi a fonte bitmap do jogo a partir de images/fonte pixelada.jpeg.

A folha de referencia esta desenhada num grid de "pixelao" de 3x3 px reais.
O script recupera esse grid exato (busca de fase com pureza 0.0 -> o corte e
sem perda) e le cada letra na resolucao NATIVA, sem reamostrar -- por isso os
tracos ficam identicos aos da arte.

A folha traz somente A-Z (maiuscula + minuscula). O jogo usa muito numero
(NIVEL 1, XP 0/50) e acento portugues, entao o que falta e desenhado aqui no
mesmo esqueleto (mesma altura de caixa, mesma espessura de traco de 2px):

  · numerais 0-9, pontuacao e simbolos;
  · acentuadas compostas: a marca e desenhada por cima da letra base recortada
    da folha, entao "A" e "A com til" compartilham a mesma arte.

Saida: src/assets/fonts/formigueiro.png  (atlas RGBA)
       src/assets/fonts/formigueiro.json (metrica por glifo)
"""
from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image

SRC_CANDS = ["images/fonte pixelada.jpeg", "/home/user/refs/fonte_pixelada.jpeg"]
OUT_DIR = os.path.join("src", "assets", "fonts")
ATLAS_COLS = 16
INK = (36, 44, 104)          # azul-escuro da referencia

# linhas da folha, na ordem em que aparecem
LINES = ["AaBbCc", "DdEeFfGg", "HhIiJjKk", "LlMmNnOo", "PpQqRrSs", "TtUuVvWw", "XxYyZz"]

CAP_H = 10                   # altura da caixa das maiusculas (nativo)
ACC_H = 4                    # espaco reservado para acento acima
DESC = 2                     # descida (g, p, q, y)
CELL_H = ACC_H + CAP_H + DESC
CELL_W = 14


def find_src() -> str | None:
    for c in SRC_CANDS:
        if os.path.exists(c):
            return c
    return None


def native_grid(path: str) -> np.ndarray:
    """Devolve a folha na resolucao nativa (1 celula = 1 pixel de arte)."""
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    m = int(min(a.shape[:2]) * 0.09)
    core = a[m:a.shape[0] - m, m:a.shape[1] - m]
    lum = core.mean(2)
    ink = lum < (lum.min() + lum.max()) / 2.0

    best = None
    for scale in (3,):
        for ph in range(scale):
            for pv in range(scale):
                h = (ink.shape[0] - pv) // scale * scale
                w = (ink.shape[1] - ph) // scale * scale
                f = ink[pv:pv + h, ph:ph + w].reshape(h // scale, scale, w // scale, scale).mean((1, 3))
                pur = float(np.minimum(f, 1 - f).mean())
                if best is None or pur < best[0]:
                    best = (pur, scale, ph, pv)
    pur, scale, ph, pv = best
    h = (ink.shape[0] - pv) // scale * scale
    w = (ink.shape[1] - ph) // scale * scale
    nat = ink[pv:pv + h, ph:ph + w].reshape(h // scale, scale, w // scale, scale).mean((1, 3)) > 0.5
    print(f"  grid nativo {nat.shape[1]}x{nat.shape[0]} (pixelao={scale}px, pureza={pur:.4f})")
    return nat


def bands(mask: np.ndarray, axis: int, minlen: int) -> list[tuple[int, int]]:
    has = mask.any(1 - axis) if mask.ndim == 2 else mask
    out: list[tuple[int, int]] = []
    st = None
    for i, v in enumerate(has):
        if v and st is None:
            st = i
        elif not v and st is not None:
            if i - st >= minlen:
                out.append((st, i - 1))
            st = None
    if st is not None and len(has) - st >= minlen:
        out.append((st, len(has) - 1))
    return out


def split_blob(sub: np.ndarray, parts: int) -> list[np.ndarray]:
    """Separa um blob que grudou (ex.: 'Ww') no ponto de menor tinta."""
    if parts == 1:
        return [sub]
    colsum = sub.sum(0)
    w = sub.shape[1]
    lo, hi = int(w * 0.35), int(w * 0.65)
    cut = lo + int(np.argmin(colsum[lo:hi]))
    return [sub[:, :cut], sub[:, cut:]]


def read_sheet(path: str) -> dict[str, np.ndarray]:
    nat = native_grid(path)
    rows = bands(nat, 0, 4)
    glyphs: dict[str, np.ndarray] = {}
    for li, (y0, y1) in enumerate(rows):
        if li >= len(LINES):
            break
        want = LINES[li]
        band = nat[y0:y1 + 1]
        blobs = bands(band, 1, 1)
        cells: list[np.ndarray] = []
        for x0, x1 in blobs:
            cells.append(band[:, x0:x1 + 1])
        # se grudou letra, quebra o blob mais largo ate bater a contagem
        while len(cells) < len(want):
            widest = max(range(len(cells)), key=lambda i: cells[i].shape[1])
            a, b = split_blob(cells[widest], 2)
            cells[widest:widest + 1] = [a, b]
        for ch, g in zip(want, cells):
            ys = np.where(g.any(1))[0]
            xs = np.where(g.any(0))[0]
            if len(ys) and len(xs):
                glyphs[ch] = g[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
    return glyphs


# --------------------------------------------- glifos desenhados a mao ------
# traco de 2px, caixa 8x10 -- mesma proporcao das letras da folha
EXTRA: dict[str, list[str]] = {
    "0": ["011110", "111111", "110011", "110011", "110011", "110011", "110011", "110011", "111111", "011110"],
    "1": ["001100", "011100", "111100", "001100", "001100", "001100", "001100", "001100", "111111", "111111"],
    "2": ["011110", "111111", "110011", "000011", "000110", "001100", "011000", "110000", "111111", "111111"],
    "3": ["111111", "111111", "000110", "001100", "001110", "000011", "000011", "110011", "111111", "011110"],
    "4": ["000110", "001110", "011110", "110110", "110110", "111111", "111111", "000110", "000110", "000110"],
    "5": ["111111", "111111", "110000", "111110", "111111", "000011", "000011", "110011", "111111", "011110"],
    "6": ["001110", "011111", "110000", "111110", "111111", "110011", "110011", "110011", "111111", "011110"],
    "7": ["111111", "111111", "000011", "000110", "001100", "001100", "011000", "011000", "011000", "011000"],
    "8": ["011110", "111111", "110011", "111111", "011110", "111111", "110011", "110011", "111111", "011110"],
    "9": ["011110", "111111", "110011", "110011", "111111", "011111", "000011", "000011", "111110", "011100"],
    ".": ["000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "011000", "011000"],
    ",": ["000000", "000000", "000000", "000000", "000000", "000000", "000000", "011000", "011000", "110000"],
    ":": ["000000", "000000", "011000", "011000", "000000", "000000", "011000", "011000", "000000", "000000"],
    ";": ["000000", "000000", "011000", "011000", "000000", "000000", "011000", "011000", "110000", "000000"],
    "!": ["011000", "011000", "011000", "011000", "011000", "011000", "000000", "000000", "011000", "011000"],
    "?": ["011110", "111111", "110011", "000110", "001100", "001100", "000000", "000000", "001100", "001100"],
    "-": ["000000", "000000", "000000", "000000", "111111", "111111", "000000", "000000", "000000", "000000"],
    "+": ["000000", "000000", "001100", "001100", "111111", "111111", "001100", "001100", "000000", "000000"],
    "=": ["000000", "000000", "111111", "111111", "000000", "000000", "111111", "111111", "000000", "000000"],
    "/": ["000011", "000011", "000110", "001100", "001100", "011000", "011000", "110000", "110000", "000000"],
    "\\": ["110000", "110000", "011000", "011000", "001100", "001100", "000110", "000011", "000011", "000000"],
    "%": ["110011", "110110", "000110", "001100", "001100", "011000", "011000", "110011", "110011", "000000"],
    "(": ["001100", "011000", "110000", "110000", "110000", "110000", "110000", "110000", "011000", "001100"],
    ")": ["110000", "011000", "001100", "001100", "001100", "001100", "001100", "001100", "011000", "110000"],
    "[": ["111100", "111100", "110000", "110000", "110000", "110000", "110000", "110000", "111100", "111100"],
    "]": ["111100", "111100", "001100", "001100", "001100", "001100", "001100", "001100", "111100", "111100"],
    "'": ["011000", "011000", "011000", "000000", "000000", "000000", "000000", "000000", "000000", "000000"],
    '"': ["110110", "110110", "110110", "000000", "000000", "000000", "000000", "000000", "000000", "000000"],
    "*": ["000000", "110011", "011110", "111111", "011110", "110011", "000000", "000000", "000000", "000000"],
    "#": ["011011", "111111", "011011", "011011", "111111", "011011", "000000", "000000", "000000", "000000"],
    "<": ["000011", "000110", "001100", "011000", "110000", "011000", "001100", "000110", "000011", "000000"],
    ">": ["110000", "011000", "001100", "000110", "000011", "000110", "001100", "011000", "110000", "000000"],
    "_": ["000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "111111", "111111"],
    "|": ["011000", "011000", "011000", "011000", "011000", "011000", "011000", "011000", "011000", "011000"],
    "@": ["011110", "111111", "110011", "110111", "110111", "110110", "110000", "110000", "111111", "011110"],
    "&": ["011100", "110110", "110110", "011100", "111011", "110111", "110011", "110111", "111111", "011101"],
    "$": ["001100", "011110", "111111", "110000", "111110", "011111", "000011", "111111", "111110", "001100"],
    "^": ["001100", "011110", "110011", "000000", "000000", "000000", "000000", "000000", "000000", "000000"],
    "~": ["000000", "000000", "011001", "111111", "100110", "000000", "000000", "000000", "000000", "000000"],
    "\u00b0": ["011110", "110011", "110011", "011110", "000000", "000000", "000000", "000000", "000000", "000000"],
    "\u00ba": ["011110", "110011", "011110", "000000", "000000", "000000", "000000", "000000", "000000", "000000"],
    "\u00aa": ["011110", "000110", "011111", "110111", "011111", "000000", "000000", "000000", "000000", "000000"],
}

MARKS: dict[str, list[str]] = {
    "acute": ["000110", "001100", "011000"],
    "grave": ["011000", "001100", "000110"],
    "circ":  ["001100", "011110", "110011"],
    "tilde": ["011001", "111111", "100110"],
    "uml":   ["011011", "011011", "000000"],
}

ACCENTED: dict[str, tuple[str, str]] = {}
for _base, _mark, _chars in [
    ("A", "acute", "\u00c1\u00e1"), ("A", "circ", "\u00c2\u00e2"),
    ("A", "tilde", "\u00c3\u00e3"), ("A", "grave", "\u00c0\u00e0"),
    ("E", "acute", "\u00c9\u00e9"), ("E", "circ", "\u00ca\u00ea"),
    ("I", "acute", "\u00cd\u00ed"), ("O", "acute", "\u00d3\u00f3"),
    ("O", "circ", "\u00d4\u00f4"), ("O", "tilde", "\u00d5\u00f5"),
    ("U", "acute", "\u00da\u00fa"), ("U", "uml", "\u00fc\u00dc"),
]:
    for _ch in _chars:
        ACCENTED[_ch] = (_base if _ch.isupper() else _base.lower(), _mark)


def from_rows(rows: list[str]) -> np.ndarray:
    w = max(len(r) for r in rows)
    return np.array([[c == "1" for c in r.ljust(w, "0")] for r in rows], bool)


DESCENDERS = set("gpqyj")


def main() -> int:
    src = find_src()
    if not src:
        print("fonte de referencia nao encontrada")
        return 1
    print(f"[fonte] {src}")
    sheet = read_sheet(src)
    print(f"  glifos lidos da folha: {len(sheet)}/52")
    missing = [c for c in "".join(LINES) if c not in sheet]
    if missing:
        print(f"  !! faltando: {''.join(missing)}")

    glyphs: dict[str, np.ndarray] = dict(sheet)
    for ch, rows in EXTRA.items():
        glyphs[ch] = from_rows(rows)

    for ch, (base, mark) in ACCENTED.items():
        if base not in glyphs:
            continue
        b = glyphs[base]
        mk = from_rows(MARKS[mark])
        w = max(b.shape[1], mk.shape[1])
        g = np.zeros((mk.shape[0] + 1 + b.shape[0], w), bool)
        off = (w - mk.shape[1]) // 2
        g[0:mk.shape[0], off:off + mk.shape[1]] = mk
        g[mk.shape[0] + 1:, 0:b.shape[1]] = b
        glyphs[ch] = g

    for ch, base in (("\u00c7", "C"), ("\u00e7", "c")):
        if base in glyphs:
            b = glyphs[base]
            g = np.zeros((b.shape[0] + 3, b.shape[1]), bool)
            g[:b.shape[0]] = b
            cx = b.shape[1] // 2
            g[b.shape[0]:b.shape[0] + 2, cx:cx + 2] = True
            g[b.shape[0] + 2, cx - 1:cx + 1] = True
            glyphs[ch] = g

    glyphs[" "] = np.zeros((CAP_H, 4), bool)

    order = sorted(glyphs.keys())
    rows_n = (len(order) + ATLAS_COLS - 1) // ATLAS_COLS
    atlas = Image.new("RGBA", (ATLAS_COLS * CELL_W, rows_n * CELL_H), (0, 0, 0, 0))
    px = atlas.load()
    meta: dict[str, dict] = {}

    for i, ch in enumerate(order):
        gx, gy = (i % ATLAS_COLS) * CELL_W, (i // ATLAS_COLS) * CELL_H
        g = glyphs[ch]
        gh, gw = g.shape
        # alinha pela BASELINE: fundo da caixa das maiusculas
        base_y = ACC_H + CAP_H
        if ch in DESCENDERS or (ch in ACCENTED and ACCENTED[ch][0] in DESCENDERS):
            oy = base_y + DESC - gh
        elif ch in ACCENTED or ch in ("\u00c7", "\u00e7"):
            oy = base_y - gh + (DESC if ch in ("\u00c7", "\u00e7") else 0)
        else:
            oy = base_y - gh
        oy = max(0, min(oy, CELL_H - gh))
        for y in range(min(gh, CELL_H - oy)):
            for x in range(min(gw, CELL_W)):
                if g[y, x]:
                    px[gx + x, gy + oy + y] = (*INK, 255)
        meta[ch] = {"x": gx, "y": gy, "w": min(gw, CELL_W), "h": CELL_H, "adv": min(gw, CELL_W) + 1}

    os.makedirs(OUT_DIR, exist_ok=True)
    out_png = os.path.join(OUT_DIR, "formigueiro.png")
    atlas.save(out_png)
    with open(os.path.join(OUT_DIR, "formigueiro.json"), "w", encoding="utf-8") as fh:
        json.dump({"cell": [CELL_W, CELL_H], "ascent": ACC_H + CAP_H, "descent": DESC,
                   "glyphs": meta}, fh, ensure_ascii=False, indent=1, sort_keys=True)
        fh.write("\n")
    print(f"  -> {out_png}  {atlas.size[0]}x{atlas.size[1]}  {len(order)} glifos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
