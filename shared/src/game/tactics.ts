import type { Balance } from '../types/balance';
import type { GameState } from '../types/match';
import { TILE, type Vec, type Soldier, type BattleOrder, type MotionPath, type Enemy } from '../types/night';
import { findPath, type CostFn } from './pathfinding';
import { sectorAt, sectorBounds } from './sectors';

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x-b.x,a.y-b.y);
const tile = (p: Vec): Vec => ({x:Math.floor(p.x),y:Math.floor(p.y)});
const center = (p: Vec): Vec => ({x:p.x+0.5,y:p.y+0.5});
export function passable(state: GameState): CostFn {
  const m=state.map;
  const blocked=new Set<number>();
  for(const st of state.bunker.structures) if(st.hp>0 && st.kind!=='gate') {
    const p=(st.kind==='turret'?m.turretSlots:m.barricadeSlots)[st.slot];
    if(p) blocked.add(p.y*m.width+p.x);
  }
  return (x,y)=>{
    if(x<0||y<0||x>=m.width||y>=m.height) return Infinity;
    const t=m.tiles[y*m.width+x];
    return t===TILE.grass||t===TILE.road ? (blocked.has(y*m.width+x)?Infinity:1) : Infinity;
  };
}
export function withinLeash(state: GameState, b: Balance, sector: string, pos: Vec): boolean {
  const at=sectorAt(state.map,pos);
  return !!at && Math.abs(at.charCodeAt(0)-sector.charCodeAt(0))<=b.tactics.adjacentSectorRadius && Math.abs(Number(at[1])-Number(sector[1]))<=b.tactics.adjacentSectorRadius;
}
/** Выбираем достижимую клетку по полезности: позиция в секторе, укрытия, дистанция и рассредоточение. */
export function choosePosition(state: GameState,b: Balance,s: Soldier,sector: string,reserved: Vec[]=[], preferred?:Vec): Vec | null {
  const m=state.map, bounds=sectorBounds(m,sector);
  if(!bounds) return null;
  const cost=passable(state), from=tile(s);
  const midpoint={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  const enemies=state.night?.enemies.filter(e=>e.hp>0)??[];
  const candidates:{p:Vec;outside:number;score:number}[]=[];
  for(let y=0;y<m.height;y++) for(let x=0;x<m.width;x++) {
    if(!Number.isFinite(cost(x,y))) continue;
    const p=center({x,y});
    const outside=preferred||sectorAt(m,p)===sector?0:1;
    const cover=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{
      const nx=x+dx!,ny=y+dy!;
      return nx>=0&&ny>=0&&nx<m.width&&ny<m.height&&[TILE.tree,TILE.rock].some(t=>t===m.tiles[ny*m.width+nx]);
    });
    const enemyDist=enemies.length?Math.min(...enemies.map(e=>distance(e,p))):Infinity;
    const range=b.units.soldiers[s.kind].range;
    const tactical=Number.isFinite(enemyDist)?Math.abs(enemyDist-range):0;
    const spread=reserved.some(r=>distance(p,r)<1)?b.tactics.positionSeparationBonus:0;
    const score=preferred?distance(p,preferred)+spread:outside?distance(p,midpoint):distance(p,midpoint)+tactical+spread-(cover?b.tactics.positionCoverBonus:0);
    candidates.push({p,outside,score});
  }
  candidates.sort((a,c)=>a.outside-c.outside||a.score-c.score||distance(a.p,s)-distance(c.p,s));
  for(const {p} of candidates) if(findPath(m.width,m.height,cost,from,tile(p))) return p;
  return null;
}
export function makeOrder(state:GameState,b:Balance,s:Soldier,action:string,reserved:Vec[]): BattleOrder|null {
  if(action==='auto') return {mode:'auto'};
  if(action==='hold') return {mode:'hold',destination:{x:s.x,y:s.y},sector:sectorAt(state.map,s)!,arrived:true};
  if(action==='retreat') {
    const g=state.map.gate;
    const sector=sectorAt(state.map,{x:g.x-0.5,y:g.y+0.5})!;
    const destination=choosePosition(state,b,s,sector,reserved,{x:g.x-0.5,y:g.y+0.5});
    return destination?{mode:'retreat',destination,sector:sectorAt(state.map,destination)!,arrived:false}:null;
  }
  const destination=choosePosition(state,b,s,action,reserved);
  return destination?{mode:'sector',destination,sector:sectorAt(state.map,destination)!,arrived:false}:null;
}
/** Движение по A*, с кэшем пути и без срезания препятствий. */
export function walk(state:GameState,u:Vec & {motion?:MotionPath},goal:Vec,speed:number,cost:CostFn=passable(state),scope=''):boolean {
  const m=state.map, to=tile(goal), version=state.night?.pathVersion??0;
  let path=u.motion;
  if(!path||path.scope!==scope||path.version!==version||path.goal.x!==to.x||path.goal.y!==to.y||!Number.isFinite(cost(to.x,to.y))) {
    const route=findPath(m.width,m.height,cost,tile(u),to);
    if(!route) {delete u.motion;return false;}
    path={scope,goal:to,version,path:route,index:0};u.motion=path;
  }
  const next=path.path[path.index];
  const target=next?center(next):goal;
  const d=distance(u,target);
  if(d<=speed) {u.x=target.x;u.y=target.y;if(next) path.index++;else return true;}
  else {u.x+=(target.x-u.x)*speed/d;u.y+=(target.y-u.y)*speed/d;}
  return false;
}
/** Стрелок ищет ближника между собой и противником, затем укрывается за ним. */
export function rangedCover(state:GameState,b:Balance,s:Soldier,enemy:Enemy):Vec|null {
  const allies=state.night?.soldiers.filter(a=>a.hp>0&&a.kind==='melee')??[];
  allies.sort((a,c)=>distance(a,s)-distance(c,s)||a.id-c.id);
  const cost=passable(state);
  for(const a of allies) {
    const d=distance(a,enemy);if(d===0) continue;
    const p=center(tile({x:a.x+(a.x-enemy.x)*b.tactics.rangedSupportDistance/d,y:a.y+(a.y-enemy.y)*b.tactics.rangedSupportDistance/d}));
    if(Number.isFinite(cost(Math.floor(p.x),Math.floor(p.y)))&&distance(p,enemy)>distance(s,enemy)) return p;
  }
  // Если прикрытия нет, отходим от угрозы к доступной соседней клетке.
  const from=tile(s);
  const options:Vec[]=[];
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if((dx||dy)&&Number.isFinite(cost(from.x+dx,from.y+dy))) options.push(center({x:from.x+dx,y:from.y+dy}));
  options.sort((a,c)=>distance(c,enemy)-distance(a,enemy));
  return options.find(p=>distance(p,enemy)>distance(s,enemy)&&!!findPath(state.map.width,state.map.height,cost,from,tile(p)))??null;
}
