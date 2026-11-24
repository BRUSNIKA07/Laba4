// Роли игроков. Названия используются и в коде, и в консольных командах.
export const ROLES = ['commander', 'farmer', 'manager', 'warden'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_TITLES: Record<Role, string> = {
  commander: 'Командир (оружейник)',
  farmer: 'Фермер (добытчик)',
  manager: 'Менеджер (строитель)',
  warden: 'Смотритель',
};

/** Допустимое число игроков в партии. */
export const PLAYER_COUNTS = [1, 2, 4] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

/** Фиксированные пары ролей для партии на двоих. */
export const DUO_PAIRS: readonly (readonly Role[])[] = [
  ['commander', 'farmer'],
  ['manager', 'warden'],
];

export interface PlayerInfo {
  id: string;
  name: string;
  roles: Role[];
}

export type RoleAssignment = Record<string, Role[]>; // playerId -> роли

/**
 * Проверка распределения ролей перед стартом партии.
 * Возвращает текст ошибки или null, если всё корректно.
 * Правила: игроков 1, 2 или 4; каждая роль ровно у одного игрока;
 * у каждого поровну ролей; при двоих — только фиксированные пары.
 */
export function validateRoleAssignment(
  playerIds: string[],
  assignment: RoleAssignment,
): string | null {
  const n = playerIds.length;
  if (!(PLAYER_COUNTS as readonly number[]).includes(n)) {
    return 'Играть можно только вдвоём, вчетвером или одному';
  }
  const owners = new Map<Role, string>();
  for (const id of playerIds) {
    const roles = assignment[id] ?? [];
    if (roles.length !== ROLES.length / n) {
      return `У каждого игрока должно быть ролей: ${ROLES.length / n}`;
    }
    for (const r of roles) {
      if (!ROLES.includes(r)) return `Неизвестная роль: ${String(r)}`;
      if (owners.has(r)) return `Роль ${r} выбрали сразу двое, нужно договориться`;
      owners.set(r, id);
    }
  }
  if (owners.size !== ROLES.length) return 'Не все роли заняты';
  if (n === 2) {
    for (const id of playerIds) {
      const mine = assignment[id] ?? [];
      const ok = DUO_PAIRS.some((pair) => pair.every((r) => mine.includes(r)));
      if (!ok) return 'Вдвоём роли делятся парами: командир+фермер и менеджер+смотритель';
    }
  }
  return null;
}
