import type { Balance } from '../types/balance';
import type { GameState } from '../types/match';
import { totalPeople } from '../types/bunker';
import { formatCost } from '../types/resources';
import { consumeFood, produceOneSecond } from './economy';
import { emit, log } from './log';
import { startNight, tickNight } from './night';
import { randInt } from './rng';
import { applyReward, offerRewards, rewardById } from './rewards';
import { sortieHome, sortieSecond } from './sortie';
import { endDayVoteReached, resetVotes, rewardVoteWinner } from './vote';

/** Выбор награды (по голосованию или автоматически, когда день кончился). */
export function chooseReward(state: GameState, b: Balance, option: number): void {
  const id = state.rewardOffer?.[option - 1];
  if (!id) return;
  applyReward(state, b, rewardById(b, id));
  state.rewardOffer = null;
  state.votes.reward = {};
}

function gameOver(state: GameState, reason: string): void {
  state.phase = 'gameover';
  state.gameOverReason = reason;
  state.night = null;
  log(state, `#### КОНЕЦ ИГРЫ: ${reason}. Прожито дней: ${state.day}.`);
  emit(state, { t: 'phase', phase: 'gameover', day: state.day });
}

function beginNight(state: GameState, b: Balance): void {
  if (state.sortie) sortieHome(state, b, true);
  if (state.rewardOffer) {
    log(state, 'Награда не выбрана — взят вариант 1.');
    chooseReward(state, b, 1);
  }
  const food = consumeFood(state, b);
  log(state, `-- Итоги дня ${state.day}: съедено еды ${food.eaten}, погибло от голода ${food.starved}.`);
  state.bunker.incomeBoost = 0;
  resetVotes(state);
  if (totalPeople(state.bunker) <= 0) return gameOver(state, 'В бункере никого не осталось');

  state.phase = 'night';
  state.phaseTick = 0;
  startNight(state, b);
  log(state, `== Ночь ${state.day}. Враги идут к воротам.`);
  emit(state, { t: 'phase', phase: 'night', day: state.day });
}

function endNight(state: GameState, b: Balance): void {
  const n = state.night!;
  const survivedDay = state.day;
  const [lo, hi] = b.economy.immigrationPerNight;
  const room = Math.max(0, Math.min(state.bunker.housing, b.economy.maxPeople) - totalPeople(state.bunker));
  const newcomers = Math.min(room, randInt(state, lo, hi));
  state.bunker.people.idle += newcomers;

  state.summary = {
    night: survivedDay,
    kills: n.stats.kills,
    soldiersLost: n.stats.soldiersLost,
    loot: { ...n.stats.loot },
    newcomers,
  };
  state.night = null;
  state.day++;
  state.phase = 'day';
  state.phaseTick = 0;
  resetVotes(state);
  offerRewards(state, b);

  log(state, `== Рассвет. Ночь ${survivedDay} пережита: убито ${n.stats.kills}, потеряно солдат ${n.stats.soldiersLost}, трофеи: ${formatCost(n.stats.loot)}.`);
  if (newcomers > 0) log(state, `К бункеру пришли выжившие: ${newcomers}.`);
  log(state, `== День ${state.day}. Выберите награду: reward 1, 2 или 3.`);
  emit(state, { t: 'phase', phase: 'day', day: state.day });
}

/**
 * Один тик игры (по умолчанию 10 в секунду). Меняет state на месте.
 * Сервер вызывает его по таймеру, соло-клиент — тоже; логика одна и та же.
 */
export function step(state: GameState, b: Balance): void {
  if (state.phase === 'gameover') return;
  state.tick++;
  state.phaseTick++;

  if (state.phase === 'day') {
    if (state.phaseTick % b.economy.tickRate === 0) {
      produceOneSecond(state, b);
      sortieSecond(state, b);
    }
    if (state.rewardOffer) {
      const win = rewardVoteWinner(state);
      if (win !== null) chooseReward(state, b, win);
    }
    const voted = !state.rewardOffer && endDayVoteReached(state);
    if (voted || state.phaseTick >= b.economy.dayTicks) beginNight(state, b);
    return;
  }

  // ночь
  const out = tickNight(state, b);
  if (out === 'breach') gameOver(state, 'Ворота бункера разрушены');
  else if (out === 'cleared') endNight(state, b);
}
