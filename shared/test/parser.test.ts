import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, parseCommand } from '../src';

const p = (line: string) => parseCommand(line, COMMANDS);

test('send 3 people to farmer', () => {
  const r = p('send 3 people to farmer');
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.cmd.spec.id, 'send');
    assert.deepEqual(r.cmd.args, { n: 3, target: 'farmer' });
  }
});
test('регистр и пробелы не важны', () => {
  const r = p('  SEND   2  people  TO  Boris ');
  assert.ok(r.ok);
});
test('build turret с типом и без', () => {
  const a = p('build turret');
  const b = p('build turret heavy');
  assert.ok(a.ok && b.ok);
  if (a.ok && b.ok) {
    assert.equal(a.cmd.spec.id, 'build.turret');
    assert.equal(b.cmd.args['type'], 'heavy');
  }
});
test('build farm 3 — команда фермера, build barracks — менеджера', () => {
  const a = p('build farm 3');
  const b = p('build barracks');
  assert.ok(a.ok && b.ok);
  if (a.ok && b.ok) {
    assert.equal(a.cmd.spec.id, 'cell.build');
    assert.equal(b.cmd.spec.id, 'build.barracks');
  }
});
test('repair: конкретные шаблоны выигрывают у repair <id>', () => {
  const ids = ['repair all turrets', 'repair gates', 'repair gate', 'repair walls', 'repair t1'].map((l) => {
    const r = p(l);
    return r.ok ? r.cmd.spec.id : 'ERR';
  });
  assert.deepEqual(ids, ['repair.turrets', 'repair.gate', 'repair.gate', 'repair.walls', 'repair.one']);
});
test('sortie 3 / sortie push / sortie home', () => {
  const ids = ['sortie 3', 'sortie push', 'sortie home'].map((l) => {
    const r = p(l);
    return r.ok ? r.cmd.spec.id : 'ERR';
  });
  assert.deepEqual(ids, ['sortie.go', 'sortie.push', 'sortie.home']);
});
test('ошибки: неизвестная команда и неверные аргументы', () => {
  const a = p('dance');
  assert.ok(!a.ok && /Неизвестная/.test(a.error));
  const b = p('send many people to farmer');
  assert.ok(!b.ok && b.hints.length > 0);
  const c = p('   ');
  assert.ok(!c.ok && c.error === '');
});
test('у каждого шаблона свой id и непустая подсказка', () => {
  const ids = new Set<string>();
  for (const c of COMMANDS) {
    assert.ok(!ids.has(c.id), `дубликат id ${c.id}`);
    ids.add(c.id);
    assert.ok(c.usage && c.description);
  }
});
