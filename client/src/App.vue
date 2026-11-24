<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import TerminalShell from './terminal/TerminalShell.vue';
import { useGameStore } from './stores/game';

const g = useGameStore();
const name = ref('');

function onKey(e: KeyboardEvent): void {
  if (!g.started || !e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 5) {
    const t = g.tabs[n - 1];
    if (t) g.setTab(t.id);
    e.preventDefault();
  } else if (e.key.toLowerCase() === 'l') {
    g.legendOpen = !g.legendOpen;
    e.preventDefault();
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="screen">
    <div class="pip crt">
      <TerminalShell v-if="g.started" />
      <div v-else class="boot">
        <h1>LAST OUTPOST</h1>
        <p class="dim">Терминал бункера. Оборона от волн мутантов.</p>
        <label>
          ПОЗЫВНОЙ
          <input v-model="name" maxlength="16" placeholder="Выживший" @keydown.enter="g.startSolo(name)" />
        </label>
        <button class="btn" @click="g.startSolo(name)">[ НАЧАТЬ СОЛО ]</button>
        <p class="dim small">
          Сетевая игра, аккаунты и сохранения появятся на следующих этапах.<br />
          Горячие клавиши: Alt+1…5 — вкладки, Alt+L — легенда.
        </p>
      </div>
    </div>
  </div>
</template>
