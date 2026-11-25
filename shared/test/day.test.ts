import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyModules, dailyProduction, executeCommand, step, totalPeople, workerAllocation } from '../src';
import { QUAD, newGame } from './helpers';

test('бесконечный день: без большинства время не переводит игру в ночь и не увеличивает запас',()=>{
  const {s,b}=newGame(QUAD); const initial={...s.treasury};
  executeCommand(s,b,'a','vote end');executeCommand(s,b,'b','vote end');
  for(let i=0;i<20000;i++)step(s,b);
  assert.equal(s.phase,'day');assert.deepEqual(s.treasury,initial);
  executeCommand(s,b,'c','vote end');step(s,b);
  assert.equal(s.phase,'night');assert.deepEqual(s.pendingIncome,dailyProduction(s,b));
});

test('плановая добыча фиксируется при переходе и начисляется ровно один раз на рассвете',()=>{
  const {s,b}=newGame(); const plan=dailyProduction(s,b);
  executeCommand(s,b,'p1','vote end');step(s,b);
  assert.deepEqual(s.pendingIncome,plan);
  const locked={...s.treasury}; for(let i=0;i<4;i++)step(s,b);
  assert.deepEqual(s.treasury,locked);
  s.night!.spawns=[];s.night!.enemies=[];step(s,b);
  assert.equal(s.phase,'day');for(const k of Object.keys(plan) as (keyof typeof plan)[]) assert.equal(s.treasury[k],locked[k]+plan[k]);
  const after={...s.treasury};for(let i=0;i<100;i++)step(s,b);assert.deepEqual(s.treasury,after);
});

test('ручное распределение farmer не дублирует людей и отражается в прогнозе; mine в каменоломне',()=>{
  const {s,b}=newGame();const me=(cmd:string)=>executeCommand(s,b,'p1',cmd);
  assert.ok(me('send 4 people to farmer').ok);
  assert.ok(me('assign 3 workers to farm').ok);
  assert.ok(me('assign 2 workers to quarry').ok);
  assert.ok(me('assign 2 workers to lumber').ok);
  assert.deepEqual(workerAllocation(s,b).slice(0,3),[3,2,2]);
  assert.ok(dailyProduction(s,b).stone>0&&dailyProduction(s,b).iron>0);
  assert.ok(!me('assign 3 workers to lumber').ok);
  assert.ok(me('build mine 4').ok);
  assert.equal(dailyModules(s,b).find(m=>m.index===3)?.room,'quarry');
  assert.ok(me('recall 4 people from farmer').ok);
  assert.equal(workerAllocation(s,b).reduce((a,n)=>a+n,0),3);
  assert.ok(me('assign auto').ok);assert.deepEqual(s.bunker.workerTargets,{});
});

test('назначение строителей сохраняет население, улучшение увеличивает уровень и не расширяет число модулей',()=>{
  const {s,b}=newGame();const me=(cmd:string)=>executeCommand(s,b,'p1',cmd);const pop=totalPeople(s.bunker);
  assert.ok(me('send 2 people to manager').ok);assert.equal(s.bunker.people.builders,2);assert.equal(totalPeople(s.bunker),pop);
  assert.ok(me('recall 1 people from manager').ok);assert.equal(totalPeople(s.bunker),pop);
  assert.ok(me('build housing').ok);assert.equal(s.bunker.housingLevel,2);
  assert.ok(!me('build farmroom').ok);assert.equal(s.bunker.cells.length,b.economy.cellCount);
  assert.ok(!me('build mine 1').ok);
});

test('суточные ограничения исключают бесконечную муштру и вылазки',()=>{
  const {s,b}=newGame();b.economy.drillPerDay=2;b.economy.sortieSecondsPerDay=2;b.sortie.deathChancePerDepth=0;
  const me=(cmd:string)=>executeCommand(s,b,'p1',cmd);
  for(let i=0;i<2;i++){assert.ok(me('drill').ok);s.cooldowns={};}assert.ok(!me('drill').ok);
  assert.ok(me('send 1 people to warden').ok);assert.ok(me('sortie 1').ok);
  s.sortie!.loot.gold=10; const gold=s.treasury.gold;
  for(let i=0;i<b.economy.tickRate*2;i++)step(s,b);
  assert.equal(s.sortie,null);assert.equal(s.pendingIncome.gold>=10,true);assert.equal(s.treasury.gold,gold);assert.ok(!me('sortie 1').ok);
  assert.ok(me('vote end').ok);step(s,b);s.night!.spawns=[];s.night!.enemies=[];step(s,b);
  assert.equal(s.daySortieSeconds,0);assert.equal(s.dayDrill,0);
});
