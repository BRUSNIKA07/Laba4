import type { Vec } from '../types/night';
import type { EnemyKind, SoldierKind } from '../types/units';

/**
 * События, которые игра кладёт в очередь state.events.
 * Клиент использует их для текста в консоли и для эффектов (выстрелы, смерти).
 */
export type GameEvent =
  | { t: 'log'; text: string } // строка для консоли/журнала
  | { t: 'phase'; phase: 'day' | 'night' | 'gameover'; day: number }
  | { t: 'wave'; wave: number; total: number; enemies: number }
  | { t: 'shot'; by: 'soldier' | 'turret' | 'enemy' | 'gun'; from: Vec; to: Vec }
  | { t: 'death'; side: 'enemy' | 'soldier'; kind: EnemyKind | SoldierKind; at: Vec }
  | { t: 'fire'; at: Vec; radius: number }
  | { t: 'structureDestroyed'; id: string };
