/**
 * Spatial hash — vizinhos em O(1) por célula (regra de performance do plano).
 * Rebuilt a cada passo para entidades móveis; consultado por raio.
 */

export class SpatialHash<T extends { x: number; y: number }> {
  private readonly cellSize: number;
  private cells = new Map<number, T[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): number {
    // mundos de até 4096px / célula de 64px = 64 células por eixo — cabe folgado
    return ((cx & 0x7fff) << 16) | (cy & 0x7fff);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(item: T): void {
    const cx = Math.floor(item.x / this.cellSize);
    const cy = Math.floor(item.y / this.cellSize);
    const k = this.key(cx, cy);
    const arr = this.cells.get(k);
    if (arr) arr.push(item);
    else this.cells.set(k, [item]);
  }

  insertAll(items: readonly T[]): void {
    for (const it of items) this.insert(it);
  }

  /** Itens dentro do círculo (aprox. por célula — refina por distância). */
  query(x: number, y: number, r: number, out?: T[]): T[] {
    const result = out ?? [];
    const min = Math.floor((x - r) / this.cellSize);
    const maxX = Math.floor((x + r) / this.cellSize);
    const minY = Math.floor((y - r) / this.cellSize);
    const maxY = Math.floor((y + r) / this.cellSize);
    const r2 = r * r;
    for (let cx = min; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const it of arr) {
          const dx = it.x - x;
          const dy = it.y - y;
          if (dx * dx + dy * dy <= r2) result.push(it);
        }
      }
    }
    return result;
  }
}
