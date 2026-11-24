import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { TILE as TILE_ID, type Enemy, type GameEvent, type GameState, type Soldier, type Structure } from '@outpost/shared';
import { TILE, loadTextures, type SpriteKey } from './sprites';

interface View {
  sprite: Sprite;
  x: number;
  y: number;
  laneX: number; // постоянное случайное смещение «полосы»
  laneY: number;
  phase: number;
  freq: number;
  amp: number; // сила покачивания в клетках
}

interface Bullet {
  sprite: Sprite;
  x0: number; y0: number; x1: number; y1: number;
  t: number; // прошло мс
  dur: number;
}

const BULLET_SPEED = 0.022; // клеток за мс
const MAX_BULLETS = 200;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Рисует ночной бой по state.night. Логику боя не меняет: вся «живость»
 * (полосы, покачивание, плавное движение, полёт пуль) только для вида.
 */
export class NightRenderer {
  private app = new Application();
  private tex!: Record<SpriteKey, Texture>;
  private dead = false;
  private ready = false;
  private world = new Container();
  private mapLayer = new Container();
  private structLayer = new Container();
  private fireLayer = new Container();
  private unitLayer = new Container();
  private bulletLayer = new Container();
  private bars = new Graphics();
  private enemies = new Map<number, View>();
  private soldiers = new Map<number, View>();
  private structSprites = new Map<string, Sprite>();
  private structSig = '';
  private mapKey = -1;
  private fires: Sprite[] = [];
  private bullets: Bullet[] = [];
  private mapW = 48 * TILE;
  private mapH = 27 * TILE;

