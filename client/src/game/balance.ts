import { parseBalance, type Balance } from '@outpost/shared';

// Баланс лежит в shared/balance/*.json. Vite подхватывает файлы при запуске,
// а в режиме dev страница сама перезагружается при правке JSON.
const files = import.meta.glob('../../../shared/balance/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

function pick(name: string): unknown {
  const key = Object.keys(files).find((k) => k.endsWith(`/${name}.json`));
  if (!key) throw new Error(`Не найден файл баланса ${name}.json`);
  return files[key];
}

export function loadBalance(): Balance {
  return parseBalance({
    units: pick('units'), items: pick('items'), commands: pick('commands'), waves: pick('waves'),
    economy: pick('economy'), rewards: pick('rewards'), sortie: pick('sortie'), map: pick('map'), squads: pick('squads'), tactics: pick('tactics'),
  });
}
