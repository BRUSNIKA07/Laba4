/**
 * Консольная версия игры для проверки ядра и баланса (без интерфейса).
 *   npm run play                    — соло, реальное время
 *   npm run play -- --speed 5       — время идёт в 5 раз быстрее
 *   npm run play -- --players 2     — двое (Anna: commander+farmer, Boris: manager+warden)
 *   npm run play -- --players 4     — четверо (anna, boris, clara, dima)
 *   npm run play -- --seed 42       — тот же мир каждый раз
 * Внутри: обычные команды игры (help, status...), плюс
 *   /as <имя>  сменить игрока   /map  карта ночи   /speed <n>   /quit
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  ASCII_LEGEND, createGame, drainEvents, executeCommand, parseBalance, renderAscii, step,
  type GameEvent, type GameState, type PlayerInfo,
} from '../src';

const argv = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : def;
};

const dir = join(import.meta.dirname, '..', 'balance');
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const b = parseBalance({
  units: read('units.json'), items: read('items.json'), commands: read('commands.json'),
  waves: read('waves.json'), economy: read('economy.json'), rewards: read('rewards.json'),
  sortie: read('sortie.json'), map: read('map.json'),
});

const count = Number(arg('--players', '1'));
const players: PlayerInfo[] =
  count === 4
    ? [
        { id: 'anna', name: 'Anna', roles: ['commander'] },
        { id: 'boris', name: 'Boris', roles: ['farmer'] },
        { id: 'clara', name: 'Clara', roles: ['manager'] },
        { id: 'dima', name: 'Dima', roles: ['warden'] },
      ]
    : count === 2
      ? [
          { id: 'anna', name: 'Anna', roles: ['commander', 'farmer'] },
          { id: 'boris', name: 'Boris', roles: ['manager', 'warden'] },
        ]
      : [{ id: 'solo', name: 'Solo', roles: ['commander', 'farmer', 'manager', 'warden'] }];

const state: GameState = createGame(b, { seed: Number(arg('--seed', String(Date.now() % 100000))), players });
let me = players[0]!.id;
let speed = Number(arg('--speed', '1'));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const prompt = () => {
  rl.setPrompt(`[${me} | ${state.phase === 'night' ? 'ночь' : 'день'} ${state.day}]> `);
  rl.prompt(true);
};
const out = (text: string) => {
  process.stdout.write('\r\x1b[K' + text + '\n');
  prompt();
};

function renderMap(s: GameState): string {
  return renderAscii(s) + '\n' + ASCII_LEGEND;
}

function show(events: GameEvent[]) {
  for (const e of events) {
    if (e.t === 'log') out(e.text);
    else if (e.t === 'death' && e.side === 'soldier') out(`   † погиб солдат (${e.kind})`);
  }
}

out('Last Outpost, консольный режим. help — список команд, /map — карта, /quit — выход.');
show(drainEvents(state));

setInterval(() => {
  for (let i = 0; i < speed; i++) {
    step(state, b);
    show(drainEvents(state));
    if (state.phase === 'night' && state.night && state.tick % 50 === 0) {
      const gate = state.bunker.structures.find((s) => s.kind === 'gate');
      out(`   [бой] враги ${state.night.enemies.length}(+${state.night.spawns.length}), солдат ${state.night.soldiers.length}, ворота ${Math.round(gate?.hp ?? 0)}/${gate?.maxHp ?? 0}`);
    }
  }
}, 100);

rl.on('line', (line) => {
  const text = line.trim();
  if (text === '/quit') process.exit(0);
  if (text === '/map') return out(renderMap(state));
  if (text.startsWith('/speed')) { speed = Math.max(1, Number(text.split(/\s+/)[1]) || 1); return out(`Скорость x${speed}`); }
  if (text.startsWith('/as')) {
    const who = players.find((p) => p.id === text.split(/\s+/)[1]?.toLowerCase());
    if (!who) return out(`Игроки: ${players.map((p) => `${p.id} (${p.roles.join('+')})`).join(', ')}`);
    me = who.id;
    return out(`Вы теперь ${who.name}: ${who.roles.join(', ')}`);
  }
  if (!text) return prompt();
  const res = executeCommand(state, b, me, text);
  for (const l of res.lines) process.stdout.write('\r\x1b[K' + (res.ok ? '' : '! ') + l + '\n');
  show(drainEvents(state));
  prompt();
});
rl.on('close', () => process.exit(0));
prompt();
