import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';
import type { CommandResult, GameEvent, GameState, PlayerInfo } from '@outpost/shared';
import { SoloSession } from '../game/session';

export type TabId = 'bunker' | 'battle' | 'stats' | 'duties' | 'chat' | 'console';
export type LineKind = 'in' | 'ok' | 'err' | 'log' | 'sys';
export interface ConsoleLine { id: number; kind: LineKind; text: string }
export interface ChatMsg { id: number; from: string; text: string; at: number }
export interface TabDef { id: TabId; label: string; disabled: boolean }

const MAX_LINES = 500;

/**
 * Состояние игры лежит в обычном объекте (его мутирует ядро), поэтому оно хранится
 * в shallowRef и «встряхивается» через triggerRef после каждого тика.
 * ВАЖНО: в компонентах читайте данные прямо из g.need() в шаблоне или в computed,
 * который возвращает НОВЫЕ значения. computed, возвращающий тот же объект state.bunker,
 * не обновится.
 */
export const useGameStore = defineStore('game', () => {
  const session = shallowRef<SoloSession | null>(null);
  const state = shallowRef<GameState | null>(null);
  const lines = ref<ConsoleLine[]>([]);
  const chat = ref<ChatMsg[]>([]);
  const history = ref<string[]>([]);
  const tab = ref<TabId>('bunker');
  const legendOpen = ref(true);
  const speed = ref(1);
  const gridVisible = ref(true);
  let timer: ReturnType<typeof setInterval> | null = null;
  let nextId = 1;
  const fx: GameEvent[] = []; // события для анимации боя (выстрелы), их забирает рендерер

  const started = computed(() => state.value !== null);
  const isNight = computed(() => state.value?.phase === 'night');
  const me = computed<PlayerInfo | null>(() => session.value?.me ?? null);

  const tabs = computed<TabDef[]>(() => {
    const night = isNight.value;
    return [
      night ? { id: 'battle', label: 'БОЙ', disabled: false } : { id: 'bunker', label: 'БУНКЕР', disabled: false },
      { id: 'stats', label: 'СТАТИСТИКА', disabled: night },
      { id: 'duties', label: 'ОБЯЗАННОСТИ', disabled: false },
      { id: 'chat', label: 'ЧАТ', disabled: false },
      { id: 'console', label: 'КОНСОЛЬ', disabled: false },
    ];
  });

  function need(): GameState {
    if (!state.value) throw new Error('Игра не запущена');
    return state.value;
  }

  function push(kind: LineKind, text: string): void {
    lines.value.push({ id: nextId++, kind, text });
    if (lines.value.length > MAX_LINES) lines.value.splice(0, lines.value.length - MAX_LINES);
  }

  function say(from: string, text: string): void {
    chat.value.push({ id: nextId++, from, text, at: Date.now() });
  }

  function setTab(id: TabId): void {
    const def = tabs.value.find((t) => t.id === id);
    if (def && !def.disabled) tab.value = id;
  }

  function handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.t === 'log') push('log', e.text);
      else if (e.t === 'shot') {
        fx.push(e);
        if (fx.length > 300) fx.splice(0, fx.length - 300);
      } else if (e.t === 'phase') {
        if (e.phase === 'night' && (tab.value === 'bunker' || tab.value === 'stats')) tab.value = 'battle';
        if (e.phase !== 'night' && tab.value === 'battle') tab.value = 'bunker';
        if (e.phase === 'gameover' && tab.value === 'battle') tab.value = 'console';
      }
    }
  }

  function drainFx(): GameEvent[] {
    return fx.length ? fx.splice(0, fx.length) : fx;
  }

  function startSolo(name: string): void {
    stop();
    lines.value = [];
    chat.value = [];
    const player: PlayerInfo = {
      id: 'solo',
      name: name.trim() || 'Выживший',
      roles: ['commander', 'farmer', 'manager', 'warden'],
    };
    const s = new SoloSession(player);
    session.value = s;
    state.value = s.state;
    tab.value = 'bunker';
    gridVisible.value = true;
    push('sys', 'ТЕРМИНАЛ БУНКЕРА v0.3. Введите help или откройте легенду справа.');
    say('СИСТЕМА', 'Чат отряда. Строка, начинающаяся с «/», выполняется как команда: /vote end, /reward 1.');
    handleEvents(s.flush());
    timer = setInterval(loop, 100);
  }

  function loop(): void {
    const s = session.value;
    if (!s) return;
    for (let i = 0; i < speed.value; i++) handleEvents(s.tick());
    triggerRef(state);
  }

  function stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  }

  /** Выполнить игровую команду. Результат пишется в консоль. */
  function exec(line: string): CommandResult {
    const s = session.value;
    if (!s) return { ok: false, lines: ['Игра не запущена'] };
    const local = line.trim().toLowerCase().split(/\s+/);
    if (local[0] === 'grid') {
      const ok = local.length === 2 && (local[1] === 'on' || local[1] === 'off');
      if (ok) gridVisible.value = local[1] === 'on';
      const result = { ok, lines: [ok ? `Сетка ${gridVisible.value ? 'включена' : 'выключена'}.` : 'Использование: grid on | grid off'] };
      for (const l of result.lines) push(ok ? 'ok' : 'err', l);
      return result;
    }
    const { result, events } = s.run(line);
    if (local[0] === 'help' && (!local[1] || local[1] === 'grid')) {
      if (local[1] === 'grid') { result.ok = true; result.lines = []; }
      result.lines.push('grid on | grid off — локальная координатная сетка');
    }
    for (const l of result.lines) push(result.ok ? 'ok' : 'err', l);
    handleEvents(events);
    triggerRef(state);
    return result;
  }

  /** Ввод из консоли: игровые команды и служебные (/speed, /clear). */
  function submit(raw: string): void {
    const text = raw.trim();
    if (!text) return;
    push('in', `> ${text}`);
    history.value.push(text);
    if (history.value.length > 100) history.value.shift();
    if (text.startsWith('/')) {
      const [cmd, arg] = text.slice(1).split(/\s+/);
      if (cmd === 'clear') lines.value = [];
      else if (cmd === 'speed') {
        speed.value = Math.min(50, Math.max(1, Number(arg) || 1));
        push('sys', `Скорость времени x${speed.value} (служебная команда для проверки баланса)`);
      } else push('err', `Служебной команды "/${cmd}" нет. Есть: /speed <n>, /clear`);
      return;
    }
    exec(text);
  }

  /** Ввод из чата: текст уходит в чат, а «/команда» выполняется. */
  function chatSubmit(raw: string): void {
    const text = raw.trim();
    if (!text) return;
    if (text.startsWith('/')) {
      const r = exec(text.slice(1));
      say('СИСТЕМА', r.lines.join(' ') || (r.ok ? 'Готово.' : 'Не получилось.'));
    } else {
      say(me.value?.name ?? '?', text);
    }
  }

  return {
    session, state, lines, chat, history, tab, legendOpen, speed, gridVisible,
    started, isNight, me, tabs,
    need, setTab, startSolo, stop, exec, submit, chatSubmit, drainFx,
  };
});
