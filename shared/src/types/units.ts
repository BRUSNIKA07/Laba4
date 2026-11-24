export type EnemyKind = 'grunt' | 'spitter'; // grunt — ближник (красный), spitter — дальник (фиолетовый)
export type SoldierKind = 'melee' | 'ranged'; // melee — зелёный, ranged — жёлтый
export type TurretKind = 'basic' | 'rapid' | 'heavy';

export interface UnitStats {
  hp: number;
  damage: number;
  range: number; // в клетках
  cooldownTicks: number; // пауза между атаками
  speed: number; // клеток за тик
}
