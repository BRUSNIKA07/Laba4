import { TILE } from '../types/night';
import type { GameState } from '../types/match';

/** Текстовая карта ночного боя (для консольной игры и временного вида в клиенте). */
export function renderAscii(s: GameState): string {
  const m = s.map;
  const grid: string[][] = [];
  for (let y = 0; y < m.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y * m.width + x];
      row.push(t === TILE.road ? '=' : t === TILE.tree ? 'T' : t === TILE.rock ? 'o' : t === TILE.bunker ? '#' : '.');
    }
    grid.push(row);
  }
  const put = (x: number, y: number, ch: string) => {
    const r = grid[Math.floor(y)];
    const cx = Math.floor(x);
    if (r && cx >= 0 && cx < m.width) r[cx] = ch;
  };
  put(m.gate.x, m.gate.y, 'G');
  for (const st of s.bunker.structures) {
    if (st.kind === 'gate') continue;
    const slot = (st.kind === 'turret' ? m.turretSlots : m.barricadeSlots)[st.slot];
    if (slot) put(slot.x, slot.y, st.kind === 'turret' ? 'U' : 'B');
  }
  const n = s.night;
  if (n) {
    for (const f of n.fires) put(f.x, f.y, '*');
    for (const so of n.soldiers) put(so.x, so.y, so.kind === 'melee' ? 'S' : 'R');
    for (const e of n.enemies) put(e.x, e.y, e.kind === 'grunt' ? 'e' : 's');
  }
  return grid.map((r) => r.join('')).join('\n');
}

export const ASCII_LEGEND = '= дорога  T дерево  o камень  # бункер  G ворота  U турель  B баррикада  S/R солдаты  e/s враги  * огонь';
