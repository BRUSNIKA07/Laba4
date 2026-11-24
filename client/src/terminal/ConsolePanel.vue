<script setup lang="ts">
import { COMMANDS } from '@outpost/shared';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/game';
import Legend from './Legend.vue';

defineProps<{ compact?: boolean }>();
const g = useGameStore();

const input = ref('');
const histIdx = ref(-1);
const outEl = ref<HTMLElement | null>(null);
const inEl = ref<HTMLInputElement | null>(null);
const verbs = [...new Set([...COMMANDS.map((c) => c.usage.split(' ')[0]!), 'grid'])];

function send(): void {
  g.submit(input.value);
  input.value = '';
  histIdx.value = -1;
}

function onKey(e: KeyboardEvent): void {
  const h = g.history;
  if (e.key === 'ArrowUp' && h.length) {
    histIdx.value = histIdx.value < 0 ? h.length - 1 : Math.max(0, histIdx.value - 1);
    input.value = h[histIdx.value] ?? '';
    e.preventDefault();
  } else if (e.key === 'ArrowDown' && histIdx.value >= 0) {
    histIdx.value++;
    input.value = histIdx.value >= h.length ? '' : (h[histIdx.value] ?? '');
    if (histIdx.value >= h.length) histIdx.value = -1;
    e.preventDefault();
  } else if (e.key === 'Tab') {
    // автодополнение первого слова
    const t = input.value.trimStart().toLowerCase();
    if (t && !t.includes(' ')) {
      const m = verbs.filter((v) => v.startsWith(t));
      if (m.length === 1) input.value = m[0]! + ' ';
    }
    e.preventDefault();
  }
}

function pick(text: string): void {
  input.value = text;
  inEl.value?.focus();
}

watch(
  () => g.lines.length,
  async () => {
    await nextTick();
    if (outEl.value) outEl.value.scrollTop = outEl.value.scrollHeight;
  },
);
onMounted(() => {
  inEl.value?.focus();
  if (outEl.value) outEl.value.scrollTop = outEl.value.scrollHeight;
});
</script>

<template>
  <div class="console" :class="{ compact }" @click="inEl?.focus()">
    <div class="console-main">
      <div class="console-bar">
        <span class="dim">КОНСОЛЬ · Tab — дополнить · ↑↓ — история</span>
        <button class="btn small" @click.stop="g.legendOpen = !g.legendOpen">
          {{ g.legendOpen ? 'СКРЫТЬ ЛЕГЕНДУ' : 'ЛЕГЕНДА' }}
        </button>
      </div>
      <div ref="outEl" class="console-out">
        <div v-for="l in g.lines" :key="l.id" class="ln" :class="l.kind">{{ l.text }}</div>
      </div>
      <div class="console-in">
        <span class="prompt">&gt;</span>
        <input
          ref="inEl"
          v-model="input"
          spellcheck="false"
          autocomplete="off"
          placeholder="введите команду, например help"
          @keydown.enter="send"
          @keydown="onKey"
        />
      </div>
    </div>
    <Legend v-if="g.legendOpen" :class="{ overlay: compact }" @pick="pick" />
  </div>
</template>
