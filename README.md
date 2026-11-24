# Last Outpost: Оборона Бункера

Монорепозиторий (npm workspaces). Готово: `shared/` (игровое ядро) и `client/` (Pip-Boy, PixiJS, этап 3b.2.1, соло).

## Запуск
```bash
npm install
npm run test:shared     # 37 тестов: роли, парсер, карта, A*, команды, цикл игры
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
const b = parseBalance({ units, items, commands, waves, economy, rewards, sortie, map, squads }); // JSON из balance/
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

## Этап 3b.2.1: отряды и сетка

- Ночью `battle list` показывает живых бойцов, их позывные, отряды, секторы, HP и права управления.
- `grid off` и `grid on` — клиентские команды, меняющие видимость сетки A1–H8.
- Пропорции отрядов — `shared/balance/squads.json`. Позывные живых сохраняются между ночами.
- Карта создаётся один раз при старте партии. Дисковые сохранения ещё не реализованы.
- Для проверки быстро начните ночь командой `vote end`. В бою введите `battle list`, `grid off`, `grid on`.
- Команды перемещения `battle M01 G3`, камера, туман войны, лечение и остальные согласованные механики будут в следующих обновлениях.
- См. `DESIGN.md` и `CHANGELOG.md`.

### Проверка на Windows (PowerShell)

Распакуйте архив в новую папку и откройте вложенную папку `last-outpost` в VS Code. Не смешивайте версии.

```powershell
node -v
npm install
npm run test:shared
npm run typecheck
npm run dev
```

Требуется Node.js 20+ (предпочтительно 22 LTS). Откройте http://localhost:5173.

### Этап 3b.2.2 — управление ночью
Начните ночь, введите `battle list`, затем используйте существующий позывной, например `battle M01 G3`, `battle M01 hold`, `battle M01 retreat`, `battle M01 auto`. В соло также доступны `battle all G3`, `battle all auto`, `battle farmer B2`, `battle ranged F5`. `battle squad` выбирает отряды ваших ролей. Пунктир указывает назначение. Настройки находятся в `shared/balance/tactics.json`. Графический клиент необходимо проверить в браузере.
