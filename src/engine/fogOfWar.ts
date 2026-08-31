/**
 * Névoa de guerra (lacuna L4). Duas camadas:
 *  - revelado: permanente (FOG.PERMANENT), serializada no save (RLE)
 *  - ativo: recalculado N×/s — recursos/inimigos só aparecem no raio ativo
 * Célula de 24px (ajuste pós-D2, docs/06).
 */
import { FOG } from '../core/constants';

export class FogOfWar {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  readonly width: number;
  readonly height: number;
  private revealed: Uint8Array;
  private active: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cell = FOG.CELL;
    this.cols = Math.ceil(width / this.cell);
    this.rows = Math.ceil(height / this.cell);
    this.revealed = new Uint8Array(this.cols * this.rows);
    this.active = new Uint8Array(this.cols * this.rows);
  }

  private markCircle(buf: Uint8Array, x: number, y: number, r: number): void {
    const c0 = Math.max(0, Math.floor((x - r) / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r) / this.cell));
    const r0 = Math.max(0, Math.floor((y - r) / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((y + r) / this.cell));
    const r2 = r * r;
    for (let row = r0; row <= r1; row++) {
      const cy = (row + 0.5) * this.cell;
      for (let col = c0; col <= c1; col++) {
        const cx = (col + 0.5) * this.cell;
        const dx = cx - x;
        const dy = cy - y;
        if (dx * dx + dy * dy <= r2) buf[row * this.cols + col] = 1;
      }
    }
  }

  /** Revela permanentemente (não re-escurece). */
  reveal(x: number, y: number, r: number): void {
    this.markCircle(this.revealed, x, y, r);
  }

  /** Recalcula a camada ativa: limpa e marca o raio de cada fonte. */
  recomputeActive(sources: ReadonlyArray<{ x: number; y: number; r: number }>): void {
    this.active.fill(0);
    for (const s of sources) this.markCircle(this.active, s.x, s.y, s.r);
  }

  private cellIndexAt(x: number, y: number): number {
    const col = Math.floor(x / this.cell);
    const row = Math.floor(y / this.cell);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return -1;
    return row * this.cols + col;
  }

  isRevealed(x: number, y: number): boolean {
    const i = this.cellIndexAt(x, y);
    return i >= 0 && this.revealed[i] === 1;
  }

  isActive(x: number, y: number): boolean {
    const i = this.cellIndexAt(x, y);
    return i >= 0 && this.active[i] === 1;
  }

  /** Acesso direto por índice linear (renderizador varre a grade). */
  isRevealedCell(i: number): boolean {
    return this.revealed[i] === 1;
  }

  isActiveCell(i: number): boolean {
    return this.active[i] === 1;
  }

  revealedFraction(): number {
    let n = 0;
    for (let i = 0; i < this.revealed.length; i++) n += this.revealed[i];
    return n / this.revealed.length;
  }

  // ── Serialização (RLE simples: [valor, runLength, ...]) ──────────

  serializeRLE(): number[] {
    const out: number[] = [];
    let val = this.revealed[0];
    let run = 1;
    for (let i = 1; i < this.revealed.length; i++) {
      const v = this.revealed[i];
      if (v === val) run++;
      else {
        out.push(val, run);
        val = v;
        run = 1;
      }
    }
    out.push(val, run);
    return out;
  }

  static fromRLE(width: number, height: number, rle: readonly number[]): FogOfWar {
    const fog = new FogOfWar(width, height);
    let i = 0;
    for (let p = 0; p + 1 < rle.length; p += 2) {
      const val = rle[p] as number;
      const run = rle[p + 1] as number;
      const end = Math.min(i + run, fog.revealed.length);
      if (val) fog.revealed.fill(1, i, end);
      i = end;
      if (i >= fog.revealed.length) break;
    }
    return fog;
  }
}
