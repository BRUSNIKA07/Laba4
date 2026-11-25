import type { Balance, RewardDef } from '../types/balance';
import type { GameState } from '../types/match';
import { addResources } from '../types/resources';
import { totalPeople } from '../types/bunker';
import { addItem } from './inventory';
import { log } from './log';
import { shuffled } from './rng';

export function offerRewards(state: GameState, b: Balance): void {
  state.rewardOffer = shuffled(state, b.rewards).slice(0, 3).map((r) => r.id);
}

export function rewardById(b: Balance, id: string): RewardDef {
  const r = b.rewards.find((x) => x.id === id);
  if (!r) throw new Error(`Нет награды ${id}`);
  return r;
}

export function applyReward(state: GameState, b: Balance, r: RewardDef): void {
  const e = r.effect;
  const bk = state.bunker;
  switch (e.type) {
    case 'resources': addResources(state.treasury, e.gain); break;
    case 'incomeBoost': bk.incomeBoost += e.mult; break;
    case 'housing': bk.housing += e.amount; break;
    case 'soldierCap': bk.soldierCap += e.amount; break;
    case 'cells':
      for (let i = 0; i < e.amount && bk.cells.length < b.economy.cellCount; i++) bk.cells.push({ kind: 'empty', level: 1 });
      break;
    case 'turretSlot': bk.turretSlots = Math.min(state.map.turretSlots.length, bk.turretSlots + e.amount); break;
    case 'people': {
      const room = Math.max(0, Math.min(bk.housing, b.economy.maxPeople) - totalPeople(bk));
      bk.people.idle += Math.min(room, e.amount);
      break;
    }
    case 'item': addItem(state.inventory, b, e.item, e.qty); break;
  }
  log(state, `** Награда выбрана: ${r.text}`);
}
