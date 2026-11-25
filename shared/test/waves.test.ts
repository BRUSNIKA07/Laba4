import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startNight, tickNight } from '../src/game/night';
import { newGame } from './helpers';

function setup() {
  const { s, b } = newGame();
  s.phase = 'night';
  s.bunker.structures = s.bunker.structures.filter(st => st.kind === 'gate');
  s.bunker.structures[0]!.hp = 1_000_000;
  startNight(s, b);
  const n = s.night!;
  n.soldiers = [];
  return { s, b, n };
}

test('следующая волна ждёт гибели последнего врага, затем ровно 10 секунд', () => {
  const { s, b, n } = setup();
  assert.equal(b.waves.waveGapTicks, 10 * b.economy.tickRate);
  while (n.spawns[0]?.wave === 1) tickNight(s, b);
  for (let i = 0; i < 350; i++) tickNight(s, b);
  assert.equal(n.waveAnnounced, 1);
  assert.equal(n.waveStarts.length, 1);
  assert.equal(n.enemies.length, b.waves.baseCounts[0]);
  n.enemies.forEach(e => e.hp = 0);
  assert.equal(tickNight(s, b), 'ongoing');
  assert.equal(n.waveStarts[1], n.tick + b.waves.waveGapTicks);
  for (let i = 0; i < b.waves.waveGapTicks; i++) {
    assert.equal(tickNight(s, b), 'ongoing');
    assert.equal(n.enemies.length, 0);
    assert.equal(n.waveAnnounced, 1);
  }
  tickNight(s, b);
  assert.equal(n.waveAnnounced, 2);
  assert.equal(n.enemies.length, 1);
});

test('временное отсутствие врагов до конца появления волны не запускает передышку', () => {
  const { s, b, n } = setup();
  while (n.enemies.length === 0) tickNight(s, b);
  n.enemies.forEach(e => e.hp = 0);
  tickNight(s, b);
  assert.equal(n.enemies.length, 0);
  assert.equal(n.spawns[0]?.wave, 1);
  assert.equal(n.waveStarts.length, 1);
  while (n.enemies.length === 0) tickNight(s, b);
  assert.equal(n.waveAnnounced, 1);
});

test('последняя волна завершает ночь сразу после зачистки, без лишней паузы', () => {
  const { s, b, n } = setup();
  let outcome = 'ongoing';
  for (let i = 0; i < 2000 && outcome === 'ongoing'; i++) {
    n.enemies.forEach(e => e.hp = 0);
    outcome = tickNight(s, b);
  }
  assert.equal(outcome, 'cleared');
  assert.equal(n.waveAnnounced, 3);
  assert.equal(n.waveStarts.length, 3);
  assert.equal(n.stats.kills, n.totalEnemies);
  assert.equal(n.spawns.length, 0);
  assert.equal(n.enemies.length, 0);
});
