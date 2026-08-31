/**
 * Desenho de entidades com culling por retângulo visível.
 * Formigas sempre visíveis (são suas); recursos só no raio ATIVO da névoa;
 * props no revelado (memória de terreno).
 */
import { ANTS } from '../core/constants';
import type { Scene } from '../core/types';
import { drawProp } from './placeholderShapes';
import { getSprite } from './spriteRegistry';

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  view: { left: number; top: number; right: number; bottom: number },
): void {
  // ── props (só onde a névoa já revelou) ──────────────────────────
  for (const p of scene.props) {
    if (p.x < view.left - 40 || p.x > view.right + 40) continue;
    if (p.y < view.top - 50 || p.y > view.bottom + 40) continue;
    if (!scene.fog.isRevealed(p.x, p.y)) continue;
    drawProp(ctx, p.kind, p.x, p.y, p.s);
  }

  // ── recursos (só no raio ativo) ─────────────────────────────────
  for (const r of scene.resources) {
    if (r.amount <= 0) continue;
    if (r.x < view.left - 20 || r.x > view.right + 20) continue;
    if (r.y < view.top - 20 || r.y > view.bottom + 20) continue;
    if (!scene.fog.isActive(r.x, r.y)) continue;
    getSprite(`resource:${r.kind}`).draw(ctx, { x: r.x, y: r.y });
  }

  // ── ninho ───────────────────────────────────────────────────────
  if (
    scene.nest.x >= view.left - 200 &&
    scene.nest.x <= view.right + 200 &&
    scene.nest.y >= view.top - 200 &&
    scene.nest.y <= view.bottom + 200
  ) {
    getSprite('nest:mound').draw(ctx, { x: scene.nest.x, y: scene.nest.y });
  }

  // ── formigas ────────────────────────────────────────────────────
  for (const a of scene.ants) {
    if (a.internal) continue;
    if (a.x < view.left - 30 || a.x > view.right + 30) continue;
    if (a.y < view.top - 30 || a.y > view.bottom + 30) continue;
    getSprite(`ant:${a.cls}`).draw(ctx, {
      x: a.x,
      y: a.y,
      dir: a.dir,
      walkPhase: a.walkPhase,
      carrying: a.carrying > 0,
      highlight: a.id === scene.selectedAntId,
    });
  }

  // tamanho de referência (garante ANTS importado para futuras escalas)
  void ANTS;
}
