<script setup lang="ts">
import { buildLegend, phaseLabel, type CommandPhase } from '@outpost/shared';
import { computed } from 'vue';
import { useGameStore } from '../stores/game';

const emit = defineEmits<{ pick: [text: string] }>();
const g = useGameStore();

// Новые объекты на каждый пересчёт, чтобы computed не «залипал».
const sections = computed(() => buildLegend(g.me?.roles ?? []).map((s) => ({ ...s, entries: [...s.entries] })));

function usable(p: CommandPhase): boolean {
  const phase = g.state?.phase;
  return p === 'both' || p === phase;
}

/** В поле ввода попадает начало команды до первого аргумента. */
function head(usage: string): string {
  const i = usage.search(/[<[]/);
  return (i < 0 ? usage : usage.slice(0, i)).trimEnd() + ' ';
}
</script>

<template>
  <aside class="legend">
    <header>ЛЕГЕНДА <button class="btn small" @click.stop="g.legendOpen=false">×</button> <span class="dim small">нажмите на команду</span></header>
    <div class="legend-body">
      <section><h4>ОТОБРАЖЕНИЕ</h4>
        <button class="entry" @click="emit('pick', 'grid on')"><span class="usage">grid on</span><span class="desc">Показать сетку A1–H8</span></button>
        <button class="entry" @click="emit('pick', 'grid off')"><span class="usage">grid off</span><span class="desc">Скрыть сетку</span></button>
      </section>
      <section v-for="sec in sections" :key="sec.title">
        <h4>{{ sec.title }}</h4>
        <button
          v-for="e in sec.entries"
          :key="e.usage"
          class="entry"
          :class="{ off: !usable(e.phase) }"
          :title="e.description"
          @click="emit('pick', head(e.usage))"
        >
          <span class="usage">{{ e.usage }}</span>
          <span class="badge">{{ phaseLabel(e.phase) }}</span>
          <span class="desc">{{ e.description }}</span>
        </button>
      </section>
    </div>
  </aside>
</template>
