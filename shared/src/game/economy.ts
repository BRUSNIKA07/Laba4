import type { Balance } from '../types/balance';
import { CELL_PRODUCES } from '../types/bunker';
import type { GameState } from '../types/match';
import { totalPeople } from '../types/bunker';
import { addResources } from '../types/resources';
import { syncRoster } from './squads';
import { log } from './log';

/**
 * Добыча за одну секунду. Рабочие занимают клетки по порядку:
 * первые клетки получают рабочих первыми (по workersPerCell на клетку).
 */
export function produceOneSecond(state: GameState, b: Balance): void {
  const eco = b.economy;
  let workers = state.bunker.people.farmers;
  const boost = 1 + state.bunker.incomeBoost;
  for (const cell of state.bunker.cells) {
    if (cell.kind === 'empty' || workers <= 0) continue;
    const w = Math.min(eco.workersPerCell, workers);
    workers -= w;
    const res = CELL_PRODUCES[cell.kind];
    const amount = w * eco.production[cell.kind] * (1 + eco.cellLevelBonus * (cell.level - 1)) * boost;
    addResources(state.treasury, { [res]: amount });
  }
}

/** Кто чем занят: сколько клеток реально работает (для статистики). */
export function workedCells(state: GameState, b: Balance): number {
  const need = state.bunker.cells.filter((c) => c.kind !== 'empty').length;
  return Math.min(need, Math.ceil(state.bunker.people.farmers / b.economy.workersPerCell));
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
  for (const k of ['idle', 'farmers', 'recruits', 'scouts'] as const) {
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
