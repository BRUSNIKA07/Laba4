import { consumeOne, findItem } from '../../game/inventory';
import { sortieHome } from '../../game/sortie';
import { damageEnemy, nearestToGate } from '../../game/night';
import { emit } from '../../game/log';
import { INVENTORY_SIZE, type ItemId } from '../../types/items';
import { scaleCost } from '../../types/resources';
import { done, fail, tryPay, type Handler } from './common';

export const sortieGo: Handler = (ctx, args) => {
  const { state, b } = ctx;
  const n = Number(args['n']);
  if (n < 1) return fail('Укажите число больше нуля.');
  if (state.daySortieSeconds >= b.economy.sortieSecondsPerDay) return fail('Суточный лимит вылазок исчерпан.');
  if (state.sortie) return fail('Группа уже снаружи. Верните её: sortie home.');
  const max = b.sortie.maxPeople;
  if (n > max) return fail(`В одной вылазке не больше ${max} человек.`);
  if (state.bunker.people.scouts < n) {
    return fail(`В резерве смотрителя ${state.bunker.people.scouts} чел. Менеджер: send <n> people to warden.`);
  }
  const err = tryPay(ctx, scaleCost(ctx.cfg.cost, n));
  if (err) return fail(err);
  state.bunker.people.scouts -= n;
  state.bunker.people.outside += n;
  state.sortie = { people: n, depth: 1, loot: {}, items: [], lost: 0, secondsOut: 0 };
  return done(`Вылазка из ${n} чел. вышла. Глубже: sortie push, домой: sortie home. К ночи их вернут автоматически.`);
};

export const sortiePush: Handler = ({ state, b }) => {
  const s = state.sortie;
  if (!s) return fail('Никто не снаружи.');
  if (s.depth >= b.sortie.maxDepth) return fail('Дальше идти некуда.');
  s.depth++;
  return done(`Группа идёт глубже: уровень ${s.depth}/${b.sortie.maxDepth}. Добыча и риск выросли.`);
};

export const sortieBack: Handler = ({ state, b }) => {
  if (!state.sortie) return fail('Никто не снаружи.');
  sortieHome(state, b);
  return done();
};

export const use: Handler = (ctx, args) => {
  const { state, b } = ctx;
  const night = state.night;
  if (!night) return fail('Предметы применяются только ночью.');
  const item = String(args['item']) as ItemId;
  const idx = findItem(state.inventory, item);
  if (idx < 0) return fail(`В инвентаре нет предмета ${item}. Команда inv.`);

  const key = `use.${item}`;
  const left = (state.cooldowns[key] ?? 0) - state.tick;
  if (left > 0) return fail(`Перезарядка предмета: ещё ${Math.ceil(left / b.economy.tickRate)} с.`);

  const def = b.items[item];
  const p = def.params;
  const tr = b.economy.tickRate;
  let text: string;

  switch (item) {
    case 'molotov': {
      const road = state.map.road;
      const at = road[Math.min(p['roadIndex'] ?? 6, road.length - 1)]!;
      const radius = p['radius'] ?? 2.5;
      night.fires.push({ x: at.x + 0.5, y: at.y + 0.5, radius, dpsTick: (p['dpsSec'] ?? 12) / tr, ticksLeft: (p['durationSec'] ?? 8) * tr });
      emit(state, { t: 'fire', at: { x: at.x + 0.5, y: at.y + 0.5 }, radius });
      text = 'Коктейль Молотова: дорога у входа врагов горит.';
      consumeOne(state.inventory, idx);
      break;
    }
    case 'coffee':
      night.coffeeUntil = night.tick + (p['durationSec'] ?? 30) * tr;
      text = `Кофе! Солдаты быстрее атакуют ${p['durationSec'] ?? 30} с.`;
      consumeOne(state.inventory, idx);
      break;
    case 'gun': {
      const target = nearestToGate(state, night);
      if (!target) return fail('Целей нет, патрон сохранён.');
      damageEnemy(target, p['damage'] ?? 120);
      const g = state.map.gate;
      emit(state, { t: 'shot', by: 'gun', from: { x: g.x + 0.5, y: g.y + 0.5 }, to: { x: target.x, y: target.y } });
      consumeOne(state.inventory, idx);
      text = 'Выстрел из винтовки в ближайшего к воротам врага.';
      break;
    }
    case 'adrenaline': {
      const f = p['healFraction'] ?? 0.3;
      for (const s of night.soldiers) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * f);
      text = `Адреналин: все солдаты вылечены на ${Math.round(f * 100)}%.`;
      consumeOne(state.inventory, idx);
      break;
    }
  }
  state.cooldowns[key] = state.tick + def.cooldownSec * tr;
  return done(text);
};

export const drop: Handler = ({ state }, args) => {
  const n = Number(args['slot']);
  if (n < 1 || n > INVENTORY_SIZE) return fail(`Клетки инвентаря: 1-${INVENTORY_SIZE}.`);
  const s = state.inventory[n - 1];
  if (!s) return fail(`Клетка ${n} пуста.`);
  state.inventory[n - 1] = null;
  return done(`Выброшено: ${s.item}.`);
};

