import type { Balance } from '../types/balance';
import type { GameState } from '../types/match';
import type { SoldierKind, UnitStats } from '../types/units';
import { cmdBalance, param } from './balance';

/** Уровень армии: каждые perLevel очков муштры (по умолчанию 100) дают +1 уровень. */
export function armyLevel(state: GameState, b: Balance): number {
  return Math.floor(state.bunker.army.drill / param(cmdBalance(b, 'drill'), 'perLevel'));
}

function levelMult(state: GameState, b: Balance): number {
  return 1 + armyLevel(state, b) * param(cmdBalance(b, 'drill'), 'levelBonus');
}

export function soldierBase(b: Balance, kind: SoldierKind): UnitStats {
  return b.units.soldiers[kind];
}

export function soldierMaxHp(state: GameState, b: Balance, kind: SoldierKind): number {
  return Math.round(soldierBase(b, kind).hp * (1 + state.bunker.army.healthBonus) * levelMult(state, b));
}

/** Урон солдата без временных баффов (клич командира добавляется в бою). */
export function soldierDamage(state: GameState, b: Balance, kind: SoldierKind): number {
  return soldierBase(b, kind).damage * (1 + state.bunker.army.damageBonus) * levelMult(state, b);
}
