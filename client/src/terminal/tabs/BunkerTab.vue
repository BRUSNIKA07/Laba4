<script setup lang="ts">
import { computed } from 'vue';
import { dailyProduction, totalPeople, RESOURCES, RESOURCE_TITLES, majority } from '@outpost/shared';
import { useGameStore } from '../../stores/game';
import BunkerBlueprint from '../../bunker/BunkerBlueprint.vue';
import { incomeText,numberText,getRoomViews } from '../../bunker/rooms';
import ConsolePanel from '../ConsolePanel.vue';
const g=useGameStore();
const st=()=>g.need();
const balance=()=>g.session!.b;
const forecast=computed(()=>dailyProduction(st(),balance()));
const warnings=computed(()=>getRoomViews(st(),balance()).filter(r=>r.problem).map(r=>r.problem));
</script>
<template>
  <div class="day-screen">
    <div class="day-header">
      <div class="day-readouts"><span>ДЕНЬ {{st().day}} / БЕЗ ТАЙМЕРА</span><span>ЖИТЕЛИ {{totalPeople(st().bunker)}}/{{Math.min(st().bunker.housing,balance().economy.maxPeople)}}</span><span>СВОБОДНО {{st().bunker.people.idle}}</span><span>ГОЛОСА {{Object.keys(st().votes.endDay).length}}/{{majority(st().players.length)}}</span></div>
      <div class="day-readouts tiny"><span v-for="k in RESOURCES" :key="k">{{RESOURCE_TITLES[k].toUpperCase()}} {{numberText(st().treasury[k])}}</span></div>
      <div class="day-readouts tiny dim"><span>ЭНЕРГИЯ —</span><span>КИСЛОРОД —</span><span>ВОДА —</span><span>ЖИЗНЕОБЕСПЕЧЕНИЕ: В РАЗРАБОТКЕ</span></div>
      <div class="day-readouts tiny"><span>ПРОГНОЗ / ДЕНЬ: {{incomeText(forecast)}}</span><span>ОЖИДАЕТ РАССВЕТА: {{incomeText(st().pendingIncome)}}</span></div>
      <div v-if="warnings.length" class="blueprint-warning tiny">{{warnings.join(' · ')}}</div>
    </div>
    <div class="day-main"><BunkerBlueprint/><aside class="day-console"><ConsolePanel compact/></aside></div>
    <div v-if="st().rewardOffer" class="notice tiny">Награда за ночь: введите reward 1, reward 2 или reward 3 (варианты: status).</div>
  </div>
</template>
