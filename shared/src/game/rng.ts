/**
 * Детерминированный генератор случайных чисел (mulberry32).
 * Состояние — одно число, поэтому оно лежит прямо в GameState.rng:
 * один seed даёт одну и ту же партию, это нужно для сохранений и проверки логов.
 */
export function nextRandom(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state: { rng: number }, min: number, max: number): number {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}

export function pick<T>(state: { rng: number }, arr: readonly T[]): T {
  const v = arr[Math.floor(nextRandom(state) * arr.length)];
  if (v === undefined) throw new Error('pick: пустой массив');
  return v;
}

/** Выбор по весам. */
export function pickWeighted<T extends string>(state: { rng: number }, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = nextRandom(state) * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1]![0];
}

/** Перемешивание Фишера-Йейтса на копии массива. */
export function shuffled<T>(state: { rng: number }, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
