import type { GameEvent } from '../protocol/events';
import type { GameState } from '../types/match';

export function emit(state: GameState, e: GameEvent): void {
  state.events.push(e);
}

export function log(state: GameState, text: string): void {
  state.events.push({ t: 'log', text });
}

/** Забрать накопленные события (сервер рассылает их игрокам, клиент выводит в консоль). */
export function drainEvents(state: GameState): GameEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}
