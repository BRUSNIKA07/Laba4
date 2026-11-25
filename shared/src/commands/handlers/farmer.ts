import { roomCapacity, workerAllocation } from '../../game/economy';
import { PRODUCTION_ROOMS, type ProductionRoom } from '../../types/bunker';
import { mostWounded } from '../../game/night';
import { param } from '../../game/balance';
import { CELL_PRODUCES, type CellKind } from '../../types/bunker';
import { RESOURCE_TITLES, scaleCost } from '../../types/resources';
import { done, fail, tryPay, type Handler } from './common';

const KIND_RU: Record<string, string> = { farm: 'ферма', lumber: 'лесопилка', quarry: 'каменоломня', mine: 'шахта' };

export const cellBuild: Handler = (ctx, args) => {
  const { state } = ctx;
  const n = Number(args['cell']);
  const cell = state.bunker.cells[n - 1];
  if (!cell) return fail(`Нет клетки ${n}. Всего клеток: ${state.bunker.cells.length} (команда cells).`);
  const kind = args['kind'] as Exclude<CellKind, 'empty'>;
  if (cell.kind !== 'empty') return fail('Модуль уже построен. Снос недоступен.');
  const err = tryPay(ctx, ctx.cfg.cost);
  if (err) return fail(err);
  cell.kind = kind;
  cell.level = 1;
  return done(`Клетка ${n}: ${KIND_RU[kind]} (даёт ${RESOURCE_TITLES[CELL_PRODUCES[kind]]}). Рабочие распределяются автоматически или командой assign.`);
};

export const cellUpgrade: Handler = (ctx, args) => {
  const { state, cfg } = ctx;
  const n = Number(args['cell']);
  const cell = state.bunker.cells[n - 1];
  if (!cell) return fail(`Нет клетки ${n}.`);
  if (cell.kind === 'empty') return fail(`Клетка ${n} пуста, сначала постройте что-нибудь.`);
  if (cell.level >= Math.min(param(cfg, 'maxLevel'), ctx.b.economy.maxRoomLevel)) return fail(`Клетка ${n} уже на максимальном уровне.`);
  const err = tryPay(ctx, scaleCost(cfg.cost, Math.pow(param(cfg, 'costGrowth'), cell.level - 1)));
  if (err) return fail(err);
  cell.level++;
  return done(`Клетка ${n}: ${KIND_RU[cell.kind]} улучшена до уровня ${cell.level}.`);
};

export const heal: Handler = (ctx) => {
  const night = ctx.state.night;
  if (!night) return fail('Лечить солдат нужно в бою.');
  const s = mostWounded(night);
  if (!s) return fail('Все солдаты здоровы.');
  const err = tryPay(ctx, ctx.cfg.cost);
  if (err) return fail(err);
  const add = s.maxHp * param(ctx.cfg, 'healFraction');
  s.hp = Math.min(s.maxHp, s.hp + add);
  return done(`Аптечка: ${s.kind === 'melee' ? 'ближник' : 'стрелок'} #${s.id} теперь ${Math.round(s.hp)}/${s.maxHp} HP.`);
};

export const assignWorkers: Handler = ({state,b},args) => {
  const room = args['room'] as ProductionRoom;
  const n = Number(args['n']);
  const capacity = roomCapacity(state,b,room);
  if (n > capacity) return fail(`Вместимость ${room}: ${capacity}.`);
  const reserved = PRODUCTION_ROOMS.filter(r => r !== room).reduce((sum,r) => sum + (state.bunker.workerTargets[r] ?? 0),0);
  if (n + reserved > state.bunker.people.farmers) return fail('Недостаточно работников farmer. Снимите другие назначения или попросите manager прислать людей.');
  state.bunker.workerTargets[room] = n;
  const free = state.bunker.people.farmers - workerAllocation(state,b).reduce((a,v)=>a+v,0);
  return done(`${room}: назначено ${n}. Без работы у farmer: ${free}.`);
};
export const autoWorkers: Handler = ({state}) => {
  state.bunker.workerTargets = {};
  return done('Автоматическое распределение работников включено.');
};
