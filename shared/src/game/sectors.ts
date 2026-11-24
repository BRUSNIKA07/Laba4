import type { NightMap, Vec } from '../types/night';
export const SECTOR_COUNT = 8;
export interface SectorBounds { x: number; y: number; width: number; height: number; }
/** Сектора геометрически равны, не меняют внутреннюю сетку A*. */
export function sectorBounds(map: Pick<NightMap,'width'|'height'>, name: string): SectorBounds | null {
  const match = /^([A-H])([1-8])$/i.exec(name);
  if (!match) return null;
  const width = map.width/SECTOR_COUNT, height = map.height/SECTOR_COUNT;
  return { x:(match[1]!.toUpperCase().charCodeAt(0)-65)*width, y:(Number(match[2])-1)*height, width, height };
}
export function sectorAt(map: Pick<NightMap,'width'|'height'>, pos: Vec): string | null {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || pos.x<0 || pos.y<0 || pos.x>=map.width || pos.y>=map.height) return null;
  const col=Math.min(SECTOR_COUNT-1,Math.floor(pos.x/(map.width/SECTOR_COUNT)));
  const row=Math.min(SECTOR_COUNT-1,Math.floor(pos.y/(map.height/SECTOR_COUNT)));
  return `${String.fromCharCode(65+col)}${row+1}`;
}
