import type { Balance } from '../types/balance';
import type { Bunker, Cell, Structure } from '../types/bunker';
import type { GameState } from '../types/match';
import { emptyResources, addResources } from '../types/resources';
import { validateRoleAssignment, type PlayerInfo } from '../types/roles';
import { emptyInventory, addItem } from './inventory';
import { generateMap } from './mapgen';
import { syncRoster } from './squads';
import { resetVotes } from './vote';

export interface NewGameOptions {
  seed: number;
  players: PlayerInfo[];
}

export function createGame(b: Balance, opts: NewGameOptions): GameState {
  const err = validateRoleAssignment(
    opts.players.map((p) => p.id),
    Object.fromEntries(opts.players.map((p) => [p.id, p.roles])),
  );
  if (err) throw new Error(err);

  const eco = b.economy;
  const rngHolder = { rng: opts.seed >>> 0 };
  const map = generateMap(rngHolder, b.map);

  const cells: Cell[] = [];
  for (let i = 0; i < eco.cellCount; i++) cells.push({ kind: eco.startCells[i] ?? 'empty', level: 1 });

  const structures: Structure[] = [
    { id: 'gate', kind: 'gate', level: 1, hp: b.units.gate.hp, maxHp: b.units.gate.hp, slot: 0, cooldown: 0 },
  ];
  let nextStructureId = 1;
  eco.startTurrets.forEach((kind, slot) => {
    const hp = b.units.turrets[kind].hp;
    structures.push({ id: `t${nextStructureId++}`, kind: 'turret', turret: kind, level: 1, hp, maxHp: hp, slot, cooldown: 0 });
  });

  const sp = eco.startPeople;
  const bunker: Bunker = {
    cells,
    people: { idle: sp.idle, farmers: sp.farmers, recruits: 0, scouts: 0, outside: 0 },
    army: { melee: sp.melee, ranged: sp.ranged, drill: 0, damageBonus: 0, healthBonus: 0, damageUpgrades: 0, healthUpgrades: 0 },
    housing: eco.baseHousing,
    soldierCap: eco.baseSoldierCap,
    turretSlots: Math.min(eco.startTurretSlots, map.turretSlots.length),
    structures,
    nextStructureId,
    incomeBoost: 0,
  };

  const treasury = emptyResources();
  addResources(treasury, eco.startResources);
  const inventory = emptyInventory();
  for (const it of eco.startInventory) addItem(inventory, b, it.item, it.qty);

  const state: GameState = {
    version: 1,
    seed: opts.seed >>> 0,
    rng: rngHolder.rng,
    tick: 0,
    day: 1,
    phase: 'day',
    phaseTick: 0,
    players: opts.players.map((p) => ({ ...p, roles: [...p.roles] })),
    treasury,
    bunker,
    map,
    roster: [],
    night: null,
    inventory,
    sortie: null,
    cooldowns: {},
    votes: { endDay: {}, reward: {} },
    rewardOffer: null,
    summary: null,
    gameOverReason: null,
    stats: { kills: 0, soldiersLost: 0, peopleLost: 0 },
    events: [],
  };
  syncRoster(state);
  resetVotes(state);
  state.events.push({ t: 'phase', phase: 'day', day: 1 });
  state.events.push({ t: 'log', text: '== День 1. Выжившие укрылись в бункере. Наберите help.' });
  return state;
}
