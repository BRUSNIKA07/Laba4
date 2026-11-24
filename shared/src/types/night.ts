import type { EnemyKind, SoldierKind } from './units';
import type { ResourceCost } from './resources';

export interface Vec {
  x: number;
  y: number;
}

/** Типы клеток карты. Каждому типу в клиенте соответствует отдельный спрайт. */
export const TILE = { grass: 0, road: 1, tree: 2, rock: 3, bunker: 4 } as const;
export type TileId = (typeof TILE)[keyof typeof TILE];

export interface NightMap {
  width: number;
  height: number;
  tiles: number[]; // width*height, индекс = y*width + x
  road: Vec[]; // клетки дороги по порядку: от места появления врагов до ворот
  gate: Vec; // клетка ворот бункера
  soldierPosts: Vec[]; // где стоят солдаты
  turretSlots: Vec[]; // места под турели
  barricadeSlots: Vec[]; // места под баррикады (клетки дороги у ворот)
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  cooldownTicks: number;
  speed: number;
  cooldown: number;
  path: Vec[];
  pathIdx: number;
  pathVersion: number;
  loot: ResourceCost;
}

export interface Soldier {
  id: number;
  kind: SoldierKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  homeX: number;
  homeY: number;
  cooldown: number;
}

export interface FireZone {
  x: number;
  y: number;
  radius: number;
  dpsTick: number; // урон за тик
  ticksLeft: number;
}

export interface WaveSpawn {
  atTick: number; // тик ночи, когда появляется враг
  kind: EnemyKind;
}

export interface NightStats {
  kills: number;
  soldiersLost: number;
  loot: ResourceCost;
}

export interface NightState {
  tick: number; // тиков с начала ночи
  enemies: Enemy[];
  soldiers: Soldier[];
  fires: FireZone[];
  spawns: WaveSpawn[]; // очередь появления, отсортирована по atTick
  totalEnemies: number;
  waveStarts: number[]; // тики начала волн (для сообщений)
  waveAnnounced: number;
  nextId: number;
  pathVersion: number; // растёт, когда меняется проходимость (баррикада разрушена)
  cheerUntil: number; // тик ночи
  coffeeUntil: number;
  focusUntil: number;
  focus: EnemyKind | null;
  stats: NightStats;
}
