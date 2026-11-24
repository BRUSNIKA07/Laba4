import { Application, Assets, Graphics, Texture } from 'pixi.js';

/** Размер клетки карты в пикселях. Все PNG-спрайты рассчитаны на 32x32. */
export const TILE = 32;

export const SPRITE_KEYS = [
  // клетки карты
  'grass', 'road', 'tree', 'rock', 'bunker',
  // постройки
  'gate', 'turret_basic', 'turret_rapid', 'turret_heavy', 'barricade',
  // юниты
  'soldier_melee', 'soldier_ranged', 'enemy_grunt', 'enemy_spitter',
  // эффекты
  'bullet', 'fire',
] as const;
export type SpriteKey = (typeof SPRITE_KEYS)[number];

interface Placeholder {
  color: number;
  w: number; // размер заглушки; у PNG размер любой, лучше 32x32
  h: number;
  round?: boolean;
}

/**
 * Заглушки. Чтобы заменить на картинку, положите файл <ключ>.png в client/src/assets/sprites/
 * (например enemy_grunt.png). Файл найдётся сам, код менять не нужно.
 */
export const PLACEHOLDERS: Record<SpriteKey, Placeholder> = {
  grass: { color: 0x2d5a27, w: TILE, h: TILE },
  road: { color: 0x8a7350, w: TILE, h: TILE },
  tree: { color: 0x1c3f1a, w: TILE, h: TILE },
  rock: { color: 0x7a7a7a, w: TILE, h: TILE },
  bunker: { color: 0x33383d, w: TILE, h: TILE },
  gate: { color: 0xb08d57, w: TILE, h: TILE },
  turret_basic: { color: 0x4a90e2, w: 28, h: 28 },
  turret_rapid: { color: 0x2fc4c4, w: 28, h: 28 },
  turret_heavy: { color: 0x2b4fa8, w: 28, h: 28 },
  barricade: { color: 0x8b5a2b, w: TILE, h: 24 },
  soldier_melee: { color: 0x3ddc55, w: 24, h: 24 }, // зелёный: солдат-ближник
  soldier_ranged: { color: 0xffd633, w: 24, h: 24 }, // жёлтый: солдат-дальник
  enemy_grunt: { color: 0xe03131, w: 24, h: 24 }, // красный: враг-ближник
  enemy_spitter: { color: 0xa855f7, w: 24, h: 24 }, // фиолетовый: враг-дальник
  bullet: { color: 0xfff1a8, w: 8, h: 8 },
  fire: { color: 0xff7a00, w: TILE, h: TILE, round: true },
};

const shade = (c: number, d: number): number => {
  const r = Math.max(0, Math.min(255, ((c >> 16) & 255) + d));
  const g = Math.max(0, Math.min(255, ((c >> 8) & 255) + d));
  const b = Math.max(0, Math.min(255, (c & 255) + d));
  return (r << 16) | (g << 8) | b;
};

function makePlaceholder(app: Application, p: Placeholder): Texture {
  const g = new Graphics();
  if (p.round) {
    g.circle(p.w / 2, p.h / 2, p.w / 2).fill(p.color);
  } else {
    g.rect(0, 0, p.w, p.h).fill(shade(p.color, -45)); // тёмная кромка
    g.rect(2, 2, p.w - 4, p.h - 4).fill(p.color); // «кубик»
  }
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  return tex;
}

// Vite отдаёт адреса только тех PNG, которые реально лежат в папке.
const files = import.meta.glob('../assets/sprites/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export async function loadTextures(app: Application): Promise<Record<SpriteKey, Texture>> {
  const out = {} as Record<SpriteKey, Texture>;
  for (const key of SPRITE_KEYS) {
    const url = Object.entries(files).find(([path]) => path.endsWith(`/${key}.png`))?.[1];
    let tex: Texture | null = null;
    if (url) {
      try {
        tex = await Assets.load<Texture>(url);
        tex.source.scaleMode = 'nearest'; // пиксель-арт без размытия
      } catch (e) {
        console.warn(`Не удалось загрузить ${key}.png, использую заглушку`, e);
      }
    }
    out[key] = tex ?? makePlaceholder(app, PLACEHOLDERS[key]);
  }
  return out;
}
