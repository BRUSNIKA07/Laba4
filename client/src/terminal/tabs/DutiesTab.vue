<script setup lang="ts">
import { computed } from 'vue';
import { ROLE_INFO } from '../../data/roles';
import { useGameStore } from '../../stores/game';

const g = useGameStore();
const roles = computed(() => [...(g.me?.roles ?? [])]);
</script>

<template>
  <div class="duties">
    <p class="dim">Ваши роли. Команды каждой роли смотрите в легенде на вкладке КОНСОЛЬ (Alt+L).</p>
    <article v-for="r in roles" :key="r" class="role-card">
      <h3>{{ ROLE_INFO[r].title }}</h3>
      <p>{{ ROLE_INFO[r].summary }}</p>
      <ul>
        <li v-for="d in ROLE_INFO[r].duties" :key="d">{{ d }}</li>
      </ul>
    </article>
  </div>
</template>
