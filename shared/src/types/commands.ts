import type { Role } from './roles';

/** Результат выполнения консольной команды. */
export interface CommandResult {
  ok: boolean;
  lines: string[];
}

export type CommandPhase = 'day' | 'night' | 'both';

export type ArgValue = string | number;
export type CommandArgs = Record<string, ArgValue>;

export interface CommandSpec {
  id: string; // ключ для баланса и кулдаунов, например 'repair.gates'
  patterns: string[]; // например ['send <n:int> people to <target:word>']
  usage: string; // подсказка в легенде
  description: string;
  roles: Role[] | 'any';
  phase: CommandPhase;
}
