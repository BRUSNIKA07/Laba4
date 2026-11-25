<script setup lang="ts">
import type { RoomView } from './rooms';
import { ROLE_LABELS } from './rooms';
defineProps<{room:RoomView;maxLevel:number}>();
const emit=defineEmits<{close:[]}>();
</script>
<template>
  <section class="room-details" aria-label="Информация о помещении" @keydown.esc="emit('close')">
    <header><strong>{{room.title}}</strong><button class="btn small" @click="emit('close')" aria-label="Закрыть">×</button></header>
    <div class="dim tiny">{{room.role?ROLE_LABELS[room.role]:'Системное помещение'}} · {{room.level?`УРОВЕНЬ ${room.level}/${maxLevel}`:'НЕ ПОСТРОЕНО'}}</div>
    <p v-if="room.problem" class="blueprint-warning">{{room.problem}}</p>
    <ul class="room-data"><li v-for="(line,i) in room.details" :key="i">{{line}}</li></ul>
    <h4>КОМАНДЫ / УСЛОВИЯ</h4>
    <div v-for="a in room.actions" :key="a.command" class="room-action">
      <code>{{a.command}}</code><div v-if="a.cost" class="small">Цена: {{a.cost}}</div><div class="dim tiny">{{a.condition}}</div>
    </div>
    <p class="dim tiny">Управление — только через консоль.</p>
  </section>
</template>
