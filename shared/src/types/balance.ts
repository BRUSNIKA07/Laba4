import type { Role } from './roles';
import type { CellKind } from './bunker';
import type { ItemId } from './items';
import type { ResourceCost, ResourceId } from './resources';
import type { EnemyKind, SoldierKind, TurretKind, UnitStats } from './units';

export interface CommandBalance {
  cooldownSec: number;
  cost: ResourceCost;
  params: Record<string, number>;
}

export interface ItemDef {
  name: string;
  cooldownSec: number;
  maxStack: number;
  params: Record<string, number>;
}

export interface EnemyDef extends UnitStats {
  loot: ResourceCost;
}
export interface TurretDef extends UnitStats {
  label: string;
  cost: ResourceCost;
}

export interface UnitsBalance {
  soldiers: Record<SoldierKind, UnitStats>;
  enemies: Record<EnemyKind, EnemyDef>;
  turrets: Record<TurretKind, TurretDef>;
  gate: { hp: number };
  barricade: { hp: number; cost: ResourceCost };
}

export interface WavesBalance {
  wavesPerNight: number;
  baseCounts: number[]; // сколько врагов в 1-й, 2-й, 3-й волне первой ночью
  countGrowthPerDay: number;
  spitterShareBase: number;
  spitterSharePerDay: number;
  spitterShareMax: number;
  spawnIntervalTicks: number;
  waveGapTicks: number;
  firstWaveDelayTicks: number;
  hpPerDay: number;
  damagePerDay: number;
}

export interface EconomyBalance {
  tickRate: number;
  dayTicks: number;
  startResources: ResourceCost;
  startPeople: { idle: number; farmers: number; melee: number; ranged: number };
  startCells: CellKind[]; // клетки с самого начала, остальные пустые
  cellCount: number;
  workersPerCell: number;
  production: Record<Exclude<CellKind, 'empty'>, number>; // ресурс/сек на одного рабочего
  cellLevelBonus: number;
  foodPerPersonPerDay: number;
  baseHousing: number;
  baseSoldierCap: number;
  maxPeople: number;
  immigrationPerNight: [number, number];
  startTurretSlots: number;
  startTurrets: TurretKind[];
  startInventory: { item: ItemId; qty: number }[];
}

export type RewardEffect =
  | { type: 'resources'; gain: ResourceCost }
  | { type: 'incomeBoost'; mult: number }
  | { type: 'housing'; amount: number }
  | { type: 'soldierCap'; amount: number }
  | { type: 'cells'; amount: number }
  | { type: 'turretSlot'; amount: number }
  | { type: 'people'; amount: number }
  | { type: 'item'; item: ItemId; qty: number };

export interface RewardDef {
  id: string;
  text: string;
  effect: RewardEffect;
}

export interface SortieBalance {
  maxPeople: number;
  maxDepth: number;
  findChancePerSec: number;
  lootBase: Partial<Record<ResourceId, number>>;
  goldChance: number;
  goldBase: number;
  itemChancePerDepth: number;
  itemWeights: Record<ItemId, number>;
  deathChancePerDepth: number; // шанс потери одного человека в секунду
  depthLootGrowth: number;
}

export interface MapBalance {
  width: number;
  height: number;
  treeChance: number;
  rockChance: number;
}

export interface TacticsBalance {
  meleeDetection: number; enemyDetection: number; rangedRetreatDistance: number;
  rangedSupportDistance: number; adjacentSectorRadius: number; positionCoverBonus: number;
  positionSeparationBonus: number; enemyRoadCost: number; flankShare: number;
}

export interface Balance {
  tactics: TacticsBalance;
  units: UnitsBalance;
  items: Record<ItemId, ItemDef>;
  commands: Record<string, CommandBalance>;
  waves: WavesBalance;
  economy: EconomyBalance;
  rewards: RewardDef[];
  sortie: SortieBalance;
  map: MapBalance;
  squads: { weights: Record<Role, number> };
}
