import type { GameState } from '../types/match';

/** Строгое большинство игроков: 1 из 1, 2 из 2, 3 из 4. */
export function majority(playerCount: number): number {
  return Math.floor(playerCount / 2) + 1;
}

export function endDayVoteReached(state: GameState): boolean {
  return Object.keys(state.votes.endDay).length >= majority(state.players.length);
}

/** Номер награды (1..n), набравшей большинство, или null. */
export function rewardVoteWinner(state: GameState): number | null {
  const counts = new Map<number, number>();
  for (const opt of Object.values(state.votes.reward)) counts.set(opt, (counts.get(opt) ?? 0) + 1);
  for (const [opt, n] of counts) if (n >= majority(state.players.length)) return opt;
  return null;
}

export function resetVotes(state: GameState): void {
  state.votes = { endDay: {}, reward: {} };
}
