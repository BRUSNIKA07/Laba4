import type { Vec } from '../types/night';

/** Стоимость входа в клетку; Infinity означает «стена». */
export type CostFn = (x: number, y: number) => number;

interface Node {
  x: number;
  y: number;
  g: number;
  f: number;
  order: number; // для стабильного порядка при равных f (детерминизм)
}

class MinHeap {
  private a: Node[] = [];
  get size(): number {
    return this.a.length;
  }
  private less(i: number, j: number): boolean {
    const p = this.a[i]!;
    const q = this.a[j]!;
    return p.f < q.f || (p.f === q.f && p.order < q.order);
  }
  push(n: Node): void {
    this.a.push(n);
    let i = this.a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      [this.a[i], this.a[parent]] = [this.a[parent]!, this.a[i]!];
      i = parent;
    }
  }
  pop(): Node | undefined {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length > 0 && last) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.less(l, m)) m = l;
        if (r < this.a.length && this.less(r, m)) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m]!, this.a[i]!];
        i = m;
      }
    }
    return top;
  }
}

const DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Поиск пути A* по сетке, 8 направлений, без срезания углов.
 * Минимальная стоимость клетки должна быть >= 1 (так эвристика остаётся допустимой).
 * Возвращает клетки от start до goal включительно или null, если пути нет.
 */
export function findPath(
  width: number,
  height: number,
  cost: CostFn,
  start: Vec,
  goal: Vec,
): Vec[] | null {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  if (!inside(start.x, start.y) || !inside(goal.x, goal.y)) return null;
  if (!Number.isFinite(cost(goal.x, goal.y))) return null;

  const idx = (x: number, y: number) => y * width + x;
  const heur = (x: number, y: number) => {
    const dx = Math.abs(x - goal.x);
    const dy = Math.abs(y - goal.y);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); // октильное расстояние
  };

  const best = new Float64Array(width * height).fill(Infinity);
  const from = new Int32Array(width * height).fill(-1);
  const closed = new Uint8Array(width * height);
  const heap = new MinHeap();
  let order = 0;

  best[idx(start.x, start.y)] = 0;
  heap.push({ x: start.x, y: start.y, g: 0, f: heur(start.x, start.y), order: order++ });

  while (heap.size > 0) {
    const cur = heap.pop()!;
    const ci = idx(cur.x, cur.y);
    if (closed[ci]) continue;
    closed[ci] = 1;

    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Vec[] = [];
      for (let i = ci; i !== -1; i = from[i]!) path.push({ x: i % width, y: Math.floor(i / width) });
      return path.reverse();
    }

    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inside(nx, ny)) continue;
      const c = cost(nx, ny);
      if (!Number.isFinite(c)) continue;
      if (dx !== 0 && dy !== 0) {
        // по диагонали нельзя проходить между двумя стенами
        if (!Number.isFinite(cost(cur.x + dx, cur.y)) || !Number.isFinite(cost(cur.x, cur.y + dy))) continue;
      }
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const g = cur.g + c * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
      if (g < best[ni]!) {
        best[ni] = g;
        from[ni] = ci;
        heap.push({ x: nx, y: ny, g, f: g + heur(nx, ny), order: order++ });
      }
    }
  }
  return null;
}
