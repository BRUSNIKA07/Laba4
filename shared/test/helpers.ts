import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGame, parseBalance, type Balance, type GameState, type PlayerInfo } from '../src';

const dir = join(import.meta.dirname, '..', 'balance');
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

export function loadBalance(): Balance {
  return parseBalance({
    units: read('units.json'), items: read('items.json'), commands: read('commands.json'),
    waves: read('waves.json'), economy: read('economy.json'), rewards: read('rewards.json'),
    sortie: read('sortie.json'), map: read('map.json'), squads: read('squads.json'), tactics: read('tactics.json'),
  });
}

export const SOLO: PlayerInfo[] = [{ id: 'p1', name: 'Solo', roles: ['commander', 'farmer', 'manager', 'warden'] }];
export const DUO: PlayerInfo[] = [
  { id: 'a', name: 'Anna', roles: ['commander', 'farmer'] },
  { id: 'b', name: 'Boris', roles: ['manager', 'warden'] },
];
export const QUAD: PlayerInfo[] = [
  { id: 'a', name: 'Anna', roles: ['commander'] },
  { id: 'b', name: 'Boris', roles: ['farmer'] },
  { id: 'c', name: 'Clara', roles: ['manager'] },
  { id: 'd', name: 'Dima', roles: ['warden'] },
];

export function newGame(players = SOLO, seed = 12345): { b: Balance; s: GameState } {
  const b = loadBalance();
  return { b, s: createGame(b, { seed, players }) };
}
