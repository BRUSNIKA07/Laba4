import type { Balance } from '../types/balance';
import type { Structure } from '../types/bunker';
import type { GameState } from '../types/match';
import { TILE, type Enemy, type NightState, type Soldier, type Vec, type WaveSpawn } from '../types/night';
import type { EnemyKind } from '../types/units';
import { addResources } from '../types/resources';
import { soldierBase, soldierDamage, soldierMaxHp } from './army';
import { emit, log } from './log';
import { findPath } from './pathfinding';
import { nextRandom } from './rng';

/** Радиус, в котором солдаты замечают врагов. */
const AGGRO = 7;

export type NightOutcome = 'ongoing' | 'cleared' | 'breach';

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function structurePos(state: GameState, s: Structure): Vec {
  const m = state.map;
  if (s.kind === 'gate') return { x: m.gate.x + 0.5, y: m.gate.y + 0.5 };
  const slot = (s.kind === 'turret' ? m.turretSlots : m.barricadeSlots)[s.slot];
  if (!slot) throw new Error(`Нет слота ${s.slot} для ${s.id}`);
  return { x: slot.x + 0.5, y: slot.y + 0.5 };
}

/** Клетка, к которой идут враги: дорога прямо перед воротами. */
function approachTile(state: GameState): Vec {
  return { x: state.map.gate.x - 1, y: state.map.gate.y };
}

function computePath(state: GameState, from: Vec): Vec[] {
  const m = state.map;
  const blocked = new Set<number>();
  for (const s of state.bunker.structures) {
    if (s.kind === 'barricade' && s.hp > 0) {
      const sl = m.barricadeSlots[s.slot];
      if (sl) blocked.add(sl.y * m.width + sl.x);
    }
  }
  const cost = (x: number, y: number) => {
    const t = m.tiles[y * m.width + x];
    if (t === TILE.tree || t === TILE.rock || t === TILE.bunker) return Infinity;
    if (blocked.has(y * m.width + x)) return Infinity;
    return t === TILE.road ? 1 : 2.5; // враги предпочитают дорогу
  };
  const goal = approachTile(state);
  const path = findPath(m.width, m.height, cost, from, goal);
  // Запасной вариант: если пути нет, идём прямо по дороге.
  return path ?? m.road.slice(m.road.findIndex((r) => r.x === from.x && r.y === from.y));
}

/** Сколько врагов в каждой волне и какого типа; результат — очередь появлений. */
function planWaves(state: GameState, b: Balance): { spawns: WaveSpawn[]; starts: number[] } {
  const w = b.waves;
  const spawns: WaveSpawn[] = [];
  const starts: number[] = [];
  let t = w.firstWaveDelayTicks;
  const day = state.day;
  for (let i = 0; i < w.wavesPerNight; i++) {
    const count = Math.max(1, Math.round(w.baseCounts[i]! * (1 + w.countGrowthPerDay * (day - 1))));
    const share = Math.min(w.spitterShareMax, w.spitterShareBase + w.spitterSharePerDay * (day - 1));
    starts.push(t);
    for (let k = 0; k < count; k++) {
      const kind: EnemyKind = nextRandom(state) < share ? 'spitter' : 'grunt';
      spawns.push({ atTick: t + k * w.spawnIntervalTicks, kind });
    }
    t += count * w.spawnIntervalTicks + w.waveGapTicks;
  }
  return { spawns, starts };
}

/** Начало ночи: создаём солдат из армии, планируем волны. */
export function startNight(state: GameState, b: Balance): void {
  const army = state.bunker.army;
  const posts = state.map.soldierPosts;
  const soldiers: Soldier[] = [];
  let id = 1;
  const make = (kind: 'melee' | 'ranged', n: number) => {
    for (let i = 0; i < n; i++) {
      const post = posts[soldiers.length % posts.length]!;
      // если солдат больше, чем постов, разносим их по клетке
      const ring = Math.floor(soldiers.length / posts.length);
      const ox = ((ring % 3) - 1) * 0.25;
      const oy = (Math.floor(ring / 3) % 3) * 0.25 - 0.25;
      const hp = soldierMaxHp(state, b, kind);
      soldiers.push({
        id: id++, kind, hp, maxHp: hp,
        x: post.x + 0.5 + ox, y: post.y + 0.5 + oy,
        homeX: post.x + 0.5 + ox, homeY: post.y + 0.5 + oy,
        cooldown: 0,
      });
    }
  };
  // стрелки сзади (более дальние посты), ближники ближе к дороге — посты уже упорядочены от ворот
  make('melee', army.melee);
  make('ranged', army.ranged);

  const { spawns, starts } = planWaves(state, b);
  const night: NightState = {
    tick: 0, enemies: [], soldiers, fires: [], spawns, totalEnemies: spawns.length,
    waveStarts: starts, waveAnnounced: 0, nextId: id,
    pathVersion: 1, cheerUntil: 0, coffeeUntil: 0, focusUntil: 0, focus: null,
    stats: { kills: 0, soldiersLost: 0, loot: {} },
  };
  state.night = night;
}

