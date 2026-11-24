<script setup lang="ts">
import { RESOURCES, RESOURCE_TITLES, ROLE_TITLES, armyLevel, totalPeople } from '@outpost/shared';
import { useGameStore } from '../../stores/game';

const g = useGameStore();
const st = () => g.need();
const bar = (v: number, max: number, len = 14): string => {
  const f = max > 0 ? Math.max(0, Math.min(len, Math.round((v / max) * len))) : 0;
  return '█'.repeat(f) + '░'.repeat(len - f);
};
const level = () => armyLevel(st(), g.session!.b);
</script>

<template>
  <div class="stats">
    <section>
      <h3>БУНКЕР</h3>
      <div>День: {{ st().day }} · ночей пережито: {{ st().day - 1 }}</div>
      <div>Людей: {{ totalPeople(st().bunker) }} / {{ Math.min(st().bunker.housing, g.session!.b.economy.maxPeople) }}</div>
      <div>Убито врагов: {{ st().stats.kills }} · потеряно людей: {{ st().stats.peopleLost }}</div>
    </section>

    <section>
      <h3>РЕСУРСЫ</h3>
      <div v-for="r in RESOURCES" :key="r" class="row">
        <span>{{ RESOURCE_TITLES[r] }}</span><b>{{ Math.floor(st().treasury[r]) }}</b>
      </div>
    </section>

    <section>
      <h3>ЛЮДИ</h3>
      <div class="row"><span>свободные</span><b>{{ st().bunker.people.idle }}</b></div>
      <div class="row"><span>фермеры</span><b>{{ st().bunker.people.farmers }}</b></div>
      <div class="row"><span>новобранцы</span><b>{{ st().bunker.people.recruits }}</b></div>
      <div class="row"><span>резерв смотрителя</span><b>{{ st().bunker.people.scouts }}</b></div>
      <div class="row"><span>на вылазке</span><b>{{ st().bunker.people.outside }}</b></div>
    </section>

    <section>
      <h3>АРМИЯ</h3>
      <div class="row"><span>ближники</span><b>{{ st().bunker.army.melee }}</b></div>
      <div class="row"><span>стрелки</span><b>{{ st().bunker.army.ranged }}</b></div>
      <div class="row"><span>уровень</span><b>{{ level() }}</b></div>
      <div class="row"><span>бонус урона / здоровья</span><b>+{{ Math.round(st().bunker.army.damageBonus * 100) }}% / +{{ Math.round(st().bunker.army.healthBonus * 100) }}%</b></div>
    </section>

    <section>
      <h3>ОБОРОНА</h3>
      <div v-for="s in st().bunker.structures" :key="s.id" class="row mono">
        <span>{{ s.id }} {{ s.turret ?? s.kind }} ур.{{ s.level }}</span>
        <span>{{ bar(s.hp, s.maxHp) }} {{ Math.round(s.hp) }}/{{ s.maxHp }}</span>
      </div>
    </section>

    <section>
      <h3>ОТРЯД</h3>
      <div v-for="p in st().players" :key="p.id" class="row">
        <span>{{ p.name }}</span><b>{{ p.roles.map((r) => ROLE_TITLES[r]).join(', ') }}</b>
      </div>
    </section>
  </div>
</template>
