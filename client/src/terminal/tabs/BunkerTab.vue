<script setup lang="ts">
import { useGameStore } from '../../stores/game';

const g = useGameStore();
const st = () => g.need();

interface Dot { x: number; y: number; kind: 'civ' | 'melee' | 'ranged' | 'out'; delay: number }

/** Раскладывает count точек сеткой внутри комнаты. */
function place(count: number, x: number, y: number, w: number, kind: Dot['kind'], offset = 0): Dot[] {
  const gap = 15;
  const cols = Math.max(1, Math.floor((w - 20) / gap));
  const out: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const k = i + offset;
    out.push({ x: x + 12 + (k % cols) * gap, y: y + 38 + Math.floor(k / cols) * gap, kind, delay: ((k * 37) % 20) / 10 });
  }
  return out;
}

function dots(): Dot[] {
  const b = st().bunker;
  const p = b.people;
  return [
    ...place(p.idle, 40, 40, 300, 'civ'),
    ...place(p.farmers, 360, 40, 320, 'civ'),
    ...place(b.army.melee, 40, 210, 300, 'melee'),
    ...place(b.army.ranged, 40, 210, 300, 'ranged', b.army.melee),
    ...place(p.recruits, 40, 210, 300, 'civ', b.army.melee + b.army.ranged),
    ...place(p.scouts, 360, 210, 150, 'civ'),
    ...place(p.outside, 530, 395, 170, 'out').map((d) => ({ ...d, y: 404 + (d.y - 433) })),
  ];
}
const cellLetter: Record<string, string> = { empty: '·', farm: 'Ф', lumber: 'Л', quarry: 'К', mine: 'Ш' };
</script>

<template>
  <div class="bunker">
    <svg viewBox="0 0 720 430" class="bunker-svg" role="img" aria-label="Схема бункера">
      <rect x="20" y="20" width="680" height="360" class="wall" />
      <rect x="40" y="40" width="300" height="150" class="room" />
      <rect x="360" y="40" width="320" height="150" class="room" />
      <rect x="40" y="210" width="300" height="150" class="room" />
      <rect x="360" y="210" width="150" height="150" class="room" />
      <rect x="530" y="210" width="150" height="150" class="room" />
      <text x="50" y="58" class="label">ЖИЛОЙ БЛОК · свободных {{ st().bunker.people.idle }}</text>
      <text x="370" y="58" class="label">ФЕРМЕРСКИЙ ОТСЕК · рабочих {{ st().bunker.people.farmers }}</text>
      <text x="50" y="228" class="label">КАЗАРМА · {{ st().bunker.army.melee + st().bunker.army.ranged }}/{{ st().bunker.soldierCap }}</text>
      <text x="370" y="228" class="label">ПОСТ СМОТРИТЕЛЯ · {{ st().bunker.people.scouts }}</text>
      <text x="540" y="228" class="label">ВОРОТА</text>
      <!-- ворота -->
      <rect x="696" y="262" width="8" height="56" class="gate" />
      <text x="540" y="262" class="label dim">
        {{ Math.round(st().bunker.structures.find((s) => s.kind === 'gate')?.hp ?? 0) }} HP
      </text>
      <!-- клетки фермера -->
      <g>
        <g v-for="(c, i) in st().bunker.cells" :key="i">
          <rect :x="372 + (i % 9) * 34" :y="146 + Math.floor(i / 9) * 22" width="28" height="18" class="cell" :class="{ empty: c.kind === 'empty' }" />
          <text :x="386 + (i % 9) * 34" :y="159 + Math.floor(i / 9) * 22" class="cell-letter" text-anchor="middle">
            {{ cellLetter[c.kind] }}{{ c.kind === 'empty' ? '' : c.level }}
          </text>
        </g>
      </g>
      <!-- люди -->
      <g v-for="(d, i) in dots()" :key="i">
        <rect v-if="d.kind === 'melee'" :x="d.x - 4" :y="d.y - 4" width="8" height="8" class="dot soldier" :style="{ animationDelay: d.delay + 's' }" />
        <polygon v-else-if="d.kind === 'ranged'" :points="`${d.x},${d.y - 5} ${d.x + 5},${d.y} ${d.x},${d.y + 5} ${d.x - 5},${d.y}`" class="dot soldier" :style="{ animationDelay: d.delay + 's' }" />
        <circle v-else :cx="d.x" :cy="d.y" r="4" class="dot" :class="d.kind" :style="{ animationDelay: d.delay + 's' }" />
      </g>
      <text x="40" y="410" class="label dim">
        ● люди  ■ ближники  ◆ стрелки  ·  Ф ферма  Л лесопилка  К каменоломня  Ш шахта
      </text>
      <text v-if="st().bunker.people.outside > 0" x="530" y="394" class="label">СНАРУЖИ: {{ st().bunker.people.outside }}</text>
    </svg>
    <div v-if="st().rewardOffer" class="notice">
      НАГРАДА ЗА НОЧЬ: выберите в чате или консоли командой <b>reward 1|2|3</b> (см. вкладку ЧАТ)
    </div>
  </div>
</template>
