import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignSquads, canControlSoldier, squadSizes, sectorAt, sectorBounds, syncRoster, executeCommand, ROLES, step } from '../src';
import { startNight, tickNight } from '../src/game/night';
import { newGame, QUAD, DUO, SOLO } from './helpers';

test('отряды: приоритет маленькой армии, точные доли и пропорциональность типов', () => {
  const {s,b}=newGame();
  assert.deepEqual(squadSizes(3,b.squads.weights), {commander:1,farmer:1,manager:1,warden:0});
  assert.deepEqual(squadSizes(10,b.squads.weights), {commander:4,farmer:2,manager:2,warden:2});
  for(let n=0;n<=50;n++) for(let m=0;m<=n;m++) {
    s.bunker.army.melee=m; s.bunker.army.ranged=n-m; syncRoster(s);
    const units=assignSquads(s.roster,b.squads.weights);
    assert.equal(units.length,n); assert.equal(new Set(units.map(u=>u.callsign)).size,n);
    assert.equal(units.filter(u=>u.kind==='melee').length,m);
    const sizes=squadSizes(n,b.squads.weights);
    for(const r of ROLES) {
      const squad=units.filter(u=>u.squad===r);
      assert.equal(squad.length,sizes[r]);
      if(n) assert.ok(Math.abs(squad.filter(u=>u.kind==='melee').length-sizes[r]*m/n)<1.00001);
    }
  }
});

test('полномочия в соло, паре и четвёрке',()=>{
  for(const players of [SOLO,DUO,QUAD]) {
    const {s,b}=newGame(players); startNight(s,b);
    for(const p of players) for(const u of s.night!.soldiers)
      assert.equal(canControlSoldier(p,u),p.roles.includes('commander')||p.roles.includes(u.squad));
  }
});

test('сетка A1–H8 совпадает с геометрией карты, включая дробную высоту',()=>{
  const {s}=newGame();
  for(let r=1;r<=8;r++) for(const c of 'ABCDEFGH') {
    const code=c+r, bounds=sectorBounds(s.map,code)!;
    assert.equal(sectorAt(s.map,{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}),code);
  }
  assert.equal(sectorBounds(s.map,'I3'),null); assert.equal(sectorAt(s.map,{x:s.map.width,y:0}),null);
  assert.equal(sectorAt(s.map,{x:0,y:0}),'A1');
});

test('точная потеря позывного, отсутствие перераспределения ночью, повторное использование после обучения',()=>{
  const {s,b}=newGame(); s.phase='night'; startNight(s,b);
  const victim=s.night!.soldiers[0]!;
  const survivors=s.night!.soldiers.filter(u=>u!==victim).map(u=>[u.callsign,u.squad]);
  victim.hp=0; tickNight(s,b);
  assert.ok(!s.roster.some(u=>u.callsign===victim.callsign));
  assert.deepEqual(s.night!.soldiers.map(u=>[u.callsign,u.squad]),survivors);
  startNight(s,b); assert.deepEqual(new Set(s.night!.soldiers.map(u=>u.callsign)),new Set(survivors.map(u=>u[0])));
  s.phase='day'; s.bunker.people.recruits=1;
  assert.ok(executeCommand(s,b,'p1',`train ${victim.kind} 1`).ok);
  assert.ok(s.roster.some(u=>u.callsign===victim.callsign));
});

test('карта остаётся неизменной после ночи и сериализации; battle list показывает полномочия',()=>{
  const {s,b}=newGame(QUAD); const map=JSON.stringify(s.map);
  for(const p of QUAD.slice(0,3)) assert.ok(executeCommand(s,b,p.id,'vote end').ok);
  step(s,b); assert.equal(s.phase,'night');
  const list=executeCommand(s,b,'b','battle list'); assert.ok(list.ok); assert.match(list.lines.join('\n'),/чужой отряд/); assert.match(list.lines.join('\n'),/доступно/);
  s.night!.spawns=[]; s.night!.enemies=[]; step(s,b); assert.equal(s.phase,'day');
  assert.equal(JSON.stringify(s.map),map); assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s)).map),map);
  startNight(s,b); assert.equal(JSON.stringify(s.map),map);
});
