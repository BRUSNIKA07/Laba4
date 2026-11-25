import type { Balance } from '../types/balance';
import type { CommandResult } from '../types/commands';
import type { GameState } from '../types/match';
import { fail, type Handler } from './handlers/common';
import { battleList, battleOrder } from './handlers/battle';
import * as cmd from './handlers/commander';
import * as farm from './handlers/farmer';
import * as info from './handlers/info';
import * as mgr from './handlers/manager';
import * as war from './handlers/warden';
import { parseCommand } from './parser';
import { COMMANDS } from './registry';

/** id команды из registry.ts -> функция, которая её выполняет. */
const HANDLERS: Record<string, Handler> = {
  'battle.list': battleList, 'battle.order': battleOrder,
  help: info.help, status: info.status, people: info.people, cells: info.cells, inv: info.inv,
  'vote.end': info.voteEnd, reward: info.reward,
  drill: cmd.drill, 'train.melee': cmd.trainMelee, 'train.ranged': cmd.trainRanged,
  'upgrade.damage': cmd.upgradeDamage, 'upgrade.health': cmd.upgradeHealth, cheer: cmd.cheer, focus: cmd.focus,
  'workers.assign': farm.assignWorkers, 'workers.auto': farm.autoWorkers,
  'cell.build': farm.cellBuild, 'cell.upgrade': farm.cellUpgrade, heal: farm.heal,
  send: mgr.send, recall: mgr.recall,
  'build.barracks': mgr.buildBarracks, 'build.housing': mgr.buildHousing, 'build.farmroom': mgr.buildFarmroom,
  'build.turret': mgr.buildTurret, 'build.wall': mgr.buildWall, 'expand.defense': mgr.expandDefense,
  'repair.turrets': mgr.repairTurrets, 'repair.gate': mgr.repairGate, 'repair.walls': mgr.repairWalls, 'repair.one': mgr.repairOne,
  'upgrade.gate': mgr.upgradeGate, 'upgrade.turret': mgr.upgradeTurret,
  'sortie.go': war.sortieGo, 'sortie.push': war.sortiePush, 'sortie.home': war.sortieBack,
  use: war.use, drop: war.drop,
};

/** Проверка на старте: у каждой команды есть обработчик и запись в балансе. */
export function checkRegistry(b: Balance): string[] {
  const problems: string[] = [];
  for (const spec of COMMANDS) {
    if (!HANDLERS[spec.id]) problems.push(`нет обработчика для ${spec.id}`);
    if (spec.id !== 'help' && spec.id !== 'status' && spec.id !== 'people' && spec.id !== 'cells' && spec.id !== 'inv'
      && spec.id !== 'vote.end' && spec.id !== 'reward' && !b.commands[spec.id]) problems.push(`нет записи в commands.json для ${spec.id}`);
  }
  return problems;
}

/**
 * Главная точка входа консоли: строка игрока -> результат.
 * Порядок проверок: разбор, фаза, роль, пауза, сам обработчик.
 * Пауза включается только если команда сработала.
 */
export function executeCommand(state: GameState, b: Balance, playerId: string, line: string): CommandResult {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return fail('Неизвестный игрок.');

  const parsed = parseCommand(line, COMMANDS);
  if (!parsed.ok) {
    if (!parsed.error) return { ok: false, lines: [] };
    return fail(parsed.error, ...parsed.hints.map((h) => `  ${h}`));
  }
  const { spec, args } = parsed.cmd;

  if (state.phase === 'gameover') return fail('Игра окончена.');
  if (spec.phase === 'day' && state.phase !== 'day') return fail('Эта команда работает только днём.');
  if (spec.phase === 'night' && state.phase !== 'night') return fail('Эта команда работает только ночью.');
  if (spec.roles !== 'any' && !spec.roles.some((r) => player.roles.includes(r))) {
    return fail(`Эта команда для роли: ${spec.roles.join(' / ')}. У вас: ${player.roles.join(', ')}.`);
  }

  const cfg = b.commands[spec.id] ?? { cooldownSec: 0, cost: {}, params: {} };
  const left = (state.cooldowns[spec.id] ?? 0) - state.tick;
  if (left > 0) return fail(`Перезарядка: ещё ${Math.ceil(left / b.economy.tickRate)} с.`);

  const handler = HANDLERS[spec.id]!;
  const result = handler({ state, b, player, cfg }, args);
  if (result.ok && cfg.cooldownSec > 0) state.cooldowns[spec.id] = state.tick + Math.round(cfg.cooldownSec * b.economy.tickRate);
  return result;
}

