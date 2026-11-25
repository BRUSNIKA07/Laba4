import type { ResourceId } from './resources';
import type { TurretKind } from './units';

export type CellKind = 'empty' | 'farm' | 'lumber' | 'quarry' | 'mine';
/** Что производит каждая постройка фермера. Золото добывает только смотритель. */
export const CELL_PRODUCES: Record<Exclude<CellKind, 'empty'>, ResourceId> = {
  farm: 'food',
  lumber: 'wood',
  quarry: 'stone',
  mine: 'iron',
};
export const CELL_KINDS = ['farm', 'lumber', 'quarry', 'mine'] as const;

export interface Cell {
  kind: CellKind;
  level: number; // 1..maxLevel
}

/** Где сейчас находятся люди. Солдаты считаются отдельно (army). */
export type ProductionRoom = 'farm' | 'lumber' | 'quarry';
export const PRODUCTION_ROOMS = ['farm', 'lumber', 'quarry'] as const;
export function productionRoom(kind: CellKind): ProductionRoom | null {
  return kind === 'empty' ? null : kind === 'mine' ? 'quarry' : kind;
}

export interface People {
  builders: number; // закреплены за manager, пока отдыхают
  idle: number; // свободны в бункере
  farmers: number; // работают на клетках фермера
  recruits: number; // новобранцы у командира
  scouts: number; // резерв смотрителя для вылазок
  outside: number; // сейчас на вылазке
}

export interface Army {
  melee: number;
  ranged: number;
  drill: number; // очки муштры (каждые 100 = +1 уровень)
  damageBonus: number; // 0.5 = +50%
  healthBonus: number;
  damageUpgrades: number; // сколько раз покупали, влияет на цену
  healthUpgrades: number;
}

export type StructureKind = 'turret' | 'barricade' | 'gate';

export interface Structure {
  id: string; // 'gate', 't1', 'w1'...
  kind: StructureKind;
  turret?: TurretKind;
  level: number;
  hp: number;
  maxHp: number;
  slot: number; // номер слота на карте (у ворот 0)
  cooldown: number; // тики до следующего выстрела (только в бою)
}

export interface Bunker {
  cells: Cell[];
  workerTargets: Partial<Record<ProductionRoom, number>>;
  housingLevel: number;
  barracksLevel: number;
  people: People;
  army: Army;
  housing: number; // сколько людей вмещает бункер
  soldierCap: number; // сколько солдат вмещают казармы
  turretSlots: number; // сколько слотов под турели открыто
  structures: Structure[];
  nextStructureId: number;
  incomeBoost: number; // временная прибавка к добыче на текущий день
}

export function totalPeople(b: Bunker): number {
  const p = b.people;
  return p.idle + p.builders + p.farmers + p.recruits + p.scouts + p.outside + b.army.melee + b.army.ranged;
}
