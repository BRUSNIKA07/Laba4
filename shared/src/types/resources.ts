export const RESOURCES = ['wood', 'stone', 'iron', 'food', 'gold'] as const;
export type ResourceId = (typeof RESOURCES)[number];
export type Resources = Record<ResourceId, number>;
export type ResourceCost = Partial<Resources>;

export const RESOURCE_TITLES: Record<ResourceId, string> = {
  wood: 'дерево',
  stone: 'камень',
  iron: 'железо',
  food: 'еда',
  gold: 'золото',
};

export const emptyResources = (): Resources => ({ wood: 0, stone: 0, iron: 0, food: 0, gold: 0 });

export function canAfford(have: Resources, cost: ResourceCost): boolean {
  return RESOURCES.every((r) => have[r] >= (cost[r] ?? 0));
}

/** Списывает стоимость (вызывать только после canAfford). */
export function pay(have: Resources, cost: ResourceCost): void {
  for (const r of RESOURCES) have[r] -= cost[r] ?? 0;
}

export function addResources(have: Resources, gain: ResourceCost): void {
  for (const r of RESOURCES) have[r] += gain[r] ?? 0;
}

/** Умножает стоимость на коэффициент с округлением вверх. */
export function scaleCost(cost: ResourceCost, k: number): ResourceCost {
  const out: ResourceCost = {};
  for (const r of RESOURCES) {
    const v = cost[r];
    if (v) out[r] = Math.ceil(v * k);
  }
  return out;
}

export function formatCost(cost: ResourceCost): string {
  const parts = RESOURCES.filter((r) => cost[r]).map((r) => `${Number((cost[r] ?? 0).toFixed(2))} ${RESOURCE_TITLES[r]}`);
  return parts.length ? parts.join(', ') : 'бесплатно';
}
