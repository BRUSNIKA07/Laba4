import type { Balance } from '../types/balance';
import { INVENTORY_SIZE, type Inventory, type ItemId } from '../types/items';

export const emptyInventory = (): Inventory => new Array(INVENTORY_SIZE).fill(null);

/** Кладёт предметы в инвентарь. Возвращает, сколько штук не поместилось. */
export function addItem(inv: Inventory, b: Balance, item: ItemId, qty: number): number {
  const max = b.items[item].maxStack;
  let left = qty;
  for (const slot of inv) {
    if (left <= 0) break;
    if (slot && slot.item === item && slot.qty < max) {
      const put = Math.min(max - slot.qty, left);
      slot.qty += put;
      left -= put;
    }
  }
  for (let i = 0; i < inv.length && left > 0; i++) {
    if (inv[i] === null) {
      const put = Math.min(max, left);
      inv[i] = { item, qty: put };
      left -= put;
    }
  }
  return left;
}

/** Номер клетки (с 0), где лежит предмет, или -1. */
export function findItem(inv: Inventory, item: ItemId): number {
  return inv.findIndex((s) => s !== null && s.item === item);
}

export function consumeOne(inv: Inventory, index: number): void {
  const s = inv[index];
  if (!s) return;
  s.qty--;
  if (s.qty <= 0) inv[index] = null;
}
