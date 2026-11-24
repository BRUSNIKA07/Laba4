import { canControlSoldier } from '../../game/squads';
import { sectorAt } from '../../game/sectors';
import { ROLES, type Role } from '../../types/roles';
import { makeOrder } from '../../game/tactics';
import { done, fail, type Handler } from './common';

export const battleList: Handler = ({ state, player }) => {
  const soldiers = state.night?.soldiers ?? [];
  if (!soldiers.length) return done('Живых бойцов нет.');
  return done('ПОЗЫВНОЙ | ОТРЯД | СЕКТОР | HP | ПРИКАЗ | УПРАВЛЕНИЕ', ...soldiers.map(s =>
    `${s.callsign} | ${s.squad} | ${sectorAt(state.map, s) ?? '—'} | ${Math.ceil(s.hp)}/${s.maxHp} | ${s.order?.mode === 'sector' ? s.order.sector : s.order?.mode ?? 'auto'} | ${canControlSoldier(player,s) ? 'доступно' : 'чужой отряд'}`));
};

export const battleOrder: Handler = ({state,b,player},args) => {
  const target=String(args.target), action=String(args.action).toUpperCase();
  const mode=action.toLowerCase();
  if(!/^[A-H][1-8]$/.test(action)&&!['auto','hold','retreat'].includes(mode)) return fail('Укажите сектор A1–H8, auto, hold или retreat.');
  const commander=player.roles.includes('commander');
  if(target==='all'&&!commander) return fail('battle all доступна только commander.');
  if((ROLES as readonly string[]).includes(target)&&!commander&&!player.roles.includes(target as Role)) return fail('Чужой отряд.');
  const soldiers=(state.night?.soldiers??[]).filter(s=>s.hp>0);
  const selected=soldiers.filter(s=>canControlSoldier(player,s)&&(target==='all'||(target==='squad'&&player.roles.includes(s.squad))||target===s.kind||target===s.squad||target===s.callsign.toLowerCase()));
  if(!selected.length) return fail('Нет доступных бойцов для этого приказа.');
  const reserved=soldiers.filter(s=>!selected.includes(s)&&s.order&&s.order.mode!=='auto').map(s=>s.order!.mode==='auto'?s:s.order!.destination);
  const plans=selected.map(s=>{
    const order=makeOrder(state,b,s,mode==='auto'||mode==='hold'||mode==='retreat'?mode:action,reserved);
    if(order&&order.mode!=='auto') reserved.push(order.destination);
    return {s,order};
  });
  if(plans.some(p=>!p.order)) return fail('Не найден достижимый сектор; приказ не изменён.');
  for(const {s,order} of plans) {s.order=order!;delete s.motion;}
  return done(...plans.map(({s,order})=>`${s.callsign}: ${order!.mode==='sector'?order!.sector:order!.mode}${order!.mode==='sector'&&order!.sector!==action?' (ближайший доступный сектор)':''}`));
};
