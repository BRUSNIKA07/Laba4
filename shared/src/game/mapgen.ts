import { TILE, type NightMap, type Vec } from '../types/night';
import type { MapBalance } from '../types/balance';
import { nextRandom, randInt } from './rng';

/**
 * Случайная локация вокруг бункера (создаётся один раз на партию).
 * Бункер справа, дорога начинается у левого края и приходит к воротам.
 * Последний отрезок дороги всегда прямой и горизонтальный:
 * на нём стоят баррикады, а рядом — слоты турелей.
 */
export function generateMap(rng: { rng: number }, cfg: MapBalance): NightMap {
  const { width, height } = cfg;
  const tiles: number[] = new Array(width * height).fill(TILE.grass);
  const at = (x: number, y: number) => y * width + x;

  // 1. Бункер: правая часть карты.
  const bunkerX = width - 6;
  for (let y = 0; y < height; y++) for (let x = bunkerX; x < width; x++) tiles[at(x, y)] = TILE.bunker;

  const gateY = randInt(rng, Math.floor(height * 0.35), Math.floor(height * 0.65));
  const gate: Vec = { x: bunkerX, y: gateY };

  // 2. Дорога: ломаная через случайные точки.
  const lastTurnX = bunkerX - 10;
  const margin = 3;
  const randY = () => randInt(rng, margin, height - 1 - margin);
  const waypoints: Vec[] = [{ x: 0, y: randY() }];
  const segments = 3;
  for (let i = 1; i <= segments; i++) {
    const x = Math.floor((lastTurnX * i) / (segments + 1)) + randInt(rng, -2, 2);
    waypoints.push({ x: Math.max(waypoints[i - 1]!.x + 3, x), y: randY() });
  }
  waypoints.push({ x: lastTurnX, y: gateY });
  waypoints.push({ x: bunkerX - 1, y: gateY });

  const road: Vec[] = [];
  const push = (x: number, y: number) => {
    const last = road[road.length - 1];
    if (!last || last.x !== x || last.y !== y) road.push({ x, y });
  };
  let cx = waypoints[0]!.x;
  let cy = waypoints[0]!.y;
  push(cx, cy);
  for (let i = 1; i < waypoints.length; i++) {
    const w = waypoints[i]!;
    while (cx !== w.x) {
      cx += Math.sign(w.x - cx);
      push(cx, cy);
    }
    while (cy !== w.y) {
      cy += Math.sign(w.y - cy);
      push(cx, cy);
    }
  }
  for (const r of road) tiles[at(r.x, r.y)] = TILE.road;

  // 3. Особые места рядом с воротами.
  const isRoad = (x: number, y: number) => tiles[at(x, y)] === TILE.road;
  const free = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < bunkerX && y < height && !isRoad(x, y);

  // Баррикады: 4 клетки дороги перед воротами (с отступом в 2 клетки).
  const barricadeSlots: Vec[] = [];
  for (let i = 3; i <= 6; i++) {
    const r = road[road.length - 1 - i];
    if (r) barricadeSlots.push({ ...r });
  }

  // Турели: по обе стороны прямого отрезка, через клетку от дороги.
  const turretSlots: Vec[] = [];
  for (let i = 2; i <= 8; i += 2) {
    const r = road[road.length - 1 - i];
    if (!r) continue;
    for (const dy of [-2, 2]) if (free(r.x, r.y + dy)) turretSlots.push({ x: r.x, y: r.y + dy });
  }

  // Солдаты: сетка позиций слева от ворот, вокруг прямого отрезка.
  const soldierPosts: Vec[] = [];
  for (let dx = 3; dx <= 7; dx++) {
    for (const dy of [-1, 1, -3, 3]) {
      const x = bunkerX - dx;
      const y = gateY + dy;
      if (free(x, y)) soldierPosts.push({ x, y });
    }
  }

  // 4. Декор: деревья и камни, но не на дороге и не на особых местах.
  const reserved = new Set<number>();
  for (const v of [...turretSlots, ...soldierPosts]) reserved.add(at(v.x, v.y));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bunkerX; x++) {
      const i = at(x, y);
      if (tiles[i] !== TILE.grass || reserved.has(i)) continue;
      const nearGate = Math.abs(y - gateY) <= 4 && x >= bunkerX - 9;
      const r = nextRandom(rng);
      if (nearGate) continue; // зона боя остаётся чистой
      if (r < cfg.treeChance) tiles[i] = TILE.tree;
      else if (r < cfg.treeChance + cfg.rockChance) tiles[i] = TILE.rock;
    }
  }

  return { width, height, tiles, road, gate, soldierPosts, turretSlots, barricadeSlots };
}
