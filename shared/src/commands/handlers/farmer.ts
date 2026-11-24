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
  if (cell.kind === kind) return fail(`В клетке ${n} уже стоит ${KIND_RU[kind]}.`);
  const err = tryPay(ctx, ctx.cfg.cost);
  if (err) return fail(err);
  cell.kind = kind;
  cell.level = 1;
  return done(`Клетка ${n}: ${KIND_RU[kind]} (даёт ${RESOURCE_TITLES[CELL_PRODUCES[kind]]}). Рабочие занимают клетки по порядку.`);
};

export const cellUpgrade: Handler = (ctx, args) => {
  const { state, cfg } = ctx;
  const n = Number(args['cell']);
  const cell = state.bunker.cells[n - 1];
  if (!cell) return fail(`Нет клетки ${n}.`);
  if (cell.kind === 'empty') return fail(`Клетка ${n} пуста, сначала постройте что-нибудь.`);
  if (cell.level >= param(cfg, 'maxLevel')) return fail(`Клетка ${n} уже на максимальном уровне.`);
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
