import type { Bunker } from './bunker';
import type { Inventory } from './items';
import type { NightMap, NightState } from './night';
import type { PlayerInfo } from './roles';
import type { ResourceCost, Resources } from './resources';
import type { GameEvent } from '../protocol/events';
import type { ItemId } from './items';

export type Phase = 'day' | 'night' | 'gameover';

export interface Sortie {
  people: number;
  depth: number; // 1..maxDepth, глубже — больше добыча и риск
  loot: ResourceCost;
  items: { item: ItemId; qty: number }[];
  lost: number;
  secondsOut: number;
}

export interface NightSummary {
  night: number;
  kills: number;
  soldiersLost: number;
  loot: ResourceCost;
  newcomers: number;
}

export interface Votes {
  endDay: Record<string, true>; // playerId -> проголосовал за конец дня
  reward: Record<string, number>; // playerId -> номер награды (1..3)
}

export interface GameStats {
  kills: number;
  soldiersLost: number;
  peopleLost: number;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number; // текущее состояние генератора случайных чисел
  tick: number; // общий счётчик тиков партии
  day: number; // номер дня, начиная с 1
  phase: Phase;
  phaseTick: number; // тиков в текущей фазе
  players: PlayerInfo[];
  treasury: Resources;
  bunker: Bunker;
  map: NightMap;
  night: NightState | null;
  inventory: Inventory;
  sortie: Sortie | null;
  cooldowns: Record<string, number>; // id команды -> общий тик, когда снова доступна
  votes: Votes;
  rewardOffer: string[] | null; // id наград, из которых надо выбрать
  summary: NightSummary | null;
  gameOverReason: string | null;
  stats: GameStats;
  events: GameEvent[]; // очередь событий; её забирает drainEvents()
}
