import { cmdBalance } from '../../game/balance';
import type { Balance, CommandBalance } from '../../types/balance';
import type { CommandArgs, CommandResult } from '../../types/commands';
import type { GameState } from '../../types/match';
import { canAfford, formatCost, pay, type ResourceCost } from '../../types/resources';
import type { PlayerInfo, Role } from '../../types/roles';

export interface CmdCtx {
  state: GameState;
  b: Balance;
  player: PlayerInfo;
  /** Баланс текущей команды (стоимость, пауза, параметры). */
  cfg: CommandBalance;
}

export type Handler = (ctx: CmdCtx, args: CommandArgs) => CommandResult;

export const fail = (...lines: string[]): CommandResult => ({ ok: false, lines });
export const done = (...lines: string[]): CommandResult => ({ ok: true, lines });

/** Списывает стоимость или возвращает текст ошибки. */
export function tryPay(ctx: CmdCtx, cost: ResourceCost): string | null {
  if (!canAfford(ctx.state.treasury, cost)) {
    return `Не хватает ресурсов. Нужно: ${formatCost(cost)}.`;
  }
  pay(ctx.state.treasury, cost);
  return null;
}

export function cfgOf(ctx: CmdCtx, id: string): CommandBalance {
  return cmdBalance(ctx.b, id);
}

export type PoolRole = Role;
export const POOL_OF: Record<PoolRole, 'farmers' | 'recruits' | 'scouts' | 'builders'> = {
  farmer: 'farmers',
  commander: 'recruits',
  warden: 'scouts',
  manager: 'builders',
};
const POOL_ROLES: PoolRole[] = ['farmer', 'commander', 'manager', 'warden'];

/**
 * Цель команды send/recall: название роли или имя игрока.
 * Имя игрока работает, только если у него ровно одна подходящая роль
 * (при игре вдвоём у человека их две, тогда нужно писать роль).
 */
export function resolveTarget(state: GameState, token: string): { role: PoolRole } | { error: string } {
  if ((POOL_ROLES as string[]).includes(token)) return { role: token as PoolRole };
  const player = state.players.find((p) => p.name.toLowerCase() === token);
  if (!player) return { error: `Нет роли или игрока "${token}". Роли: farmer, commander, manager, warden.` };
  const mine = player.roles.filter((r): r is PoolRole => (POOL_ROLES as Role[]).includes(r));
  if (mine.length === 1) return { role: mine[0]! };
  if (mine.length === 0) return { error: `У игрока ${player.name} нет роли, куда можно отправить людей.` };
  return { error: `У игрока ${player.name} несколько ролей (${mine.join(', ')}), укажите роль.` };
}
