#!/usr/bin/env python3
"""
Extrai os tilesets de chao das imagens de referencia (images/*.jpeg) para
atlas PNG limpos, prontos para a geracao procedural do terreno.

  entrada : images/chao <bioma>.jpeg   (arte de referencia, JPEG com ruido)
  saida   : src/assets/tiles/<bioma>.png + src/assets/tiles/tiles.json

Cada tile do atlas:
  - tem TILE x TILE px (reamostrado com BOX, o que ja remove ruido de JPEG);
  - e TILEAVEL: as bordas opostas sao fundidas (wrap-blend), entao repetir o
    mesmo tile nao cria costura visivel;
  - e classificado em grass | detail | dirt | sand.

Tiles de preenchimento (dirt/sand) sao recortados do MIOLO dos tiles mais
"sujos" da folha, porque na arte original a terra aparece como uma mancha no
centro cercada de grama -- usar o tile inteiro criaria aneis verdes.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

TILE = 64          # resolucao final de cada tile, em px
FEATHER = 7        # largura da fusao de borda (wrap-blend)
OUT_DIR = os.path.join("src", "assets", "tiles")
ATLAS_COLS = 8

SOURCES = [
    ("campo", ["images/ch\u00e3o campo.jpeg", "/home/user/refs/chao_campo.jpeg"]),
    ("pantano", ["images/ch\u00e3o pantano.jpeg", "/home/user/refs/chao_pantano.jpeg"]),
    ("deserto", ["images/ch\u00e3o deserto.jpeg", "/home/user/refs/chao_deserto.jpeg"]),
]


def find_src(cands: list[str]) -> str | None:
    for c in cands:
        if os.path.exists(c):
            return c
    return None


# ---------------------------------------------------------------- grade -----
def runs(score: np.ndarray, thr: float) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    start = None
    for i, v in enumerate(score):
        if v >= thr and start is None:
            start = i
        elif v < thr and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(score) - 1))
    return out


def detect_grid(img: Image.Image) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """Acha as faixas pretas separadoras e devolve os intervalos de cada celula."""
    a = np.array(img.convert("RGB")).astype(int)
    dark = a.sum(2) < 90
    gaps_c = runs(dark.mean(0), 0.75)
    gaps_r = runs(dark.mean(1), 0.75)

    def cells(gaps: list[tuple[int, int]], size: int) -> list[tuple[int, int]]:
        out: list[tuple[int, int]] = []
        for i in range(len(gaps) - 1):
            a0 = gaps[i][1] + 1
            a1 = gaps[i + 1][0] - 1
            if a1 - a0 >= size * 0.25:
                out.append((a0, a1))
        return out

    h, w = dark.shape
    return cells(gaps_c, w / ATLAS_COLS), cells(gaps_r, h / 6)


# ------------------------------------------------------------ tratamento ----
def wrap_seamless(a: np.ndarray, feather: int = FEATHER) -> np.ndarray:
    """Funde bordas opostas para o tile repetir sem costura."""
    a = a.astype(np.float64).copy()
    n = a.shape[0]
    for i in range(feather):
        w = 0.5 * (1.0 - i / feather)
        left, right = a[:, i].copy(), a[:, n - 1 - i].copy()
        a[:, i] = left * (1 - w) + right * w
        a[:, n - 1 - i] = right * (1 - w) + left * w
    for i in range(feather):
        w = 0.5 * (1.0 - i / feather)
        top, bot = a[i, :].copy(), a[n - 1 - i, :].copy()
        a[i, :] = top * (1 - w) + bot * w
        a[n - 1 - i, :] = bot * (1 - w) + top * w
    return a


def devignette(a: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """
    Achata o escurecimento periferico. Sem isso, repetir o tile desenha uma
    grade escura regular no chao (o olho enxerga o padrao na hora).
    """
    n = a.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy)).astype(float)
    lum = a.mean(2)
    prof = np.array([lum[d == k].mean() if (d == k).any() else 0.0 for k in range(n // 2)])
    if len(prof) < 6:
        return a
    # alvo = brilho do miolo; corrige TODAS as faixas radiais, nao so a borda,
    # senao sobra um degrade suave que ainda desenha a grade quando repete.
    target = float(np.median(prof[len(prof) // 3:]))
    gain = np.ones_like(prof)
    for k in range(len(prof)):
        if prof[k] > 1:
            gain[k] = 1.0 + strength * (target / prof[k] - 1.0)
    gain = np.clip(gain, 0.80, 1.60)
    # suaviza o ganho para nao criar anel duro
    ker = np.array([0.25, 0.5, 0.25])
    gain = np.convolve(np.pad(gain, 1, mode="edge"), ker, mode="same")[1:-1]
    gmap = np.ones((n, n))
    for k in range(len(prof)):
        gmap[d == k] = gain[k]
    return np.clip(a * gmap[..., None], 0, 255)


def flatten_lowfreq(a: np.ndarray, keep: float = 0.55) -> np.ndarray:
    """
    Remove o gradiente suave que sobra depois do devignette.
    Estima a iluminacao por um borrao forte (box blur separavel) e divide.
    So mexe na baixa frequencia -- o detalhe de pixel art e preservado.
    """
    lum = a.mean(2)
    n = lum.shape[0]
    k = max(3, n // 4)
    pad = np.pad(lum, k, mode="reflect")
    cs = pad.cumsum(0).cumsum(1)
    cs = np.pad(cs, ((1, 0), (1, 0)))
    size = 2 * k + 1
    ys = np.arange(n) + k
    xs = np.arange(n) + k
    y0, y1 = ys - k, ys + k + 1
    x0, x1 = xs - k, xs + k + 1
    blur = (cs[np.ix_(y1, x1)] - cs[np.ix_(y0, x1)]
            - cs[np.ix_(y1, x0)] + cs[np.ix_(y0, x0)]) / (size * size)
    target = float(np.median(blur))
    gain = np.clip(target / np.maximum(blur, 1.0), 0.85, 1.18)
    gain = 1.0 + keep * (gain - 1.0)
    return np.clip(a * gain[..., None], 0, 255)


def ring_score(a: np.ndarray) -> float:
    """
    Mede quanto o tile ainda tem cara de "quadro com moldura": desvio maximo
    do perfil radial de luminancia em relacao a mediana. Tile limpo ~0-2;
    tile com moldura passa de 4.
    """
    n = a.shape[0]
    lum = a.mean(2)
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy))
    prof = np.array([lum[d == k].mean() for k in range(n // 2)])
    return float(np.abs(prof - np.median(prof)).max())


def frac(a: np.ndarray) -> dict[str, float]:
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    green = (g > r + 12) & (g > b + 12)
    dirt = (r > g - 6) & (g > b + 8) & (r > 70) & (r < 215) & (~green)
    sand = (r > 150) & (g > 140) & (b < 170) & (r >= g) & (g > b + 18) & (~green)
    rock = (sat < 0.18) & (mx > 70) & (mx < 190)
    white = (mx > 205) & (sat < 0.30)
    return {
        "green": float(green.mean()), "dirt": float(dirt.mean()),
        "sand": float(sand.mean()), "rock": float(rock.mean()),
        "white": float(white.mean()),
        # eixo verde-vermelho e brilho: base da classificacao relativa
        "gr": float((g - r).mean()), "lum": float(a.mean()),
    }


def classify_relative(vals: list[dict[str, float]]) -> list[str]:
    """
    Separa os tiles de uma folha em BASE e MANCHA, agrupando pela cor.

    Cada bioma tem paleta propria: no Campo a base e verde viva e a mancha e
    terra; no Pantano a base e musgo escuro e a mancha e lama; no Deserto e
    tudo areia e nao existe mancha. Um limiar fixo de cor classificava metade
    do pantano como grama e metade como terra -- o chao saia num xadrez.

    Criterio: procura o MAIOR VAO no eixo verde-vermelho (G-R) ordenado.
    Se houver um vao claro (bimodal), ele separa base de mancha; se a folha for
    de cor uniforme (Deserto), nao ha corte e tudo vira base.
    """
    gr = np.array([v["gr"] for v in vals], dtype=float)
    lum = np.array([v["lum"] for v in vals], dtype=float)
    n = len(gr)

    order = np.argsort(gr)
    sorted_gr = gr[order]
    span = float(sorted_gr[-1] - sorted_gr[0])

    # maior vao entre valores consecutivos, ignorando as pontas (outliers)
    cut = None
    if n >= 8 and span > 8.0:
        lo_i, hi_i = max(1, int(n * 0.10)), min(n - 2, int(n * 0.90))
        gaps = [(sorted_gr[i + 1] - sorted_gr[i], i) for i in range(lo_i, hi_i)]
        if gaps:
            gap, gi = max(gaps)
            # so aceita se o vao for grande perto da dispersao total
            if gap > 0.25 * span:
                cut = (sorted_gr[gi] + sorted_gr[gi + 1]) / 2.0

    out: list[str] = []
    base_mask = gr >= cut if cut is not None else np.ones(n, dtype=bool)
    base_lum = float(np.median(lum[base_mask])) if base_mask.any() else float(np.median(lum))

    for i in range(n):
        if cut is not None and gr[i] < cut:
            out.append("sand" if lum[i] > base_lum + 12 else "dirt")
        else:
            v = vals[i]
            busy = v["white"] >= 0.005 or v["rock"] >= 0.004
            out.append("detail" if busy else "grass")

    # a base precisa de variedade: promove tiles "ocupados" a detail se faltar
    if out.count("detail") < 4:
        cand = [i for i in range(n) if out[i] == "grass"]
        cand.sort(key=lambda i: -(vals[i]["white"] + vals[i]["rock"]))
        for i in cand[:6]:
            out[i] = "detail"
    return out


def build(name: str, path: str) -> dict | None:
    img = Image.open(path).convert("RGB")
    cols, rows = detect_grid(img)
    if len(cols) < 4 or len(rows) < 3:
        print(f"  !! grade nao detectada em {path} ({len(cols)}x{len(rows)})")
        return None
    rows = rows[:5]
    print(f"  grade: {len(cols)} col x {len(rows)} lin")

    kinds: dict[str, list[np.ndarray]] = {"grass": [], "detail": [], "dirt": [], "sand": []}
    scored: dict[str, list[tuple[float, np.ndarray]]] = {k: [] for k in kinds}
    heavy: list[tuple[float, tuple[int, int, int, int]]] = []
    sandy: list[tuple[float, tuple[int, int, int, int]]] = []

    # -- passo 1: mede todas as celulas (a classificacao e relativa a folha) --
    cells_raw: list[tuple[Image.Image, dict[str, float], tuple[int, int, int, int]]] = []
    for y0, y1 in rows:
        for x0, x1 in cols:
            w0, h0 = x1 - x0, y1 - y0
            # A arte desenha uma MOLDURA de folhagem escura em volta de cada
            # quadro (e um vinhetado). Repetir o quadro inteiro imprime essa
            # moldura no chao como uma grade. Por isso o tile de base sai do
            # MIOLO (34% de recorte por lado) -- medido: a moldura vai ate ~24%
            # da meia-largura, entao 34% garante folga.
            ix, iy = int(w0 * 0.34), int(h0 * 0.34)
            box = (x0 + ix, y0 + iy, x1 - ix, y1 - iy)
            # a medida sai do MIOLO tambem: e ele que vai virar textura
            f = frac(np.array(img.crop(box)).astype(int))
            cells_raw.append((img.crop(box), f, (x0, y0, x1, y1)))

    # -- passo 2: classifica comparando os tiles entre si --
    labels = classify_relative([f for _, f, _ in cells_raw])
    tally: dict[str, int] = {}
    for lb in labels:
        tally[lb] = tally.get(lb, 0) + 1
    print("  classes: " + "  ".join(f"{k}={v}" for k, v in sorted(tally.items())))

    for (cell, f, full), kind in zip(cells_raw, labels):
        t = np.array(cell.resize((TILE, TILE), Image.BOX)).astype(np.float64)
        t = devignette(t, 1.0 if kind in ("grass", "detail") else 0.85)
        t = flatten_lowfreq(t)
        tile_px = wrap_seamless(t)
        scored[kind].append((ring_score(tile_px), tile_px))
        if kind == "dirt":
            heavy.append((-f["gr"], full))
        if kind == "sand":
            sandy.append((f["lum"], full))

    # preenchimento puro: recorta o miolo dos tiles mais sujos
    def cores(src: list[tuple[float, tuple[int, int, int, int]]], n: int) -> list[np.ndarray]:
        out: list[np.ndarray] = []
        for _, (x0, y0, x1, y1) in sorted(src, reverse=True)[:n]:
            w, h = x1 - x0, y1 - y0
            mx, my = int(w * 0.22), int(h * 0.22)
            core = img.crop((x0 + mx, y0 + my, x1 - mx, y1 - my)).resize((TILE, TILE), Image.BOX)
            out.append(wrap_seamless(flatten_lowfreq(np.array(core).astype(np.float64))))
        return out

    # Descarta tiles que ainda mostram moldura (anel escuro). Sobrando poucos,
    # mantem ao menos os 6 melhores para nao empobrecer a variacao.
    # grama/detalhe cobrem quase toda a tela: exigencia alta. terra/areia
    # aparecem em manchas menores, um residuo la e imperceptivel.
    RING_MAX = {"grass": 3.0, "detail": 3.4, "dirt": 6.0, "sand": 6.0}
    MIN_KEEP = {"grass": 8, "detail": 8, "dirt": 6, "sand": 8}
    for k, lst in scored.items():
        lst.sort(key=lambda p: p[0])
        keep = [t for sc, t in lst if sc <= RING_MAX[k]]
        floor = min(MIN_KEEP[k], len(lst))
        if len(keep) < floor:
            keep = [t for _, t in lst[:floor]]
        dropped = len(lst) - len(keep)
        if dropped:
            print(f"    {k}: {dropped} tile(s) com moldura descartado(s)")
        kinds[k] = keep

    # Preenchimento puro (miolo das manchas): entra DEPOIS do filtro porque ja
    # nasce sem moldura -- e o que cobre o interior das clareiras.
    kinds["dirt"] = cores(heavy, 5) + kinds["dirt"]
    if sandy:
        kinds["sand"] = cores(sandy, 4) + kinds["sand"]

    # Iguala o brilho medio dos tiles de um mesmo grupo. Sem isso, tiles
    # vizinhos com 10-27 niveis de diferenca desenham um xadrez no chao.
    for k, lst in kinds.items():
        if len(lst) < 2:
            continue
        means = np.array([t.mean() for t in lst])
        target = float(np.median(means))
        for i, t in enumerate(lst):
            m = float(t.mean())
            if m > 1:
                # correcao parcial (75%): mantem alguma variacao natural
                g = 1.0 + 0.75 * (target / m - 1.0)
                lst[i] = np.clip(t * float(np.clip(g, 0.82, 1.22)), 0, 255)

    order = ["grass", "detail", "dirt", "sand"]
    flat: list[np.ndarray] = []
    meta: dict[str, list[int]] = {}
    for k in order:
        meta[k] = list(range(len(flat), len(flat) + len(kinds[k])))
        flat.extend(kinds[k])
    if not flat:
        return None

    rows_n = (len(flat) + ATLAS_COLS - 1) // ATLAS_COLS
    atlas = Image.new("RGB", (ATLAS_COLS * TILE, rows_n * TILE), (0, 0, 0))
    for i, t in enumerate(flat):
        px = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8))
        atlas.paste(px, ((i % ATLAS_COLS) * TILE, (i // ATLAS_COLS) * TILE))

    # paleta reduzida: devolve o "corte" de cor de pixel art perdido no JPEG
    atlas = atlas.quantize(colors=48, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")

    os.makedirs(OUT_DIR, exist_ok=True)
    out_png = os.path.join(OUT_DIR, f"{name}.png")
    atlas.save(out_png, optimize=True)
    print(f"  -> {out_png}  {atlas.size[0]}x{atlas.size[1]}  "
          + "  ".join(f"{k}={len(meta[k])}" for k in order))
    return {"tile": TILE, "cols": ATLAS_COLS, "count": len(flat), **meta}


def main() -> int:
    manifest: dict[str, dict] = {}
    for name, cands in SOURCES:
        src = find_src(cands)
        if not src:
            print(f"[skip] {name}: referencia nao encontrada")
            continue
        print(f"[{name}] {src}")
        m = build(name, src)
        if m:
            manifest[name] = m
    if not manifest:
        print("nada gerado")
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "tiles.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"-> {os.path.join(OUT_DIR, 'tiles.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