function spawnEnemy(state: GameState, b: Balance, night: NightState, kind: EnemyKind): void {
  const def = b.units.enemies[kind];
  const day = state.day;
  const hp = Math.round(def.hp * (1 + b.waves.hpPerDay * (day - 1)));
  const start = state.map.road[0]!;
  const path = computePath(state, start);
  night.enemies.push({
    id: night.nextId++, kind, x: start.x + 0.5, y: start.y + 0.5,
    hp, maxHp: hp,
    damage: def.damage * (1 + b.waves.damagePerDay * (day - 1)),
    range: def.range, cooldownTicks: def.cooldownTicks, speed: def.speed,
    cooldown: 0, path, pathIdx: 1, pathVersion: night.pathVersion, loot: def.loot,
  });
}

/** Нанести урон врагу; смерть обрабатывается в конце тика. */
export function damageEnemy(e: Enemy, dmg: number): void {
  e.hp -= dmg;
}

/** Самый раненый солдат (или null, если все здоровы). */
export function mostWounded(night: NightState): Soldier | null {
  let best: Soldier | null = null;
  for (const s of night.soldiers) {
    if (s.hp >= s.maxHp) continue;
    if (!best || s.hp / s.maxHp < best.hp / best.maxHp) best = s;
  }
  return best;
}

