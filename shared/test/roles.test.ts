import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRoleAssignment } from '../src';

test('соло: один игрок со всеми ролями', () => {
  assert.equal(validateRoleAssignment(['a'], { a: ['commander', 'farmer', 'manager', 'warden'] }), null);
});
test('вдвоём: фиксированные пары', () => {
  assert.equal(validateRoleAssignment(['a', 'b'], { a: ['commander', 'farmer'], b: ['manager', 'warden'] }), null);
  assert.notEqual(validateRoleAssignment(['a', 'b'], { a: ['commander', 'manager'], b: ['farmer', 'warden'] }), null);
});
test('вчетвером: ровно по одной роли, дубликаты запрещены', () => {
  const ok = { a: ['commander'], b: ['farmer'], c: ['manager'], d: ['warden'] } as const;
  assert.equal(validateRoleAssignment(['a', 'b', 'c', 'd'], ok as any), null);
  const dup = { a: ['commander'], b: ['commander'], c: ['manager'], d: ['warden'] };
  assert.match(validateRoleAssignment(['a', 'b', 'c', 'd'], dup as any)!, /commander/);
});
test('трое играть не могут', () => {
  assert.notEqual(validateRoleAssignment(['a', 'b', 'c'], { a: ['commander'], b: ['farmer'], c: ['manager'] }), null);
});
