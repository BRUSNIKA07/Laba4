<script setup lang="ts">
import { majority, totalPeople } from '@outpost/shared';
import { useGameStore } from '../stores/game';

const g = useGameStore();
const st = () => g.need();

function gate(): { hp: number; max: number } {
  const x = st().bunker.structures.find((s) => s.kind === 'gate');
  return { hp: Math.round(x?.hp ?? 0), max: x?.maxHp ?? 0 };
}
function people(): number { return totalPeople(st().bunker); }
</script>

<template>
  <footer class="status">
    <div class="cell">ВОРОТА {{ gate().hp }}/{{ gate().max }}</div>
    <div class="cell">ЛЮДИ {{ people() }}</div>
    <div class="cell grow">
      <template v-if="st().phase === 'day'">
        ДЕНЬ {{ st().day }} · БЕЗ ТАЙМЕРА
        · ГОЛОСОВ {{ Object.keys(st().votes.endDay).length }}/{{ majority(st().players.length) }}
      </template>
      <template v-else-if="st().phase === 'night'">
        НОЧЬ {{ st().day }} · ВРАГОВ {{ st().night?.enemies.length ?? 0 }}
      </template>
      <template v-else>ИГРА ОКОНЧЕНА · ПРОЖИТО ДНЕЙ {{ st().day }}</template>
    </div>
    <div class="cell">{{ g.me?.name }}</div>
  </footer>
</template>
