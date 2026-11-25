import { canAfford, dailyModules, RESOURCES, RESOURCE_TITLES, scaleCost, totalPeople, type Balance, type GameState, type ResourceCost, type Role, type ProductionRoom } from '@outpost/shared';
import layout from './bunkerLayout.json';

export type DotRole = Role | 'idle';
export const ROLE_COLORS: Record<DotRole, string> = { commander:'#668aca', farmer:'#63a66c', manager:'#ce9b49', warden:'#9869c4', idle:'#e6dec9' };
export const ROLE_LABELS: Record<DotRole, string> = { commander:'Commander', farmer:'Farmer', manager:'Manager', warden:'Warden', idle:'Свободные' };
export interface RoomAction { command: string; cost?: string; condition: string }
export interface RoomView { id: string; title: string; x: number; side: 'top'|'bottom'|'gate'; role: Role|null; level: number; dots: DotRole[]; subtitle: string; details: string[]; actions: RoomAction[]; problem?: string }
const shortNames = {wood:'дер.',stone:'кам.',iron:'жел.',food:'еды',gold:'зол.'};
export const numberText = (v:number) => Number(v.toFixed(2)).toLocaleString('ru-RU',{maximumFractionDigits:2});
export function incomeText(gain: ResourceCost, short = false): string {
  return RESOURCES.filter(k => (gain[k] ?? 0)>0).map(k=>`${numberText(gain[k] ?? 0)} ${short?shortNames[k]:RESOURCE_TITLES[k]}`).join(' · ') || '0';
}
const dot = (n:number, role:DotRole):DotRole[] => Array.from({length:Math.max(0,n)},()=>role);
export function getRoomViews(state:GameState,b:Balance):RoomView[] {
  const bk=state.bunker, p=bk.people;
  const modules=dailyModules(state,b);
  const busy=modules.reduce((s,m)=>s+m.workers,0);
  const max=b.economy.maxRoomLevel;
  const empty=bk.cells.map((c,i)=>c.kind==='empty'?i+1:0).filter(Boolean);
  const actions=(command:string,cost:ResourceCost,condition:string):RoomAction => ({command,cost:incomeText(cost)==='0'?'бесплатно':incomeText(cost),condition: `${condition}${canAfford(state.treasury,cost)?'':' · Не хватает ресурсов'}`});
  const gate=bk.structures.find(s=>s.kind==='gate');
  const views:RoomView[]=layout.map(l=>{
    const r:RoomView={id:l.id,title:l.title,x:l.x,side:l.side as 'top'|'bottom',role:l.role as Role|null,level:0,dots:[],subtitle:'',details:[],actions:[]};
    if (l.id==='farm'||l.id==='lumber'||l.id==='quarry') {
      const id=l.id as ProductionRoom;
      const ms=modules.filter(m=>m.room===id);
      r.level=Math.max(0,...ms.map(m=>bk.cells[m.index]!.level));
      const workers=ms.reduce((s,m)=>s+m.workers,0), cap=ms.reduce((s,m)=>s+m.capacity,0);
      const gain:ResourceCost={}; for(const m of ms) for(const k of RESOURCES) gain[k]=(gain[k]??0)+m.income[k];
      r.dots=dot(workers,'farmer'); r.subtitle=`${workers}/${cap} · ${incomeText(gain,true)}/д`;
      r.details=[`Работники: ${workers} из ${cap}`,`Добыча за день: ${incomeText(gain)}`,`Назначение: ${bk.workerTargets[id]===undefined?'автоматическое':bk.workerTargets[id]}`,`Модули: ${ms.length} · Общий резерв: ${empty.length} из ${bk.cells.length}`,'Уровень на плане — максимальный уровень модуля в отсеке.'];
      for(const m of ms){const cell=bk.cells[m.index]!; r.details.push(`#${m.index+1} ${cell.kind} · ур.${cell.level} · ${m.workers}/${m.capacity} · ${incomeText(m.income)}/д`); if(cell.level<max) r.actions.push(actions(`upgrade cell ${m.index+1}`,scaleCost(b.commands['cell.upgrade']!.cost,Math.pow(b.commands['cell.upgrade']!.params.costGrowth!,cell.level-1)), 'Farmer · мгновенное улучшение модуля (текущее ядро)'));}
      if(empty.length)r.actions.push(actions(`build ${id} ${empty[0]}`,b.commands['cell.build']!.cost,'Farmer · свободные модули: '+empty.join(', ')));
      if(id==='quarry'&&empty.length)r.actions.push(actions(`build mine ${empty[0]}`,b.commands['cell.build']!.cost,'Farmer · железный модуль в каменоломне'));
      r.actions.push({command:`assign <n> workers to ${id}`,condition:`Farmer · до ${cap} работников; 0 отключает назначение`},{command:'assign auto',condition:'Farmer · вернуться к автоназначению'},{command:'cells',condition:'Список всех модулей'});
      return r;
    }
    switch(l.id){
      case 'housing': {
        r.level=bk.housingLevel; r.dots=[...dot(p.idle,'idle'),...dot(p.builders,'manager'),...dot(p.scouts,'warden'),...dot(p.farmers-busy,'farmer')];
        r.subtitle=`${totalPeople(bk)}/${Math.min(bk.housing,b.economy.maxPeople)} · свободно ${p.idle}`;
        const need=Math.ceil(totalPeople(bk)*b.economy.foodPerPersonPerDay);
        if(state.treasury.food<need) r.problem=`Не хватает еды к ночи: ${numberText(need-state.treasury.food)}`;
        r.details=[`Свободные: ${p.idle}`,`Строители в резерве: ${p.builders}`,`Резерв warden: ${p.scouts}`,`Незанятые farmer: ${p.farmers-busy}`,`Еды к ночи потребуется: ${need} (из текущего запаса)`];
        if(r.level<max)r.actions.push(actions('build housing',b.commands['build.housing']!.cost,'Manager · +'+b.commands['build.housing']!.params.peopleCap+' мест'));
        r.actions.push({command:'send <n> people to <role>',condition:'Manager · назначить жителей'},{command:'recall <n> people from <role>',condition:'Manager · вернуть в резерв'});break;
      }
      case 'barracks':
        r.level=bk.barracksLevel; r.dots=dot(bk.army.melee+bk.army.ranged+p.recruits,'commander');r.subtitle=`${bk.army.melee+bk.army.ranged}/${bk.soldierCap} · учеб. ${p.recruits}`;
        r.details=[`Ближники: ${bk.army.melee}`,`Дальники: ${bk.army.ranged}`,`Новобранцы в учебной части: ${p.recruits}`,`Муштра сегодня: ${state.dayDrill}/${b.economy.drillPerDay}`];
        if(r.level<max)r.actions.push(actions('build barracks',b.commands['build.barracks']!.cost,'Manager · +'+b.commands['build.barracks']!.params.soldierCap+' мест'));
        r.actions.push(actions('train melee 1',b.commands['train.melee']!.cost,'Commander · нужен новобранец и свободное место'),actions('train ranged 1',b.commands['train.ranged']!.cost,'Commander · нужен новобранец и свободное место'),{command:'drill',condition:'Commander · суточный лимит муштры'});break;
      case 'generator':r.level=1;r.subtitle='НЕ ПОДКЛЮЧЕНА';r.details=['Помещение предусмотрено и построено по проекту. Производство и потребление электричества ещё не реализованы.'];break;
      case 'core':r.level=1;r.subtitle='БАЗОВЫЙ МОДУЛЬ';r.details=['Ядро построено по проекту. Отдельное состояние и поражение при разрушении ядра будут реализованы позднее; сейчас поражение связано с воротами.'];break;
      case 'oxygen':r.details=['Кислородная станция ещё не построена. Базовая подача и работа станции будут реализованы на этапе жизнеобеспечения.'];break;
      case 'water':r.details=['Водоочистка ещё не построена. Вода как ресурс появится на этапе жизнеобеспечения.'];break;
      case 'infirmary':r.details=['Место зарезервировано. Строительство, медики и лечение в лазарете появятся на отдельном этапе.'];break;
      case 'sortie':r.details=[`На вылазке: ${p.outside}`,`Резерв смотрителя: ${p.scouts} (в жилом отсеке)`,`Время вылазок сегодня: ${state.daySortieSeconds}/${b.economy.sortieSecondsPerDay} с`,'Сейчас вылазки работают без отдельного помещения.'];r.actions=[actions('sortie 1',b.commands['sortie.go']!.cost,'Warden · один человек из резерва'),{command:'sortie home',condition:'Warden · вернуть группу'}];break;
      case 'command':r.details=['Командный центр пока только предусмотрен на чертеже.'];break;
    }
    if(!r.actions.length)r.actions.push({command:'—',condition:'Строительство и улучшение пока не реализованы'});
    return r;
  });
  const entry:RoomView={id:'gate',title:'ШЛЮЗ',x:15,side:'gate',role:'manager',level:gate?.level??0,dots:[],subtitle:`${Math.round(gate?.hp??0)}/${gate?.maxHp??0} HP`,details:['Главный вход в бункер.',`Прочность ворот: ${Math.round(gate?.hp??0)}/${gate?.maxHp??0}`],actions:[actions('repair gates',b.commands['repair.gate']!.cost,'Manager · ворота должны быть повреждены')]};
  if(gate && gate.level<max)entry.actions.push(actions('upgrade gate',scaleCost(b.commands['upgrade.gate']!.cost,gate.level),'Manager · укрепить ворота'));
  if(gate && gate.hp<gate.maxHp)entry.problem='Повреждение ворот';
  return [entry,...views];
}
