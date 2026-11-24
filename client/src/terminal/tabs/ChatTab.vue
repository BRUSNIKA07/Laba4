<script setup lang="ts">
import { majority } from '@outpost/shared';
import { nextTick, ref, watch } from 'vue';
import { useGameStore } from '../../stores/game';

const g = useGameStore();
const st = () => g.need();
const text = ref('');
const listEl = ref<HTMLElement | null>(null);

const time = (t: number) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
function send(): void {
  g.chatSubmit(text.value);
  text.value = '';
}
watch(
  () => g.chat.length,
  async () => {
    await nextTick();
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  },
);
</script>

<template>
  <div class="chat">
    <div ref="listEl" class="chat-list">
      <div v-for="m in g.chat" :key="m.id" class="msg" :class="{ sys: m.from === 'СИСТЕМА' }">
        <span class="dim">{{ time(m.at) }}</span> <b>{{ m.from }}:</b> {{ m.text }}
      </div>
    </div>
    <div v-if="st().phase === 'day'" class="vote">
      <div class="vote-title">ГОЛОСОВАНИЕ</div>
      <div v-if="st().rewardOffer">
        Выберите награду за ночь (нужно голосов: {{ majority(st().players.length) }}):
        <button v-for="(id, i) in st().rewardOffer" :key="id" class="btn small" @click="g.chatSubmit(`/reward ${i + 1}`)">
          {{ i + 1 }}) {{ g.session!.b.rewards.find((r) => r.id === id)?.text }}
        </button>
      </div>
      <div v-else>
        Закончить день и начать ночь?
        <button class="btn small" @click="g.chatSubmit('/vote end')">ЗА (vote end)</button>
        <span class="dim"> голосов {{ Object.keys(st().votes.endDay).length }}/{{ majority(st().players.length) }}</span>
      </div>
    </div>
    <div class="chat-in">
      <span class="prompt">&gt;</span>
      <input v-model="text" placeholder="сообщение или /команда (например /vote end)" spellcheck="false" @keydown.enter="send" />
    </div>
  </div>
</template>
