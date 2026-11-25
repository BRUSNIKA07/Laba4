import type { Balance } from '../types/balance';
import { CELL_PRODUCES, PRODUCTION_ROOMS, productionRoom, totalPeople, type Cell, type ProductionRoom } from '../types/bunker';
import type { GameState } from '../types/match';
import { addResources, emptyResources, type Resources } from '../types/resources';
import { syncRoster } from './squads';
import { log } from './log';

export function cellCapacity(cell: Cell, b: Balance): number {
  return cell.kind === 'empty' ? 0 : b.economy.workersPerCell + (cell.level - 1) * b.economy.workersPerCellLevelBonus;
}

export function roomCapacity(state: GameState, b: Balance, room: ProductionRoom): number {
  return state.bunker.cells.reduce((n,c) => n + (productionRoom(c.kind) === room ? cellCapacity(c,b) : 0), 0);
}

/** Ручные назначения имеют приоритет. Остальные рабочие распределяются по свободным модулям в порядке клеток. */
export function workerAllocation(state: GameState, b: Balance): number[] {
  const bk = state.bunker;
  const counts = bk.cells.map(() => 0);
  let left = bk.people.farmers;
  for (const room of PRODUCTION_ROOMS) {
    const target = bk.workerTargets[room];
    if (target === undefined) continue;
    let want = Math.min(target, left);
    bk.cells.forEach((c,i) => {
      if (productionRoom(c.kind) !== room) return;
      const n = Math.min(want, cellCapacity(c,b));
      counts[i] = n; want -= n; left -= n;
    });
  }
  bk.cells.forEach((c,i) => {
    const room = productionRoom(c.kind);
    if (!room || bk.workerTargets[room] !== undefined) return;
    const n = Math.min(left, cellCapacity(c,b));
    counts[i] = n; left -= n;
  });
  return counts;
}

export interface DailyModule { index: number; room: ProductionRoom; workers: number; capacity: number; income: Resources }
export function dailyModules(state: GameState, b: Balance): DailyModule[] {
  const counts = workerAllocation(state,b);
  return state.bunker.cells.flatMap((cell,index) => {
    if (cell.kind === 'empty') return [];
    const room = productionRoom(cell.kind)!;
    const workers = counts[index] ?? 0;
    const factor = workers * (1 + b.economy.cellLevelBonus * (cell.level - 1)) * (1 + state.bunker.incomeBoost);
    const income = emptyResources();
    income[CELL_PRODUCES[cell.kind]] = factor * b.economy.production[cell.kind];
    if (cell.kind === 'quarry') income.iron += factor * b.economy.quarryIronPerWorker;
    return [{index, room, workers, capacity:cellCapacity(cell,b), income}];
  });
}
export function dailyProduction(state: GameState, b: Balance): Resources {
  const income = emptyResources();
  for (const m of dailyModules(state,b)) addResources(income,m.income);
  return income;
}
export function workedCells(state: GameState, b: Balance): number {
  return workerAllocation(state,b).filter(n => n > 0).length;
}

/** Люди едят в конце дня. Возвращает, сколько человек погибло от голода. */
export function consumeFood(state: GameState, b: Balance): { eaten: number; starved: number } {
  const per = b.economy.foodPerPersonPerDay;
  const need = Math.ceil(totalPeople(state.bunker) * per);
  const have = state.treasury.food;
  if (have >= need) {
    state.treasury.food = have - need;
    return { eaten: need, starved: 0 };
  }
  state.treasury.food = 0;
  let toDie = Math.ceil((need - have) / per);
  const starved = Math.min(toDie, totalPeople(state.bunker));
  const p = state.bunker.people;
  for (const k of ['idle', 'builders', 'farmers', 'recruits', 'scouts'] as const) {
    const d = Math.min(p[k], toDie);
    p[k] -= d;
    toDie -= d;
  }
  // солдат голод косит в последнюю очередь
  for (const k of ['ranged', 'melee'] as const) {
    const d = Math.min(state.bunker.army[k], toDie);
    state.bunker.army[k] -= d;
    toDie -= d;
  }
  syncRoster(state);
  state.stats.peopleLost += starved;
  log(state, `!! Голод: погибло людей — ${starved}`);
  return { eaten: have, starved };
}
