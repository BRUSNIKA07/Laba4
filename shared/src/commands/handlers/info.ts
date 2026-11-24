import { armyLevel } from '../../game/army';
import { majority } from '../../game/vote';
import { rewardById } from '../../game/rewards';
import { CELL_PRODUCES, totalPeople } from '../../types/bunker';
import { RESOURCES, RESOURCE_TITLES } from '../../types/resources';
import { ROLES } from '../../types/roles';
import { buildLegend, phaseLabel } from '../legend';
import { COMMANDS } from '../registry';
import { done, fail, type Handler } from './common';

export const help: Handler = ({ player }, args) => {
  const topic = args['cmd'] ? String(args['cmd']) : null;
  if (topic) {
    const found = COMMANDS.filter((c) => c.usage.split(' ')[0] === topic);
    if (found.length === 0) return fail(`Нет команды "${topic}". Список: help.`);
    return done(...found.map((c) => `${c.usage}  [${phaseLabel(c.phase)}]  ${c.description}`));
  }
  const lines: string[] = [];
  for (const sec of buildLegend(player.roles.length ? player.roles : ROLES)) {
    lines.push(`--- ${sec.title}`);
    for (const e of sec.entries) lines.push(`  ${e.usage}  [${phaseLabel(e.phase)}]  ${e.description}`);
  }
  return done(...lines);
};

export const status: Handler = ({ state, b }) => {
  const bk = state.bunker;
  const t = state.treasury;
  const lines: string[] = [];
  const left = Math.max(0, b.economy.dayTicks - state.phaseTick);
  lines.push(
    state.phase === 'day'
      ? `День ${state.day} | до ночи ${Math.ceil(left / b.economy.tickRate)} с | голосов за конец дня ${Object.keys(state.votes.endDay).length}/${majority(state.players.length)}`
      : state.phase === 'night'
        ? `Ночь ${state.day} | врагов на карте ${state.night?.enemies.length ?? 0}, ещё придёт ${state.night?.spawns.length ?? 0}`
        : `Игра окончена: ${state.gameOverReason ?? ''}`,
  );
  lines.push('Ресурсы: ' + RESOURCES.map((r) => `${RESOURCE_TITLES[r]} ${Math.floor(t[r])}`).join(', '));
  lines.push(`Людей: ${totalPeople(bk)}/${Math.min(bk.housing, b.economy.maxPeople)}, солдат: ${bk.army.melee + bk.army.ranged}/${bk.soldierCap} (ближников ${bk.army.melee}, стрелков ${bk.army.ranged}), уровень армии ${armyLevel(state, b)}`);
  const st = bk.structures.map((s) => `${s.id}${s.turret ? `(${s.turret})` : ''} ${Math.round(s.hp)}/${s.maxHp}`);
  lines.push('Постройки: ' + st.join(', '));
  if (state.rewardOffer) {
    lines.push('Награда (reward <номер>):');
    state.rewardOffer.forEach((id, i) => lines.push(`  ${i + 1}) ${rewardById(b, id).text}`));
  }
  return done(...lines);
};

export const people: Handler = ({ state }) => {
  const p = state.bunker.people;
  const a = state.bunker.army;
  return done(
    `Свободные: ${p.idle}`,
    `Работают у фермера: ${p.farmers}`,
    `Новобранцы у командира: ${p.recruits}`,
    `Резерв смотрителя: ${p.scouts}, на вылазке: ${p.outside}`,
    `Солдаты: ближники ${a.melee}, стрелки ${a.ranged}`,
  );
};

export const cells: Handler = ({ state, b }) => {
  let workers = state.bunker.people.farmers;
  const lines = state.bunker.cells.map((c, i) => {
    if (c.kind === 'empty') return `${i + 1}) пусто`;
    const w = Math.min(b.economy.workersPerCell, workers);
    workers -= w;
    return `${i + 1}) ${c.kind} ур.${c.level} -> ${RESOURCE_TITLES[CELL_PRODUCES[c.kind]]}, рабочих ${w}/${b.economy.workersPerCell}`;
  });
  return done(...lines);
};

export const inv: Handler = ({ state }) =>
  done(...state.inventory.map((s, i) => `${i + 1}) ${s ? `${s.item} x${s.qty}` : '—'}`));

export const voteEnd: Handler = ({ state, player }) => {
  if (state.rewardOffer) return fail('Сначала выберите награду: reward <номер>.');
  state.votes.endDay[player.id] = true;
  return done(`Голос принят: ${Object.keys(state.votes.endDay).length}/${majority(state.players.length)} за конец дня.`);
};

export const reward: Handler = ({ state, player }, args) => {
  const n = Number(args['n']);
  if (!state.rewardOffer) return fail('Сейчас нет наград на выбор.');
  if (n < 1 || n > state.rewardOffer.length) return fail(`Выберите номер от 1 до ${state.rewardOffer.length}.`);
  state.votes.reward[player.id] = n;
  return done(`Голос за награду ${n} принят. Нужно голосов: ${majority(state.players.length)}.`);
};

