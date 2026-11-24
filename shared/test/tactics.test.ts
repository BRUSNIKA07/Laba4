import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeCommand, sectorAt, TILE } from '../src';
import { startNight, tickNight } from '../src/game/night';
import { choosePosition, passable, walk, withinLeash } from '../src/game/tactics';
import { newGame, QUAD } from './helpers';
function setup() { const {s,b}=newGame(QUAD); s.phase='night'; startNight(s,b); return {s,b,n:s.night!}; }
test('приказы: полномочия, регистр, последнее распоряжение и reset',()=>{
 const {s,b,n}=setup(); const u=n.soldiers.find(u=>u.squad==='farmer')!;
 assert.ok(u); assert.equal(executeCommand(s,b,'b','battle all G3').ok,false);
 assert.equal(executeCommand(s,b,'c',`battle ${u.callsign} G3`).ok,false);
 assert.ok(executeCommand(s,b,'a',`battle ${u.callsign} G3`).ok);
 assert.equal(u.order?.mode,'sector');
 assert.ok(executeCommand(s,b,'b',`battle ${u.callsign.toLowerCase()} hold`).ok);
 assert.equal(u.order?.mode,'hold');
 assert.ok(executeCommand(s,b,'a','battle all auto').ok);
 assert.ok(n.soldiers.every(u=>u.order?.mode==='auto'));
 assert.equal(executeCommand(s,b,'a','battle all Z9').ok,false);
 startNight(s,b); assert.ok(s.night!.soldiers.every(u=>u.order?.mode==='auto'));
});
test('приказ в недоступный сектор выбирает достижимую позицию, отступление к воротам',()=>{
 const {s,b,n}=setup(); const u=n.soldiers[0]!;
 const p=choosePosition(s,b,u,'H1')!;
 assert.ok(p); assert.ok(Number.isFinite(passable(s)(Math.floor(p.x),Math.floor(p.y))));
 assert.notEqual(sectorAt(s.map,p),'H1');
 assert.ok(executeCommand(s,b,'a',`battle ${u.callsign} retreat`).ok);
 const order=u.order!; assert.equal(order.mode,'retreat');
 assert.ok(Math.hypot(order.destination.x-s.map.gate.x,order.destination.y-s.map.gate.y)<7);
});
test('A* обходит камень, секторный приказ доходит до цели',()=>{
 const {s,b,n}=setup(); const u=n.soldiers[0]!;
 s.map.tiles.fill(TILE.grass); u.x=2.5;u.y=2.5; s.map.tiles[2*s.map.width+3]=TILE.rock;
 for(let i=0;i<150;i++){if(walk(s,u,{x:5.5,y:2.5},0.12))break;assert.notEqual(s.map.tiles[Math.floor(u.y)*s.map.width+Math.floor(u.x)],TILE.rock);}
 assert.ok(Math.hypot(u.x-5.5,u.y-2.5)<0.01);
 assert.ok(executeCommand(s,b,'a',`battle ${u.callsign} B2`).ok);
 n.spawns=[];n.enemies=[]; for(let i=0;i<500;i++)tickNight(s,b);
 assert.equal(sectorAt(s.map,u),'B2');
});
test('ограничение преследования соседними секторами',()=>{
 const {s,b}=setup();const p={x:s.map.width/8*2.5,y:s.map.height/8*2.5};
 assert.ok(withinLeash(s,b,'B2',p));assert.ok(!withinLeash(s,b,'A1',p));
});
