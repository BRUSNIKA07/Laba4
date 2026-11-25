<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/game';
import { getRoomViews, ROLE_COLORS, ROLE_LABELS, type DotRole } from './rooms';
import BunkerRoom from './BunkerRoom.vue';
import RoomDetails from './RoomDetails.vue';
import { useBunkerCamera } from './useBunkerCamera';
const g=useGameStore();
const rooms=computed(()=>getRoomViews(g.need(),g.session!.b));
const selected=ref<string|null>(null);
const selection=computed(()=>rooms.value.find(r=>r.id===selected.value));
const maxLevel=computed(()=>g.session!.b.economy.maxRoomLevel);
const select=(id:string)=>{selected.value=id;};
const {svg,zoom,viewBox,dragging,wheel,down,move,up,reset}=useBunkerCamera(select);
const roles=Object.keys(ROLE_COLORS) as DotRole[];
</script>
<template>
  <div class="blueprint-wrap">
    <div class="blueprint-tools"><span>ПЛАН 001 / ДЕНЬ {{g.need().day}}</span><span class="dim tiny">Колесо · перетаскивание · клик</span><button class="btn small" @click="reset">{{Math.round(zoom*100)}}% / СБРОС</button></div>
    <div class="blueprint-map">
      <svg ref="svg" :viewBox="viewBox" class="blueprint-svg" :class="{dragging}" @wheel.prevent="wheel" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" aria-label="Интерактивный чертёж бункера">
        <defs><pattern id="wall-hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 L5 0" stroke="#a67536" stroke-width="1"/></pattern></defs>
        <rect x="0" y="0" width="1070" height="530" fill="#080705"/>
        <rect x="110" y="244" width="940" height="42" class="corridor"/>
        <text x="580" y="270" text-anchor="middle" class="corridor-title">Г Л А В Н Ы Й   К О Р И Д О Р</text>
        <BunkerRoom v-for="room in rooms" :key="room.id" :room="room" :selected="room.id===selected" :max-level="maxLevel" @select="select" />
        <text x="15" y="505" class="plan-mark">ОБЪЕКТ / LAST OUTPOST — ПЛАН БУНКЕРА</text>
        <text x="1045" y="505" text-anchor="end" class="plan-mark">ЛИСТ 01 / 01</text>
      </svg>
      <RoomDetails v-if="selection" :room="selection" :max-level="maxLevel" @close="selected=null"/>
    </div>
    <div class="blueprint-key"><span v-for="role in roles" :key="role"><i :style="{background:ROLE_COLORS[role]}"/>{{ROLE_LABELS[role]}}</span><span v-if="g.need().bunker.people.outside">Вне бункера: {{g.need().bunker.people.outside}}</span></div>
  </div>
</template>
