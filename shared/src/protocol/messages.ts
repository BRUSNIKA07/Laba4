import type { CommandResult } from '../types/commands';
import type { Role } from '../types/roles';

/**
 * Сообщения между клиентами и хостом. Пока только игровая часть;
 * лобби, чат и аккаунты добавятся на этапе сервера.
 */
export type ClientMessage =
  | { t: 'command'; line: string } // строка консоли
  | { t: 'chat'; text: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'pickRoles'; roles: Role[] };

export type ServerMessage =
  | { t: 'commandResult'; line: string; result: CommandResult }
  | { t: 'chat'; from: string; text: string; at: number }
  | { t: 'error'; message: string };
