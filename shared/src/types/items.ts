export const ITEM_IDS = ['molotov', 'coffee', 'gun', 'adrenaline'] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export interface InvSlot {
  item: ItemId;
  qty: number; // у винтовки qty — патроны
}

/** Инвентарь смотрителя: ровно 4 клетки. */
export const INVENTORY_SIZE = 4;
export type Inventory = (InvSlot | null)[];
