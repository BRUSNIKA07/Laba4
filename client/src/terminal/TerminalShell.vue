<script setup lang="ts">
import { useGameStore } from '../stores/game';
import StatusBar from './StatusBar.vue';
import BattleTab from './tabs/BattleTab.vue';
import BunkerTab from './tabs/BunkerTab.vue';
import ChatTab from './tabs/ChatTab.vue';
import ConsoleTab from './tabs/ConsoleTab.vue';
import DutiesTab from './tabs/DutiesTab.vue';
import StatsTab from './tabs/StatsTab.vue';

const g = useGameStore();
</script>

<template>
  <div class="shell">
    <nav class="tabs">
      <button
        v-for="(t, i) in g.tabs"
        :key="t.id"
        class="tab"
        :class="{ active: g.tab === t.id, disabled: t.disabled }"
        :disabled="t.disabled"
        :title="`Alt+${i + 1}`"
        @click="g.setTab(t.id)"
      >
        {{ t.label }}
      </button>
    </nav>
    <section class="view">
      <BunkerTab v-if="g.tab === 'bunker'" />
      <BattleTab v-else-if="g.tab === 'battle'" />
      <StatsTab v-else-if="g.tab === 'stats'" />
      <DutiesTab v-else-if="g.tab === 'duties'" />
      <ChatTab v-else-if="g.tab === 'chat'" />
      <ConsoleTab v-else />
    </section>
    <StatusBar />
  </div>
</template>