  constructor(
    private host: HTMLElement,
    private getState: () => GameState | null,
    private drainFx: () => GameEvent[],
  ) {}

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      background: '#020803',
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.dead) { this.app.destroy(true, { children: true }); return; }
    this.host.appendChild(this.app.canvas);
    this.tex = await loadTextures(this.app);
    if (this.dead) return;

    this.world.addChild(this.mapLayer, this.structLayer, this.fireLayer, this.unitLayer, this.bulletLayer, this.bars);
    this.app.stage.addChild(this.world);
    this.drainFx(); // старые события не нужны
    this.ready = true;
    this.app.ticker.add((t) => this.frame(t.deltaMS));
  }

  destroy(): void {
    this.dead = true;
    if (this.ready) this.app.destroy(true, { children: true });
  }

  // ------------------------------------------------------------ кадр
  private frame(dt: number): void {
    const s = this.getState();
    if (!s) return;
    this.fit(s);
    if (this.mapKey !== s.seed) this.buildMap(s);
    this.syncStructures(s);
    const n = s.night;
    const now = performance.now();
    const k = 1 - Math.exp(-dt * 0.012); // плавное приближение к позиции из логики

    this.syncUnits(this.enemies, n?.enemies ?? [], now, k, (e: Enemy) => (e.kind === 'grunt' ? 'enemy_grunt' : 'enemy_spitter'), 0.28, 0.12);
    this.syncUnits(this.soldiers, n?.soldiers ?? [], now, k, (u: Soldier) => (u.kind === 'melee' ? 'soldier_melee' : 'soldier_ranged'), 0.18, 0.07);
    this.syncFires(s, now);
    this.spawnBullets();
    this.moveBullets(dt);
    this.drawBars(s);
  }

  /** Подгоняет карту под размер окна. */
  private fit(s: GameState): void {
    this.mapW = s.map.width * TILE;
    this.mapH = s.map.height * TILE;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w < 10 || h < 10) return;
    const sc = Math.min(w / this.mapW, h / this.mapH);
    this.world.scale.set(sc);
    this.world.position.set((w - this.mapW * sc) / 2, (h - this.mapH * sc) / 2);
  }

  // ------------------------------------------------------------ карта
  private buildMap(s: GameState): void {
    this.mapLayer.removeChildren().forEach((c) => c.destroy());
    const m = s.map;
    const put = (key: SpriteKey, x: number, y: number) => {
      const sp = new Sprite(this.tex[key]);
      sp.position.set(x * TILE, y * TILE);
      this.mapLayer.addChild(sp);
    };
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const t = m.tiles[y * m.width + x];
        if (t === TILE_ID.road) put('road', x, y);
        else if (t === TILE_ID.bunker) put('bunker', x, y);
        else {
          put('grass', x, y);
          if (t === TILE_ID.tree) put('tree', x, y);
          else if (t === TILE_ID.rock) put('rock', x, y);
        }
      }
    }
    this.mapKey = s.seed;
  }

  // ------------------------------------------------------------ постройки
  private structKey(st: Structure): SpriteKey {
    if (st.kind === 'gate') return 'gate';
    if (st.kind === 'barricade') return 'barricade';
    return st.turret === 'rapid' ? 'turret_rapid' : st.turret === 'heavy' ? 'turret_heavy' : 'turret_basic';
  }

  private structPos(s: GameState, st: Structure): { x: number; y: number } {
    const m = s.map;
    const c = st.kind === 'gate' ? m.gate : (st.kind === 'turret' ? m.turretSlots : m.barricadeSlots)[st.slot] ?? m.gate;
    return { x: (c.x + 0.5) * TILE, y: (c.y + 0.5) * TILE };
  }

  private syncStructures(s: GameState): void {
    const sig = s.bunker.structures.map((x) => `${x.id}:${x.kind}:${x.turret ?? ''}:${x.slot}`).join('|');
    if (sig === this.structSig) return;
    this.structSig = sig;
    this.structLayer.removeChildren().forEach((c) => c.destroy());
    this.structSprites.clear();
    for (const st of s.bunker.structures) {
      const sp = new Sprite(this.tex[this.structKey(st)]);
      sp.anchor.set(0.5);
      const p = this.structPos(s, st);
      sp.position.set(p.x, p.y);
      this.structLayer.addChild(sp);
      this.structSprites.set(st.id, sp);
    }
  }

  // ------------------------------------------------------------ юниты
  private syncUnits<T extends { id: number; x: number; y: number }>(
    views: Map<number, View>, list: T[], now: number, k: number,
    keyOf: (u: T) => SpriteKey, lane: number, amp: number,
  ): void {
    const seen = new Set<number>();
    for (const u of list) {
      seen.add(u.id);
      let v = views.get(u.id);
      const tx = u.x * TILE;
      const ty = u.y * TILE;
      if (!v) {
        const sp = new Sprite(this.tex[keyOf(u)]);
        sp.anchor.set(0.5);
        this.unitLayer.addChild(sp);
        v = { sprite: sp, x: tx, y: ty, laneX: rnd(-lane, lane), laneY: rnd(-lane, lane), phase: rnd(0, 6.28), freq: rnd(0.002, 0.005), amp };
        views.set(u.id, v);
      }
      const wx = (v.laneX + Math.sin(now * v.freq + v.phase) * v.amp) * TILE;
      const wy = (v.laneY + Math.cos(now * v.freq * 0.8 + v.phase) * v.amp) * TILE;
      v.x += (tx + wx - v.x) * k;
      v.y += (ty + wy - v.y) * k;
      v.sprite.position.set(v.x, v.y);
    }
    for (const [id, v] of views) {
      if (!seen.has(id)) { v.sprite.destroy(); views.delete(id); }
    }
  }

  // ------------------------------------------------------------ огонь и пули
  private syncFires(s: GameState, now: number): void {
    const list = s.night?.fires ?? [];
    while (this.fires.length < list.length) {
      const sp = new Sprite(this.tex.fire);
      sp.anchor.set(0.5);
      this.fireLayer.addChild(sp);
      this.fires.push(sp);
    }
    while (this.fires.length > list.length) this.fires.pop()!.destroy();
    list.forEach((f, i) => {
      const sp = this.fires[i]!;
      sp.position.set(f.x * TILE, f.y * TILE);
      const size = (f.radius * 2 * TILE) / sp.texture.width;
      sp.scale.set(size * (0.95 + 0.05 * Math.sin(now * 0.02 + i)));
      sp.alpha = 0.35 + 0.15 * Math.sin(now * 0.015 + i * 2);
    });
  }

  private spawnBullets(): void {
    for (const e of this.drainFx()) {
      if (e.t !== 'shot' || this.bullets.length >= MAX_BULLETS) continue;
      const sp = new Sprite(this.tex.bullet);
      sp.anchor.set(0.5);
      const x0 = e.from.x * TILE, y0 = e.from.y * TILE, x1 = e.to.x * TILE, y1 = e.to.y * TILE;
      sp.rotation = Math.atan2(y1 - y0, x1 - x0);
      sp.position.set(x0, y0);
      this.bulletLayer.addChild(sp);
      const dur = Math.max(80, (Math.hypot(x1 - x0, y1 - y0) / TILE / BULLET_SPEED));
      this.bullets.push({ sprite: sp, x0, y0, x1, y1, t: 0, dur });
    }
  }

  private moveBullets(dt: number): void {
    this.bullets = this.bullets.filter((b) => {
      b.t += dt;
      const p = Math.min(1, b.t / b.dur);
      b.sprite.position.set(b.x0 + (b.x1 - b.x0) * p, b.y0 + (b.y1 - b.y0) * p);
      if (p >= 1) { b.sprite.destroy(); return false; }
      return true;
    });
  }

  // ------------------------------------------------------------ полоски HP
  /** Полоска показывается, только если здоровье меньше полного. */
  private drawBars(s: GameState): void {
    const g = this.bars;
    g.clear();
    const bar = (x: number, y: number, w: number, hp: number, max: number) => {
      if (hp >= max || max <= 0) return;
      const r = Math.max(0, hp / max);
      g.rect(x - w / 2 - 1, y - 1, w + 2, 5).fill({ color: 0x000000, alpha: 0.7 });
      g.rect(x - w / 2, y, w * r, 3).fill(r > 0.5 ? 0x4dff6a : r > 0.25 ? 0xffc04a : 0xff4d4d);
    };
    const n = s.night;
    if (n) {
      for (const e of n.enemies) { const v = this.enemies.get(e.id); if (v) bar(v.x, v.y - 18, 22, e.hp, e.maxHp); }
      for (const u of n.soldiers) { const v = this.soldiers.get(u.id); if (v) bar(v.x, v.y - 18, 22, u.hp, u.maxHp); }
    }
    for (const st of s.bunker.structures) {
      const sp = this.structSprites.get(st.id);
      if (sp) bar(sp.x, sp.y - 20, 26, st.hp, st.maxHp);
    }
  }
}
