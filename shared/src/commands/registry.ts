import type { CommandSpec } from '../types/commands';

/**
 * Список всех консольных команд. Числа (цены, паузы) здесь не живут:
 * они в shared/balance/commands.json под тем же id.
 * Порядок важен: конкретные шаблоны стоят выше общих (repair gate выше repair <id>).
 */
export const COMMANDS: readonly CommandSpec[] = [
  // ---------- общие
  { id: 'help', patterns: ['help', 'help <cmd:word>'], usage: 'help [команда]', description: 'Список команд или справка по одной', roles: 'any', phase: 'both' },
  { id: 'status', patterns: ['status'], usage: 'status', description: 'Сводка: день, ресурсы, люди, постройки', roles: 'any', phase: 'both' },
  { id: 'people', patterns: ['people'], usage: 'people', description: 'Где сейчас находятся люди', roles: 'any', phase: 'both' },
  { id: 'cells', patterns: ['cells'], usage: 'cells', description: 'Клетки ферм и шахт', roles: 'any', phase: 'both' },
  { id: 'inv', patterns: ['inv'], usage: 'inv', description: 'Инвентарь смотрителя (4 клетки)', roles: 'any', phase: 'both' },
  { id: 'vote.end', patterns: ['vote end'], usage: 'vote end', description: 'Голос за окончание дня', roles: 'any', phase: 'day' },
  { id: 'reward', patterns: ['reward <n:int>'], usage: 'reward <1-3>', description: 'Голос за награду после ночи', roles: 'any', phase: 'day' },

  { id: 'battle.list', patterns: ['battle list'], usage: 'battle list', description: 'Позывные, отряды, здоровье и секторы бойцов', roles: 'any', phase: 'night' },

  { id: 'battle.order', patterns: ['battle <target:word> <action:word>'], usage: 'battle <позывной|squad|all|melee|ranged|роль> <A1-H8|auto|hold|retreat>', description: 'Боевой приказ доступным бойцам; all только commander', roles: 'any', phase: 'night' },

  // ---------- командир
  { id: 'drill', patterns: ['drill'], usage: 'drill', description: 'Муштра: +1 очко, каждые 100 очков армия получает уровень', roles: ['commander'], phase: 'day' },
  { id: 'train.melee', patterns: ['train melee <n:int>'], usage: 'train melee <n>', description: 'Обучить новобранцев в ближники', roles: ['commander'], phase: 'day' },
  { id: 'train.ranged', patterns: ['train ranged <n:int>'], usage: 'train ranged <n>', description: 'Обучить новобранцев в стрелки', roles: ['commander'], phase: 'day' },
  { id: 'upgrade.damage', patterns: ['upgrade damage'], usage: 'upgrade damage', description: 'Особое улучшение: урон армии (за золото)', roles: ['commander'], phase: 'day' },
  { id: 'upgrade.health', patterns: ['upgrade health'], usage: 'upgrade health', description: 'Особое улучшение: здоровье армии (за золото)', roles: ['commander'], phase: 'day' },
  { id: 'cheer', patterns: ['cheer'], usage: 'cheer', description: 'Клич: армия бьёт сильнее несколько секунд', roles: ['commander'], phase: 'night' },
  { id: 'focus', patterns: ['focus <kind:melee|ranged>'], usage: 'focus <melee|ranged>', description: 'Приказ: бить в первую очередь ближников или стрелков врага', roles: ['commander'], phase: 'night' },

  // ---------- фермер
  { id: 'cell.build', patterns: ['build <kind:farm|lumber|quarry|mine> <cell:int>'], usage: 'build <farm|lumber|quarry|mine> <клетка>', description: 'Построить ферму, лесопилку, каменоломню или шахту в клетке', roles: ['farmer'], phase: 'day' },
  { id: 'cell.upgrade', patterns: ['upgrade cell <cell:int>'], usage: 'upgrade cell <клетка>', description: 'Улучшить постройку в клетке', roles: ['farmer'], phase: 'day' },
  { id: 'heal', patterns: ['heal'], usage: 'heal', description: 'Вылечить самого раненого солдата (тратит еду)', roles: ['farmer'], phase: 'night' },

  // ---------- менеджер
  { id: 'send', patterns: ['send <n:int> people to <target:word>'], usage: 'send <n> people to <роль|игрок>', description: 'Отправить свободных людей к фермеру, командиру или смотрителю', roles: ['manager'], phase: 'day' },
  { id: 'recall', patterns: ['recall <n:int> people from <target:word>'], usage: 'recall <n> people from <роль|игрок>', description: 'Вернуть людей обратно в свободные', roles: ['manager'], phase: 'day' },
  { id: 'build.barracks', patterns: ['build barracks'], usage: 'build barracks', description: 'Казарма: больше мест для солдат', roles: ['manager'], phase: 'day' },
  { id: 'build.housing', patterns: ['build housing'], usage: 'build housing', description: 'Жилой блок: больше мест для людей', roles: ['manager'], phase: 'day' },
  { id: 'build.farmroom', patterns: ['build farmroom'], usage: 'build farmroom', description: 'Новый отсек: больше клеток для фермера', roles: ['manager'], phase: 'day' },
  { id: 'build.turret', patterns: ['build turret [<type:basic|rapid|heavy>]'], usage: 'build turret [basic|rapid|heavy]', description: 'Построить турель в свободном слоте', roles: ['manager'], phase: 'day' },
  { id: 'build.wall', patterns: ['build wall'], usage: 'build wall', description: 'Баррикада на дороге перед воротами', roles: ['manager'], phase: 'day' },
  { id: 'expand.defense', patterns: ['expand defense'], usage: 'expand defense', description: 'Открыть ещё один слот под турель', roles: ['manager'], phase: 'day' },
  { id: 'repair.turrets', patterns: ['repair all turrets'], usage: 'repair all turrets', description: 'Починить все турели', roles: ['manager'], phase: 'both' },
  { id: 'repair.gate', patterns: ['repair gate', 'repair gates'], usage: 'repair gates', description: 'Починить ворота', roles: ['manager'], phase: 'both' },
  { id: 'repair.walls', patterns: ['repair walls'], usage: 'repair walls', description: 'Починить баррикады', roles: ['manager'], phase: 'both' },
  { id: 'repair.one', patterns: ['repair <id:word>'], usage: 'repair <id>', description: 'Починить одну постройку по номеру (t1, w1)', roles: ['manager'], phase: 'both' },
  { id: 'upgrade.gate', patterns: ['upgrade gate'], usage: 'upgrade gate', description: 'Укрепить ворота: больше прочности', roles: ['manager'], phase: 'day' },
  { id: 'upgrade.turret', patterns: ['upgrade turret <id:word>'], usage: 'upgrade turret <id>', description: 'Улучшить турель: урон и прочность', roles: ['manager'], phase: 'day' },

  // ---------- смотритель
  { id: 'sortie.push', patterns: ['sortie push'], usage: 'sortie push', description: 'Идти глубже: добыча и риск растут', roles: ['warden'], phase: 'day' },
  { id: 'sortie.home', patterns: ['sortie home'], usage: 'sortie home', description: 'Вернуть вылазку домой с добычей', roles: ['warden'], phase: 'day' },
  { id: 'sortie.go', patterns: ['sortie <n:int>'], usage: 'sortie <n>', description: 'Отправить n человек из резерва на вылазку', roles: ['warden'], phase: 'day' },
  { id: 'use', patterns: ['use <item:molotov|coffee|gun|adrenaline>'], usage: 'use <molotov|coffee|gun|adrenaline>', description: 'Применить предмет из инвентаря', roles: ['warden'], phase: 'night' },
  { id: 'drop', patterns: ['drop <slot:int>'], usage: 'drop <клетка>', description: 'Выбросить предмет из клетки инвентаря', roles: ['warden'], phase: 'both' },
];
