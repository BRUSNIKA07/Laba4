import type { Balance } from '../types/balance';
import type { GameState } from '../types/match';
import { RESOURCES, RESOURCE_TITLES, addResources, type ResourceId } from '../types/resources';
import { addItem } from './inventory';
import { log } from './log';
import { nextRandom, pick, pickWeighted } from './rng';

/** Проходит каждую секунду дня, пока группа снаружи. */
export function sortieSecond(state: GameState, b: Balance): void {
  const s = state.sortie;
  if (!s) return;
  const cfg = b.sortie;
  s.secondsOut++;

  // потери
  if (nextRandom(state) < cfg.deathChancePerDepth * s.depth) {
    s.people--;
    s.lost++;
    state.bunker.people.outside--;
    state.stats.peopleLost++;
    log(state, `!! Вылазка: потерян человек (осталось ${s.people})`);
    if (s.people <= 0) {
      log(state, '!! Вылазка не вернулась. Добыча потеряна.');
      state.sortie = null;
      return;
    }
  }

  // находки
  const scale = 1 + cfg.depthLootGrowth * (s.depth - 1);
  if (nextRandom(state) < cfg.findChancePerSec) {
    const keys = Object.keys(cfg.lootBase) as ResourceId[];
    const r = pick(state, keys);
    const amount = Math.max(1, Math.round((cfg.lootBase[r] ?? 1) * scale * (0.5 + nextRandom(state))));
    s.loot[r] = (s.loot[r] ?? 0) + amount;
    if (nextRandom(state) < cfg.goldChance) {
      s.loot.gold = (s.loot.gold ?? 0) + Math.max(1, Math.round(cfg.goldBase * scale * (0.5 + nextRandom(state))));
    }
  }
  if (nextRandom(state) < cfg.itemChancePerDepth * s.depth) {
    const item = pickWeighted(state, cfg.itemWeights);
    s.items.push({ item, qty: item === 'gun' ? 3 : 1 });
    log(state, `** Вылазка нашла предмет: ${b.items[item].name}`);
  }
}

/** Возвращает группу домой и отдаёт добычу. */
export function sortieHome(state: GameState, b: Balance, forced = false): void {
  const s = state.sortie;
  if (!s) return;
  state.bunker.people.outside -= s.people;
  state.bunker.people.scouts += s.people;
  addResources(state.treasury, s.loot);
  const parts = RESOURCES.filter((r) => s.loot[r]).map((r) => `${s.loot[r]} ${RESOURCE_TITLES[r]}`);
  let converted = 0;
  for (const it of s.items) {
    const left = addItem(state.inventory, b, it.item, it.qty);
    if (left > 0) converted += left; // не влезло — обмениваем на золото
  }
  if (converted > 0) {
    state.treasury.gold += converted * 15;
    parts.push(`${converted * 15} золота за предметы, которые не влезли`);
  }
  log(state, `<< Вылазка вернулась${forced ? ' (ночь близко)' : ''}: людей ${s.people}, потеряно ${s.lost}. Добыча: ${parts.join(', ') || 'ничего'}`);
  state.sortie = null;
}
