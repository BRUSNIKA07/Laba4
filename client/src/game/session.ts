import {
  createGame, drainEvents, executeCommand, step,
  type Balance, type CommandResult, type GameEvent, type GameState, type PlayerInfo,
} from '@outpost/shared';
import { loadBalance } from './balance';

/**
 * Соло-партия на локальном ядре (без сети).
 * Потом сюда добавится сетевая сессия с тем же интерфейсом: run() и tick().
 */
export class SoloSession {
  readonly b: Balance;
  readonly state: GameState;

  constructor(readonly me: PlayerInfo, seed: number = Date.now() % 1_000_000) {
    this.b = loadBalance();
    this.state = createGame(this.b, { seed, players: [me] });
  }

  /** Один тик игры; возвращает накопившиеся события. */
  tick(): GameEvent[] {
    step(this.state, this.b);
    return drainEvents(this.state);
  }

  run(line: string): { result: CommandResult; events: GameEvent[] } {
    const result = executeCommand(this.state, this.b, this.me.id, line);
    return { result, events: drainEvents(this.state) };
  }

  /** Забрать события без тика (например, стартовые сообщения). */
  flush(): GameEvent[] {
    return drainEvents(this.state);
  }
}
