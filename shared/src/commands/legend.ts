import { ROLES, ROLE_TITLES, type Role } from '../types/roles';
import type { CommandPhase, CommandSpec } from '../types/commands';
import { COMMANDS } from './registry';

export interface LegendEntry {
  usage: string;
  description: string;
  phase: CommandPhase;
}
export interface LegendSection {
  title: string;
  role: Role | 'any';
  entries: LegendEntry[];
}

const PHASE_RU: Record<CommandPhase, string> = { day: 'день', night: 'ночь', both: 'всегда' };
export const phaseLabel = (p: CommandPhase): string => PHASE_RU[p];

const toEntry = (s: CommandSpec): LegendEntry => ({ usage: s.usage, description: s.description, phase: s.phase });

/**
 * Данные для окна-легенды. Сначала секции ролей игрока, затем общие команды.
 * Можно передать все роли (покажет всё) или только роли конкретного игрока.
 */
export function buildLegend(roles: readonly Role[] = ROLES): LegendSection[] {
  const sections: LegendSection[] = [];
  for (const role of ROLES) {
    if (!roles.includes(role)) continue;
    const entries = COMMANDS.filter((c) => c.roles !== 'any' && c.roles.includes(role)).map(toEntry);
    sections.push({ title: ROLE_TITLES[role], role, entries });
  }
  sections.push({ title: 'Общие команды', role: 'any', entries: COMMANDS.filter((c) => c.roles === 'any').map(toEntry) });
  return sections;
}
