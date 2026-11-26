
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistry, drainEvents, executeCommand, step, totalPeople, type GameState } from '../src';
import { DUO, QUAD, SOLO, loadBalance, newGame } from './helpers';

const run = (s: GameState, b: ReturnType<typeof loadBalance>, pid: string, line: string) => executeCommand(s, b, pid, line);

test('реестр команд согласован с обработчиками и балансом', () => {
  assert.deepEqual(checkRegistry(loadBalance()), []);
});

test('старт: 15 человек, фаза дня, ворота и турель', () => {
  const { s } = newGame();
  assert.equal(totalPeople(s.bunker), 15);
  assert.equal(s.phase, 'day');
  assert.equal(s.bunker.structures.length, 2);
});

test('роли: командир не может строить, менеджер может', () => {
  const { s, b } = newGame(DUO);
  const bad = run(s, b, 'a', 'build barracks');
  assert.ok(!bad.ok && /роли/.test(bad.lines[0]!));
  const good = run(s, b, 'b', 'build barracks');
  assert.ok(good.ok, good.lines.join(' '));
});

test('send по имени игрока: у одного игрока две роли — нужна явная роль', () => {
  const { s, b } = newGame(DUO);
  const amb = run(s, b, 'b', 'send 1 people to anna'); // у Анны командир и фермер
  assert.ok(!amb.ok && /несколько ролей/i.test(amb.lines[0]!));
  const single = run(s, b, 'b', 'send 1 people to boris'); // у Бориса из «получателей» только warden
  assert.ok(single.ok, single.lines.join(' '));
  assert.equal(s.bunker.people.scouts, 1);
  const quad = newGame(QUAD);
  const ok = run(quad.s, quad.b, 'c', 'send 2 people to anna');
  assert.ok(ok.ok, ok.lines.join(' '));
  assert.equal(quad.s.bunker.people.recruits, 2);
});

test('цепочка: send -> train -> дальше упираемся в казарму/ресурсы', () => {
  const { s, b } = newGame();
  assert.ok(run(s, b, 'p1', 'send 3 people to commander').ok);
  assert.ok(run(s, b, 'p1', 'train melee 3').ok);
  assert.equal(s.bunker.army.melee, 5);
  assert.ok(!run(s, b, 'p1', 'train melee 1').ok); // новобранцев нет
});

test('перезарядка работает, команда ночи недоступна днём', () => {
  const { s, b } = newGame();
  assert.ok(run(s, b, 'p1', 'drill').ok);
  assert.ok(!run(s, b, 'p1', 'drill').ok); // сразу повторить нельзя
  for (let i = 0; i < 4; i++) step(s, b);
  assert.ok(run(s, b, 'p1', 'drill').ok);
  assert.ok(!run(s, b, 'p1', 'cheer').ok);
});

test('100 муштр = уровень армии', () => {
  const { s, b } = newGame();
  for (let i = 0; i < 100; i++) {
    s.cooldowns = {};
    run(s, b, 'p1', 'drill');
  }
  assert.equal(s.bunker.army.drill, 100);
  assert.match(run(s, b, 'p1', 'status').lines.join('\n'), /уровень армии 1/);
});

test('голосование: соло заканчивает день одним голосом', () => {
  const { s, b } = newGame();
  run(s, b, 'p1', 'reward 1'); // награды в первый день нет
  assert.ok(run(s, b, 'p1', 'vote end').ok);
  step(s, b);
  assert.equal(s.phase, 'night');
});

test('голосование: вчетвером нужно 3 голоса', () => {
  const { s, b } = newGame(QUAD);
  run(s, b, 'a', 'vote end');
  run(s, b, 'b', 'vote end');
  step(s, b);
  assert.equal(s.phase, 'day');
  run(s, b, 'c', 'vote end');
  step(s, b);
  assert.equal(s.phase, 'night');
});

test('вылазка: уходит, приносит добычу, к ночи возвращается сама', () => {
  const { s, b } = newGame();
  run(s, b, 'p1', 'send 4 people to warden');
  assert.ok(run(s, b, 'p1', 'sortie 4').ok);
  assert.equal(s.bunker.people.outside, 4);
  for (let i = 0; i < b.economy.dayTicks + 5; i++) step(s, b);
  assert.equal(s.sortie, null);
  assert.equal(s.bunker.people.outside, 0);
});

test('экономика: фермеры дают еду', () => {
  const { s, b } = newGame();
  const before = s.treasury.food;
  for (let i = 0; i < 100; i++) step(s, b);
  assert.ok(s.treasury.food > before);
});

/** Простой «автоигрок»: готовит оборону, проходит ночь с командами. */
function autoplay(seed: number, days: number) {
  const { s, b } = newGame(SOLO, seed);
  const me = (l: string) => run(s, b, 'p1', l);
  me('send 4 people to commander');
  me('train melee 2');
  me('train ranged 2');
  me('build quarry 3');
  me('build mine 4');
  me('build farm 5');
  me('send 3 people to farmer');
  let guard = 0;
  while (s.phase !== 'gameover' && s.day <= days && guard++ < 400000) {
    if (s.phase === 'day' && s.phaseTick === 5) {
      if (s.rewardOffer) me('reward 1');
      me('build turret'); me('build wall'); me('repair gates'); me('repair all turrets');
      me('train melee 1'); me('send 2 people to commander');
      me('vote end');
    }
    if (s.phase === 'night' && s.tick % 40 === 0) {
      me('cheer'); me('heal'); me('repair gates'); me('repair all turrets'); me('use molotov'); me('use gun'); me('use adrenaline');
    }
    step(s, b);
    assert.ok(Object.values(s.treasury).every((v) => Number.isFinite(v) && v >= 0), 'ресурсы не уходят в минус или NaN');
    assert.ok(totalPeople(s.bunker) >= 0);
  }
  return s;
}

test('полный цикл: игра доходит минимум до 3-го дня без ошибок', () => {
  const s = autoplay(42, 3);
  assert.ok(s.day >= 3 || s.phase === 'gameover', `день ${s.day}, фаза ${s.phase}`);
  assert.ok(s.stats.kills > 0, 'враги погибали');
  const ev = drainEvents(s);
  assert.ok(ev.some((e) => e.t === 'wave'));
  assert.ok(ev.some((e) => e.t === 'shot'));
});

test('детерминизм: одинаковые seed и действия дают одинаковое состояние', () => {
  const a = autoplay(7, 3);
  const c = autoplay(7, 3);
  assert.equal(JSON.stringify(a), JSON.stringify(c));
});

test('поражение: слабая оборона даёт gameover при прорыве', () => {
  const { s, b } = newGame();
  s.bunker.army.melee = 0; s.bunker.army.ranged = 0;
  s.bunker.structures = s.bunker.structures.filter((x) => x.kind === 'gate');
  s.bunker.structures[0]!.hp = 20;
  run(s, b, 'p1', 'vote end');
  let g = 0;
  while (s.phase !== 'gameover' && g++ < 20000) step(s, b);
  assert.equal(s.phase, 'gameover');
  assert.match(s.gameOverReason ?? '', /Ворота/);
});

test('сильнейшая вещь: используем предметы, лимиты соблюдаются', () => {
  const { s, b } = newGame();
  run(s, b, 'p1', 'vote end');
  step(s, b);
  assert.equal(s.phase, 'night');
  assert.ok(run(s, b, 'p1', 'use molotov').ok);
  assert.ok(!run(s, b, 'p1', 'use molotov').ok); // предмет закончился
  assert.ok(run(s, b, 'p1', 'use coffee').ok);
});
