<script setup lang="ts">
import {computed} from 'vue';
import ResidentLights from './ResidentLights.vue';
import type {RoomView} from './rooms';
const p=defineProps<{room:RoomView;selected:boolean;maxLevel:number}>();
const emit=defineEmits<{select:[id:string]}>();
const width=computed(()=>p.room.side==='gate'?95:145);
const height=computed(()=>p.room.side==='gate'?42:86+Math.max(0,p.room.level-1)*43);
const y=computed(()=>p.room.side==='gate'?244:p.room.side==='top'?244-height.value:286);
const lineY=computed(()=>p.room.side==='top'?244:286);
</script>
<template>
  <g :data-room="room.id" role="button" tabindex="0" :aria-label="room.title" class="blueprint-room" :class="{selected,problem:room.problem,unbuilt:room.level===0}" @keydown.enter.prevent="emit('select',room.id)" @keydown.space.prevent="emit('select',room.id)">
    <rect :x="room.x" :y="y" :width="width" :height="height" :fill="room.level?'url(#wall-hatch)':'#080705'" class="room-outline"/>
    <rect v-if="room.level" :x="room.x+4" :y="y+4" :width="width-8" :height="height-8" class="room-floor"/>
    <template v-if="room.side!=='gate'">
      <path v-if="room.level" :d="`M ${room.x+width/2-12} ${lineY} h24`" stroke="#080705" stroke-width="6"/>
      <path v-if="room.level" :d="`M ${room.x+width/2-12} ${lineY} v${room.side==='top'?-12:12}`" class="room-door"/>
    </template>
    <text :x="room.x+width/2" :y="y+15" class="room-title" text-anchor="middle">{{room.title}}</text>
    <text :x="room.x+width/2" :y="y+28" class="room-meta" text-anchor="middle">{{room.level ? (room.side==='gate'?room.subtitle:`УР. ${room.level}/${maxLevel}`):'НЕ ПОСТРОЕНО'}}</text>
    <text v-if="room.level&&room.side!=='gate'" :x="room.x+width/2" :y="y+40" class="room-subtitle" text-anchor="middle">{{room.subtitle}}</text>
    <ResidentLights v-if="room.level&&room.side!=='gate'" :dots="room.dots" :x="room.x+4" :y="y+49" :width="width-8"/>
  </g>
</template>
