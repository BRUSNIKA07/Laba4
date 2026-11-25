import { param } from '../../game/balance';
import type { Structure } from '../../types/bunker';
import { scaleCost } from '../../types/resources';
import type { TurretKind } from '../../types/units';
import { POOL_OF, done, fail, resolveTarget, tryPay, type Handler } from './common';

export const send: Handler = ({ state }, args) => {
  const n = Number(args['n']);
  if (n < 1) return fail('Укажите число больше нуля.');
  const t = resolveTarget(state, String(args['target']));
  if ('error' in t) return fail(t.error);
  const p = state.bunker.people;
  if (p.idle < n) return fail(`Свободных людей: ${p.idle}.`);
  p.idle -= n;
  p[POOL_OF[t.role]] += n;
  return done(`${n} чел. отправлены к роли ${t.role}. Свободных осталось: ${p.idle}.`);
};

export const recall: Handler = ({ state }, args) => {
  const n = Number(args['n']);
  if (n < 1) return fail('Укажите число больше нуля.');
  const t = resolveTarget(state, String(args['target']));
  if ('error' in t) return fail(t.error);
  const p = state.bunker.people;
  const pool = POOL_OF[t.role];
  if (p[pool] < n) return fail(`У роли ${t.role} сейчас ${p[pool]} чел.`);
  p[pool] -= n;
  p.idle += n;
  return done(`${n} чел. вернулись в свободные (теперь ${p.idle}).`);
};

function simpleBuild(field: 'soldierCap' | 'housing', param_: string, text: string): Handler {
  return (ctx) => {
    const level = field === 'housing' ? 'housingLevel' : 'barracksLevel';
    if (ctx.state.bunker[level] >= ctx.b.economy.maxRoomLevel) return fail('Помещение максимального уровня.');
    const err = tryPay(ctx, ctx.cfg.cost);
    if (err) return fail(err);
    const add = param(ctx.cfg, param_);
    ctx.state.bunker[field] += add;
    ctx.state.bunker[level]++;
    return done(`${text} (+${add}). Теперь: ${ctx.state.bunker[field]}.`);
  };
}
export const buildBarracks = simpleBuild('soldierCap', 'soldierCap', 'Казарма построена: мест для солдат');
export const buildHousing = simpleBuild('housing', 'peopleCap', 'Жилой блок построен: мест для людей');

export const buildFarmroom: Handler = () => fail('Девять общих модулей уже предусмотрены. Новые комнаты строить можно будет на этапе строительства.');

function freeSlot(used: Set<number>, limit: number): number {
  for (let i = 0; i < limit; i++) if (!used.has(i)) return i;
  return -1;
}

export const buildTurret: Handler = (ctx, args) => {
  const { state, b } = ctx;
  const kind = (args['type'] ?? 'basic') as TurretKind;
  const def = b.units.turrets[kind];
  const used = new Set(state.bunker.structures.filter((s) => s.kind === 'turret').map((s) => s.slot));
  const slot = freeSlot(used, state.bunker.turretSlots);
  if (slot < 0) return fail(`Все слоты под турели заняты (${state.bunker.turretSlots}). Откройте новый: expand defense.`);
  const err = tryPay(ctx, def.cost);
  if (err) return fail(err);
  const id = `t${state.bunker.nextStructureId++}`;
  state.bunker.structures.push({ id, kind: 'turret', turret: kind, level: 1, hp: def.hp, maxHp: def.hp, slot, cooldown: 0 });
  return done(`Турель ${id} (${def.label}) построена в слоте ${slot + 1}.`);
};

export const buildWall: Handler = (ctx) => {
  const { state, b } = ctx;
  const used = new Set(state.bunker.structures.filter((s) => s.kind === 'barricade').map((s) => s.slot));
  const slot = freeSlot(used, state.map.barricadeSlots.length);
  if (slot < 0) return fail('Все места для баррикад заняты.');
  const err = tryPay(ctx, b.units.barricade.cost);
  if (err) return fail(err);
  const id = `w${state.bunker.nextStructureId++}`;
  const hp = b.units.barricade.hp;
  state.bunker.structures.push({ id, kind: 'barricade', level: 1, hp, maxHp: hp, slot, cooldown: 0 });
  if (state.night) state.night.pathVersion++;
  return done(`Баррикада ${id} поставлена на дороге.`);
};

export const expandDefense: Handler = (ctx) => {
  const { state } = ctx;
  if (state.bunker.turretSlots >= state.map.turretSlots.length) return fail('Больше слотов на этой местности нет.');
  const err = tryPay(ctx, ctx.cfg.cost);
  if (err) return fail(err);
  state.bunker.turretSlots += param(ctx.cfg, 'slots');
  return done(`Слотов под турели: ${state.bunker.turretSlots}.`);
};

function repairGroup(filter: (s: Structure) => boolean, what: string): Handler {
  return (ctx) => {
    const targets = ctx.state.bunker.structures.filter((s) => filter(s) && s.hp < s.maxHp);
    if (targets.length === 0) return fail(`Чинить нечего: ${what} целы.`);
    const err = tryPay(ctx, scaleCost(ctx.cfg.cost, targets.length));
    if (err) return fail(err);
    const f = param(ctx.cfg, 'fraction');
    for (const s of targets) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * f);
    return done(`Починено: ${what} (${targets.length} шт.), +${Math.round(f * 100)}% прочности.`);
  };
}
export const repairTurrets = repairGroup((s) => s.kind === 'turret', 'турели');
export const repairGate = repairGroup((s) => s.kind === 'gate', 'ворота');
export const repairWalls = repairGroup((s) => s.kind === 'barricade', 'баррикады');

export const repairOne: Handler = (ctx, args) => {
  const id = String(args['id']);
  const s = ctx.state.bunker.structures.find((x) => x.id === id);
  if (!s) return fail(`Нет постройки "${id}". Список: status.`);
  if (s.hp >= s.maxHp) return fail(`${id} цела.`);
  const err = tryPay(ctx, ctx.cfg.cost);
  if (err) return fail(err);
  s.hp = Math.min(s.maxHp, s.hp + s.maxHp * param(ctx.cfg, 'fraction'));
  return done(`${id}: ${Math.round(s.hp)}/${s.maxHp} HP.`);
};

export const upgradeGate: Handler = (ctx) => {
  const gate = ctx.state.bunker.structures.find((s) => s.kind === 'gate');
  if (!gate) return fail('Ворот нет.');
  if (gate.level >= ctx.b.economy.maxRoomLevel) return fail('Шлюз максимального уровня.');
  const err = tryPay(ctx, scaleCost(ctx.cfg.cost, gate.level));
  if (err) return fail(err);
  const add = param(ctx.cfg, 'hpBonus');
  gate.level++;
  gate.maxHp += add;
  gate.hp += add;
  return done(`Ворота укреплены до уровня ${gate.level}: ${Math.round(gate.hp)}/${gate.maxHp} HP.`);
};

export const upgradeTurret: Handler = (ctx, args) => {
  const t = ctx.state.bunker.structures.find((s) => s.id === String(args['id']) && s.kind === 'turret');
  if (!t) return fail(`Нет турели "${String(args['id'])}".`);
  if (t.level >= param(ctx.cfg, 'maxLevel')) return fail(`${t.id} уже максимального уровня.`);
  const err = tryPay(ctx, scaleCost(ctx.cfg.cost, t.level));
  if (err) return fail(err);
  const add = param(ctx.cfg, 'hpBonus');
  t.level++;
  t.maxHp += add;
  t.hp += add;
  return done(`${t.id} улучшена до уровня ${t.level}.`);
};

