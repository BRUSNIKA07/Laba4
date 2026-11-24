import { ROLES, type Role, type PlayerInfo } from '../types/roles';
import type { GameState } from '../types/match';
import type { AssignedSoldier, SoldierIdentity } from '../types/units';

/** Численность армии остаётся совместимой со старой экономикой. Позывные живых не меняются. */
export function syncRoster(state: GameState): void {
  state.roster ??= [];
  for (const kind of ['melee', 'ranged'] as const) {
    const existing = state.roster.filter(u => u.kind === kind);
    const count = state.bunker.army[kind];
    // При голоде/сокращении теряем последних бойцов этого типа.
    const removed = new Set(existing.slice(count).map(u => u.callsign));
    state.roster = state.roster.filter(u => !removed.has(u.callsign));
    const used = new Set(state.roster.map(u => u.callsign));
    for (let n = existing.length; n < count; n++) {
      let i = 1;
      const code = () => `${kind === 'melee' ? 'M' : 'R'}${String(i).padStart(2, '0')}`;
      while (used.has(code())) i++;
      const callsign = code();
      used.add(callsign);
      state.roster.push({ callsign, kind });
    }
  }
}

/** Метод наибольших остатков, равенство разрешается порядком ROLES. */
function apportion(total: number, weights: readonly number[]): number[] {
  if (!total) return weights.map(() => 0);
  const sum = weights.reduce((a,b) => a+b, 0);
  const exact = weights.map(w => total*w/sum);
  const counts = exact.map(Math.floor);
  const order = exact.map((v,i) => ({i, rem: v-counts[i]!})).sort((a,b) => b.rem-a.rem || a.i-b.i);
  const remaining = total-counts.reduce((a,b)=>a+b,0);
  for (let j=0; j<remaining; j++) counts[order[j]!.i]!++;
  return counts;
}

export function squadSizes(total: number, weights: Record<Role, number>): Record<Role, number> {
  const sizes = total < 5 ? ROLES.map((_,i)=>Number(i<total)) : apportion(total, ROLES.map(r=>weights[r]));
  return Object.fromEntries(ROLES.map((r,i)=>[r,sizes[i]!])) as Record<Role, number>;
}

/** Сначала целевые размеры, затем пропорциональное распределение ближников внутри них. */
export function assignSquads(roster: readonly SoldierIdentity[], weights: Record<Role,number>): AssignedSoldier[] {
  const sizes = squadSizes(roster.length, weights);
  const melee = roster.filter(u=>u.kind==='melee');
  const ranged = roster.filter(u=>u.kind==='ranged');
  const quotas = apportion(melee.length, ROLES.map(r=>sizes[r]));
  const result: AssignedSoldier[] = [];
  let mi=0, ri=0;
  ROLES.forEach((squad,i)=>{
    for(let j=0;j<quotas[i]!;j++) result.push({...melee[mi++]!,squad});
    for(let j=quotas[i]!;j<sizes[squad];j++) result.push({...ranged[ri++]!,squad});
  });
  // Сохраняем старую расстановку: ближники впереди стрелков.
  return result.sort((a,b)=>Number(a.kind==='ranged')-Number(b.kind==='ranged'));
}

export function canControlSoldier(player: PlayerInfo, soldier: AssignedSoldier): boolean {
  return player.roles.includes('commander') || player.roles.includes(soldier.squad);
}
