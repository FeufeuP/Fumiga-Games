#!/usr/bin/env python3
"""
Converte a fonte bitmap (src/assets/fonts/formigueiro.{png,json}) numa fonte
vetorial WOFF2, para a interface inteira usar via `font-family` — inclusive
onde o texto é HTML (botões, modais, HUD), não só no canvas.

Cada pixel aceso vira um retângulo no contorno do glifo; pixels vizinhos na
mesma linha são fundidos numa corrida só, o que reduz muito o número de
contornos. O resultado é uma fonte de verdade: escala em qualquer tamanho,
sem borrar, porque as arestas continuam alinhadas à grade do pixel.

Saída: src/assets/fonts/Formigueiro.woff2 (+ .ttf para depuração)
"""
from __future__ import annotations

import json
import os

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image

UPM = 1024
PX = 64                     # 1 pixel de arte = 64 unidades (16 px de caixa)
DIR = os.path.join("src", "assets", "fonts")
META = os.path.join(DIR, "formigueiro.json")
PNG = os.path.join(DIR, "formigueiro.png")


def glyph_name(ch: str) -> str:
    if ch == " ":
        return "space"
    if ch.isalnum() and ord(ch) < 128:
        return ch
    return f"uni{ord(ch):04X}"


def runs_of(rows: list[list[bool]]) -> list[tuple[int, int, int]]:
    """Corridas horizontais de pixels acesos: (y, x_inicio, x_fim_exclusivo)."""
    out: list[tuple[int, int, int]] = []
    for y, row in enumerate(rows):
        x = 0
        w = len(row)
        while x < w:
            if not row[x]:
                x += 1
                continue
            x2 = x
            while x2 + 1 < w and row[x2 + 1]:
                x2 += 1
            out.append((y, x, x2 + 1))
            x = x2 + 1
    return out


def main() -> int:
    meta = json.load(open(META, encoding="utf-8"))
    img = Image.open(PNG).convert("RGBA")
    cw, ch = meta["cell"]
    ascent = meta["ascent"]

    bitmaps: dict[str, list[list[bool]]] = {}
    advances: dict[str, int] = {}
    for key, g in meta["glyphs"].items():
        if len(key) != 1 or ord(key) > 0xFFFF:
            continue
        cell = img.crop((g["x"], g["y"], g["x"] + cw, g["y"] + ch))
        bitmaps[key] = [
            [cell.getpixel((x, y))[3] > 128 for x in range(cw)] for y in range(ch)
        ]
        advances[key] = g["adv"]

    chars = sorted(bitmaps, key=ord)
    order = [".notdef"] + [glyph_name(c) for c in chars]

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({ord(c): glyph_name(c) for c in chars})

    glyphs = {}
    metrics = {}

    pen = TTGlyphPen(None)
    glyphs[".notdef"] = pen.glyph()
    metrics[".notdef"] = (6 * PX, 0)

    for c in chars:
        pen = TTGlyphPen(None)
        for (y, x0, x1) in runs_of(bitmaps[c]):
            top = (ascent - y) * PX
            bot = (ascent - y - 1) * PX
            left, right = x0 * PX, x1 * PX
            # sentido horário (preenchimento TrueType)
            pen.moveTo((left, bot))
            pen.lineTo((left, top))
            pen.lineTo((right, top))
            pen.lineTo((right, bot))
            pen.closePath()
        name = glyph_name(c)
        glyphs[name] = pen.glyph()
        metrics[name] = (advances[c] * PX, 0)

    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    asc = ascent * PX
    desc = -(ch - ascent) * PX
    fb.setupHorizontalHeader(ascent=asc, descent=desc, lineGap=0)
    fb.setupNameTable({
        "familyName": "Formigueiro",
        "styleName": "Regular",
        "psName": "Formigueiro-Regular",
        "fullName": "Formigueiro",
        "version": "1.0",
        "copyright": "Gerado de images/fonte pixelada.jpeg",
    })
    fb.setupOS2(sTypoAscender=asc, sTypoDescender=desc, sTypoLineGap=0,
                usWinAscent=asc, usWinDescent=-desc,
                sxHeight=int(7 * PX), sCapHeight=int(10 * PX))
    fb.setupPost(isFixedPitch=0)

    ttf = os.path.join(DIR, "Formigueiro.ttf")
    fb.save(ttf)
    print(f"  -> {ttf}  {os.path.getsize(ttf) / 1024:.1f} KB  {len(order)} glifos")

    fb.font.flavor = "woff2"
    woff2 = os.path.join(DIR, "Formigueiro.woff2")
    fb.font.save(woff2)
    print(f"  -> {woff2}  {os.path.getsize(woff2) / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
