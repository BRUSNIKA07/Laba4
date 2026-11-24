import { syncRoster } from '../../game/squads';
import { armyLevel } from '../../game/army';
import { param } from '../../game/balance';
import { scaleCost } from '../../types/resources';
import { done, fail, tryPay, type Handler } from './common';

export const drill: Handler = ({ state, b, cfg }) => {
  const army = state.bunker.army;
  const per = param(cfg, 'perLevel');
  const before = armyLevel(state, b);
  army.drill++;
  const after = armyLevel(state, b);
  if (after > before) return done(`*** Уровень армии: ${after}! Бойцы стали сильнее.`);
  return done(`Муштра ${army.drill % per}/${per} (уровень армии ${after})`);
};

function train(kind: 'melee' | 'ranged'): Handler {
  return (ctx, args) => {
    const n = Number(args['n']);
    const { state, cfg } = ctx;
    if (n < 1) return fail('Укажите число больше нуля.');
    if (state.bunker.people.recruits < n) {
      return fail(`Новобранцев: ${state.bunker.people.recruits}. Менеджер должен прислать людей: send <n> people to commander.`);
    }
    const soldiers = state.bunker.army.melee + state.bunker.army.ranged;
    if (soldiers + n > state.bunker.soldierCap) {
      return fail(`Казармы вмещают ${state.bunker.soldierCap} солдат, сейчас ${soldiers}. Нужна казарма: build barracks.`);
    }
    const err = tryPay(ctx, scaleCost(cfg.cost, n));
    if (err) return fail(err);
    state.bunker.people.recruits -= n;
    state.bunker.army[kind] += n;
    syncRoster(state);
    return done(`Обучено: ${n} (${kind === 'melee' ? 'ближники' : 'стрелки'}). В армии: ${soldiers + n}/${state.bunker.soldierCap}.`);
  };
}
export const trainMelee = train('melee');
export const trainRanged = train('ranged');

function special(kind: 'damage' | 'health'): Handler {
  return (ctx) => {
    const { state, cfg } = ctx;
    const army = state.bunker.army;
    const count = kind === 'damage' ? army.damageUpgrades : army.healthUpgrades;
    const cost = scaleCost(cfg.cost, Math.pow(param(cfg, 'costGrowth'), count));
    const err = tryPay(ctx, cost);
    if (err) return fail(err);
    const bonus = param(cfg, 'bonus');
    if (kind === 'damage') { army.damageBonus += bonus; army.damageUpgrades++; }
    else { army.healthBonus += bonus; army.healthUpgrades++; }
    return done(`Улучшено: ${kind === 'damage' ? 'урон' : 'здоровье'} армии +${Math.round(bonus * 100)}%. Следующее улучшение дороже.`);
  };
}
export const upgradeDamage = special('damage');
export const upgradeHealth = special('health');

export const cheer: Handler = ({ state, b, cfg }) => {
  const night = state.night;
  if (!night) return fail('Клич нужен только в бою.');
  const sec = param(cfg, 'durationSec');
  night.cheerUntil = night.tick + sec * b.economy.tickRate;
  return done(`Клич! Армия бьёт сильнее ${sec} с (x${param(cfg, 'damageMult')}).`);
};

export const focus: Handler = ({ state, b, cfg }, args) => {
  const night = state.night;
  if (!night) return fail('Приказ нужен только в бою.');
  const kind = args['kind'] === 'ranged' ? 'spitter' : 'grunt';
  night.focus = kind;
  night.focusUntil = night.tick + param(cfg, 'durationSec') * b.economy.tickRate;
  return done(`Приказ: бить ${kind === 'spitter' ? 'стрелков (фиолетовые)' : 'ближников (красные)'} ${param(cfg, 'durationSec')} с.`);
};

