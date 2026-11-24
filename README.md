# Last Outpost: Оборона Бункера

Монорепозиторий (npm workspaces). Готово: `shared/` (игровое ядро) и `client/` (Pip-Boy терминал, этап 3a, соло).

## Запуск
```bash
npm install
npm run test:shared     # 32 теста: роли, парсер, карта, A*, команды, цикл игры
npm run typecheck
npm run play            # консольная версия игры (см. ниже)
npm run dev             # Pip-Boy в браузере: http://localhost:5173
npm run build:shared    # tsup: ESM + CJS + .d.ts в shared/dist
```

## Что внутри shared/
| Папка | Назначение |
|---|---|
| `src/types/` | типы: роли, ресурсы, бункер, ночь, состояние партии, баланс |
| `src/protocol/` | события игры и сообщения клиент↔хост |
| `src/commands/` | парсер консоли, реестр команд (`registry.ts`), обработчики по ролям, легенда |
| `src/game/` | цикл `step()`, день/экономика, ночной бой, генератор карты, A*, вылазки, награды |
| `balance/*.json` | все числа баланса (читаются при запуске, пересборка не нужна) |
| `test/` | тесты (`node:test` через `tsx`) |

## Как пользоваться ядром
```ts
const b = parseBalance({ units, items, commands, waves, economy, rewards, sortie, map }); // JSON из balance/
const state = createGame(b, { seed: 123, players: [{ id: 'p1', name: 'Ivan', roles: ['commander','farmer','manager','warden'] }] });
const res = executeCommand(state, b, 'p1', 'send 3 people to farmer'); // { ok, lines }
setInterval(() => { step(state, b); const events = drainEvents(state); }, 100); // 10 тиков в секунду
```
`state` — обычный JSON (его можно сохранять в БД и рассылать), все случайности идут от `seed`.

## Роли и команды
`commander`, `farmer`, `manager`, `warden`. Полный список: команда `help` в игре или `src/commands/registry.ts`.

## Консольная игра (проверка ядра и баланса)
```bash
npm run play                      # соло, реальное время
npm run play -- --speed 5         # время быстрее в 5 раз
npm run play -- --players 4       # четверо: /as anna, /as boris, /as clara, /as dima
```
Внутри игры: `help`, `status`, `/map` (карта ночи), `/speed 10`, `/quit`.

## Клиент (client/)
`npm run dev` из корня запускает Vite. Клиент берёт `shared` прямо из исходников и читает баланс из `shared/balance/*.json`
(при правке JSON страница перезагружается сама).
Горячие клавиши: Alt+1…5 — вкладки, Alt+L — легенда. Служебные команды консоли: `/speed 10` (ускорить время), `/clear`.
Ночью вкладка «Бункер» превращается в «Бой», а «Статистика» гаснет.

## Ночной бой (PixiJS) и спрайты
Бой рисует `client/src/night/NightRenderer.ts`. Клетка 32x32, пока цветные кубики. Чтобы подменить любой спрайт,
положите PNG в `client/src/assets/sprites/` (имена и размеры в README той папки). После `git pull`/обновления выполните `npm install` (добавлен pixi.js).
