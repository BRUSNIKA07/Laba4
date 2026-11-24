<script setup lang="ts">
import { ASCII_LEGEND, renderAscii, ROLES } from '@outpost/shared';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { NightRenderer, SQUAD_COLORS } from '../../night/NightRenderer';
import { useGameStore } from '../../stores/game';
import ConsolePanel from '../ConsolePanel.vue';

const g = useGameStore();
const host = ref<HTMLElement | null>(null);
const failed = ref('');
let renderer: NightRenderer | null = null;

const info = () => {
  const n = g.need().night;
  if (!n) return '';
  const gate = g.need().bunker.structures.find((s) => s.kind === 'gate');
  return `ВРАГОВ ${n.enemies.length} (ЕЩЁ ${n.spawns.length}) · СОЛДАТ ${n.soldiers.length} · ВОРОТА ${Math.round(gate?.hp ?? 0)}/${gate?.maxHp ?? 0}`;
};
const ascii = () => renderAscii(g.need());

onMounted(async () => {
  if (!host.value) return;
  try {
    renderer = new NightRenderer(host.value, () => g.state, () => g.drainFx(), () => g.gridVisible);
    await renderer.init();
  } catch (e) {
    // если PixiJS не запустился, остаётся текстовый вид
    console.error(e);
    failed.value = e instanceof Error ? e.message : String(e);
  }
});
onBeforeUnmount(() => renderer?.destroy());
</script>

<template>
  <div class="battle">
    <div class="battle-top">
      <div v-show="!failed" ref="host" class="pixi-host"></div>
      <template v-if="failed">
        <div class="ln err">Графика не запустилась ({{ failed }}). Показан текстовый вид.</div>
        <pre class="ascii">{{ ascii() }}</pre>
        <div class="dim tiny">{{ ASCII_LEGEND }}</div>
      </template>
      <div class="small">{{ info() }}</div>
      <div class="small" style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center">
        <span v-for="role in ROLES" :key="role" :style="{color: '#' + SQUAD_COLORS[role].toString(16).padStart(6,'0')}">■ {{ role }}: {{ g.need().night?.soldiers.filter(s => s.squad === role).length ?? 0 }}</span>
        <span>Сетка: {{ g.gridVisible ? 'ON' : 'OFF' }}</span>
      </div>
    </div>
    <div class="battle-bottom"><ConsolePanel compact /></div>
  </div>
</template>
