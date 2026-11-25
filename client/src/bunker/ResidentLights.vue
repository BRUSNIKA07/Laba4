<script setup lang="ts">
import { ROLE_COLORS, type DotRole } from './rooms';
const props=defineProps<{dots:DotRole[];x:number;y:number;width:number}>();
const cx=(i:number)=>props.x+10+(i%12)*(props.width-20)/11;
const cy=(i:number)=>props.y+Math.floor(i/12)*7;
</script>
<template>
  <g aria-hidden="true" pointer-events="none">
    <g v-for="(role,i) in dots" :key="i" :transform="`translate(${cx(i)} ${cy(i)})`">
      <circle r="2.9" :fill="ROLE_COLORS[role]" class="resident-light" :style="{animationDelay:`-${(i*0.37)%5}s`,color:ROLE_COLORS[role]}"></circle>
    </g>
  </g>
</template>
