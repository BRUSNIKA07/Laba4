import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, findPath, generateMap } from '../src';
import { loadBalance } from './helpers';

test('A*: обходит стену', () => {
  const wall = new Set([1, 4, 7].map((y) => `2,${y}`)); // стена x=2, дырка в y=2..3
  const cost = (x: number, y: number) => (wall.has(`${x},${y}`) ? Infinity : 1);
  const path = findPath(6, 8, cost, { x: 0, y: 0 }, { x: 5, y: 0 });
  assert.ok(path);
  assert.deepEqual(path![0], { x: 0, y: 0 });
  assert.deepEqual(path![path!.length - 1], { x: 5, y: 0 });
  assert.ok(path!.every((p) => !wall.has(`${p.x},${p.y}`)));
});
test('A*: нет пути — null', () => {
  const cost = (x: number) => (x === 2 ? Infinity : 1);
  assert.equal(findPath(5, 5, cost, { x: 0, y: 0 }, { x: 4, y: 4 }), null);
});
test('A*: не срезает углы', () => {
  const wall = new Set(['1,0', '0,1']);
  const cost = (x: number, y: number) => (wall.has(`${x},${y}`) ? Infinity : 1);
  assert.equal(findPath(3, 3, cost, { x: 0, y: 0 }, { x: 1, y: 1 }), null);
});

test('карта: 200 случайных seed, дорога цела и ведёт к воротам', () => {
  const b = loadBalance();
  for (let seed = 1; seed <= 200; seed++) {
    const m = generateMap({ rng: seed }, b.map);
    assert.equal(m.road[0]!.x, 0, 'дорога начинается у левого края');
    const last = m.road[m.road.length - 1]!;
    assert.deepEqual(last, { x: m.gate.x - 1, y: m.gate.y }, 'дорога упирается в ворота');
    for (let i = 1; i < m.road.length; i++) {
      const d = Math.abs(m.road[i]!.x - m.road[i - 1]!.x) + Math.abs(m.road[i]!.y - m.road[i - 1]!.y);
      assert.equal(d, 1, 'соседние клетки дороги стоят рядом');
    }
    for (const r of m.road) assert.equal(m.tiles[r.y * m.width + r.x], TILE.road);
    for (const s of [...m.turretSlots, ...m.soldierPosts]) assert.equal(m.tiles[s.y * m.width + s.x], TILE.grass, 'особые места свободны');
    assert.ok(m.turretSlots.length >= 4 && m.soldierPosts.length >= 8 && m.barricadeSlots.length === 4);
    const path = findPath(m.width, m.height, (x, y) => {
      const t = m.tiles[y * m.width + x];
      return t === TILE.road ? 1 : t === TILE.grass ? 2.5 : Infinity;
    }, m.road[0]!, last);
    assert.ok(path, `путь есть, seed ${seed}`);
  }
});
test('карта: один seed — одна карта', () => {
  const b = loadBalance();
  assert.deepEqual(generateMap({ rng: 777 }, b.map), generateMap({ rng: 777 }, b.map));
});
