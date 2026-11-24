import { ITEM_IDS } from '../types/items';
import type { Balance, CommandBalance } from '../types/balance';

/** Файлы баланса целиком (как лежат в shared/balance/*.json). */
export interface RawBalance {
  units: unknown;
  items: unknown;
  commands: unknown;
  waves: unknown;
  economy: unknown;
  rewards: unknown;
  sortie: unknown;
  map: unknown;
}

function isObj(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Ошибка баланса: ${msg}`);
}

function needNumbers(obj: unknown, path: string, keys: string[]): void {
  need(isObj(obj), `${path} должен быть объектом`);
  for (const k of keys) need(typeof obj[k] === 'number' && Number.isFinite(obj[k]), `${path}.${k} должно быть числом`);
}

/**
 * Проверяет JSON баланса и приводит его к типу Balance.
 * Бросает понятную ошибку, если чего-то не хватает: так опечатка в JSON
 * не превратится в странный баг посреди игры.
 */
export function parseBalance(raw: RawBalance): Balance {
  const units = raw.units as any;
  need(isObj(units), 'units.json');
  for (const k of ['melee', 'ranged']) needNumbers(units.soldiers?.[k], `units.soldiers.${k}`, ['hp', 'damage', 'range', 'cooldownTicks', 'speed']);
  for (const k of ['grunt', 'spitter']) {
    needNumbers(units.enemies?.[k], `units.enemies.${k}`, ['hp', 'damage', 'range', 'cooldownTicks', 'speed']);
    need(isObj(units.enemies[k].loot), `units.enemies.${k}.loot`);
  }
  for (const k of ['basic', 'rapid', 'heavy']) needNumbers(units.turrets?.[k], `units.turrets.${k}`, ['hp', 'damage', 'range', 'cooldownTicks']);
  needNumbers(units.gate, 'units.gate', ['hp']);
  needNumbers(units.barricade, 'units.barricade', ['hp']);

  need(isObj(raw.items), 'items.json');
  for (const id of ITEM_IDS) {
    const it = (raw.items as any)[id];
    needNumbers(it, `items.${id}`, ['cooldownSec', 'maxStack']);
    need(isObj(it.params), `items.${id}.params`);
  }

  need(isObj(raw.commands), 'commands.json');
  const commands: Record<string, CommandBalance> = {};
  for (const [id, c] of Object.entries(raw.commands as Record<string, any>)) {
    need(isObj(c), `commands.${id}`);
    commands[id] = { cooldownSec: c.cooldownSec ?? 0, cost: c.cost ?? {}, params: c.params ?? {} };
  }

  needNumbers(raw.waves, 'waves', [
    'wavesPerNight', 'countGrowthPerDay', 'spitterShareBase', 'spitterSharePerDay', 'spitterShareMax',
    'spawnIntervalTicks', 'waveGapTicks', 'firstWaveDelayTicks', 'hpPerDay', 'damagePerDay',
  ]);
  need(Array.isArray((raw.waves as any).baseCounts) && (raw.waves as any).baseCounts.length >= (raw.waves as any).wavesPerNight, 'waves.baseCounts короче, чем wavesPerNight');

  const eco = raw.economy as any;
  needNumbers(eco, 'economy', [
    'tickRate', 'dayTicks', 'cellCount', 'workersPerCell', 'cellLevelBonus', 'foodPerPersonPerDay',
    'baseHousing', 'baseSoldierCap', 'maxPeople', 'startTurretSlots',
  ]);
  need(eco.startCells.length <= eco.cellCount, 'economy.startCells больше, чем cellCount');
  need(Array.isArray(eco.immigrationPerNight) && eco.immigrationPerNight.length === 2, 'economy.immigrationPerNight');

  need(Array.isArray(raw.rewards) && raw.rewards.length >= 3, 'rewards.json: нужно минимум 3 награды');
  needNumbers(raw.sortie, 'sortie', ['maxPeople', 'maxDepth', 'findChancePerSec', 'goldChance', 'goldBase', 'itemChancePerDepth', 'deathChancePerDepth', 'depthLootGrowth']);
  needNumbers(raw.map, 'map', ['width', 'height', 'treeChance', 'rockChance']);
  need((raw.map as any).width >= 32 && (raw.map as any).height >= 16, 'map: минимум 32x16 клеток');

  return {
    units: raw.units as Balance['units'],
    items: raw.items as Balance['items'],
    commands,
    waves: raw.waves as Balance['waves'],
    economy: eco as Balance['economy'],
    rewards: raw.rewards as Balance['rewards'],
    sortie: raw.sortie as Balance['sortie'],
    map: raw.map as Balance['map'],
  };
}

/** Параметры команды; бросает ошибку, если команда не описана в commands.json. */
export function cmdBalance(b: Balance, id: string): CommandBalance {
  const c = b.commands[id];
  if (!c) throw new Error(`В commands.json нет записи для команды "${id}"`);
  return c;
}

export function param(c: CommandBalance, key: string): number {
  const v = c.params[key];
  if (v === undefined) throw new Error(`В commands.json нет параметра "${key}"`);
  return v;
}