/** Враг, который ближе всех к воротам (по длине оставшегося пути, упрощённо по расстоянию). */
export function nearestToGate(state: GameState, night: NightState): Enemy | null {
  const g = state.map.gate;
  let best: Enemy | null = null;
  let bd = Infinity;
  for (const e of night.enemies) {
    const d = dist(e.x, e.y, g.x + 0.5, g.y + 0.5);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function nearest<T extends { x: number; y: number }>(from: { x: number; y: number }, list: T[], maxDist: number): T | null {
  let best: T | null = null;
  let bd = maxDist;
  for (const o of list) {
    const d = dist(from.x, from.y, o.x, o.y);
    if (d <= bd) { bd = d; best = o; }
  }
  return best;
}

function moveToward(u: { x: number; y: number }, tx: number, ty: number, speed: number): boolean {
  const d = dist(u.x, u.y, tx, ty);
  if (d <= speed) { u.x = tx; u.y = ty; return true; }
  u.x += ((tx - u.x) / d) * speed;
  u.y += ((ty - u.y) / d) * speed;
  return false;
}

/** Один тик ночного боя. Все действия детерминированы: порядок обхода фиксирован. */
export function tickNight(state: GameState, b: Balance): NightOutcome {
  const night = state.night;
  if (!night) return 'cleared';
  const t = night.tick;

  // --- объявления волн
  while (night.waveAnnounced < night.waveStarts.length && night.waveStarts[night.waveAnnounced]! <= t) {
    const w = night.waveAnnounced;
    const next = night.waveStarts[w + 1] ?? Infinity;
    const n = night.spawns.filter((s) => s.atTick >= night.waveStarts[w]! && s.atTick < next).length;
    log(state, `>> Волна ${w + 1} из ${night.waveStarts.length}: врагов ${n}`);
    emit(state, { t: 'wave', wave: w + 1, total: night.waveStarts.length, enemies: n });
    night.waveAnnounced++;
  }

  // --- появление врагов
  while (night.spawns.length > 0 && night.spawns[0]!.atTick <= t) {
    spawnEnemy(state, b, night, night.spawns.shift()!.kind);
  }

  const cheer = t < night.cheerUntil ? cheerMult(b) : 1;
  const speedUp = t < night.coffeeUntil ? 1 + coffeeSpeed(b) : 1;
  const focus = t < night.focusUntil ? night.focus : null;

  // --- пересчёт путей, если изменилась проходимость
  for (const e of night.enemies) {
    if (e.pathVersion !== night.pathVersion) {
      const from = { x: Math.floor(e.x), y: Math.floor(e.y) };
      e.path = computePath(state, from);
      e.pathIdx = 1;
      e.pathVersion = night.pathVersion;
    }
  }

  // --- огонь
  for (const f of night.fires) {
    for (const e of night.enemies) if (dist(e.x, e.y, f.x, f.y) <= f.radius) e.hp -= f.dpsTick;
    f.ticksLeft--;
  }
  night.fires = night.fires.filter((f) => f.ticksLeft > 0);

  // --- солдаты
  for (const s of night.soldiers) {
    if (s.cooldown > 0) s.cooldown--;
    const base = soldierBase(b, s.kind);
    const isMelee = s.kind === 'melee';
    const reach = isMelee ? AGGRO : base.range;
    let target = focus ? nearest(s, night.enemies.filter((e) => e.kind === focus), reach) : null;
    target ??= nearest(s, night.enemies, reach);
    if (!target) {
      moveToward(s, s.homeX, s.homeY, base.speed);
      continue;
    }
    const d = dist(s.x, s.y, target.x, target.y);
    if (d > base.range) {
      if (isMelee) moveToward(s, target.x, target.y, base.speed);
      continue;
    }
    if (s.cooldown === 0) {
      target.hp -= soldierDamage(state, b, s.kind) * cheer;
      s.cooldown = Math.max(1, Math.round(base.cooldownTicks / speedUp));
      if (!isMelee) emit(state, { t: 'shot', by: 'soldier', from: { x: s.x, y: s.y }, to: { x: target.x, y: target.y } });
    }
  }

  // --- турели
  for (const st of state.bunker.structures) {
    if (st.kind !== 'turret' || st.hp <= 0) continue;
    if (st.cooldown > 0) { st.cooldown--; continue; }
    const def = b.units.turrets[st.turret ?? 'basic'];
    const pos = structurePos(state, st);
    const target = nearest(pos, night.enemies, def.range);
    if (!target) continue;
    const upg = b.commands['upgrade.turret']?.params['damageBonus'] ?? 0;
    target.hp -= def.damage * (1 + upg * (st.level - 1));
    st.cooldown = def.cooldownTicks;
    emit(state, { t: 'shot', by: 'turret', from: pos, to: { x: target.x, y: target.y } });
  }

  // --- враги
  const alive = state.bunker.structures.filter((s) => s.hp > 0);
  for (const e of night.enemies) {
    if (e.hp <= 0) continue;
    if (e.cooldown > 0) e.cooldown--;
    // цели: солдаты и постройки в радиусе атаки
    let target: { x: number; y: number; apply: (d: number) => void } | null = null;
    let bd = e.range;
    for (const s of night.soldiers) {
      const d = dist(e.x, e.y, s.x, s.y);
      if (d <= bd) { bd = d; target = { x: s.x, y: s.y, apply: (dmg) => { s.hp -= dmg; } }; }
    }
    for (const st of alive) {
      const p = structurePos(state, st);
      const d = dist(e.x, e.y, p.x, p.y);
      if (d <= bd) { bd = d; target = { x: p.x, y: p.y, apply: (dmg) => { st.hp -= dmg; } }; }
    }
    if (target) {
      if (e.cooldown === 0) {
        target.apply(e.damage);
        e.cooldown = e.cooldownTicks;
        if (e.range > 2) emit(state, { t: 'shot', by: 'enemy', from: { x: e.x, y: e.y }, to: { x: target.x, y: target.y } });
      }
      continue;
    }
    const next = e.path[e.pathIdx];
    if (next) {
      if (moveToward(e, next.x + 0.5, next.y + 0.5, e.speed)) e.pathIdx++;
    }
  }

  // --- смерти
  const survivorsE: Enemy[] = [];
  for (const e of night.enemies) {
    if (e.hp > 0) { survivorsE.push(e); continue; }
    night.stats.kills++;
    state.stats.kills++;
    addResources(state.treasury, e.loot);
    for (const [k, v] of Object.entries(e.loot)) {
      (night.stats.loot as Record<string, number>)[k] = ((night.stats.loot as Record<string, number>)[k] ?? 0) + (v ?? 0);
    }
    emit(state, { t: 'death', side: 'enemy', kind: e.kind, at: { x: e.x, y: e.y } });
  }
  night.enemies = survivorsE;

  const survivorsS: Soldier[] = [];
  for (const s of night.soldiers) {
    if (s.hp > 0) { survivorsS.push(s); continue; }
    night.stats.soldiersLost++;
    state.stats.soldiersLost++;
    state.stats.peopleLost++;
    state.bunker.army[s.kind]--;
    emit(state, { t: 'death', side: 'soldier', kind: s.kind, at: { x: s.x, y: s.y } });
  }
  night.soldiers = survivorsS;

  // --- разрушенные постройки
  const before = state.bunker.structures.length;
  state.bunker.structures = state.bunker.structures.filter((s) => {
    if (s.hp > 0 || s.kind === 'gate') return true;
    emit(state, { t: 'structureDestroyed', id: s.id });
    log(state, `!! Разрушено: ${s.id}`);
    return false;
  });
  if (state.bunker.structures.length !== before) night.pathVersion++;

  night.tick++;

  const gate = state.bunker.structures.find((s) => s.kind === 'gate');
  if (!gate || gate.hp <= 0) return 'breach';
  if (night.spawns.length === 0 && night.enemies.length === 0) return 'cleared';
  return 'ongoing';
}

function cheerMult(b: Balance): number {
  return b.commands['cheer']?.params['damageMult'] ?? 1.25;
}
function coffeeSpeed(b: Balance): number {
  return b.items.coffee.params['attackSpeed'] ?? 0.1;
}
