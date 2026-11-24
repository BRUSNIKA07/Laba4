import type { ArgValue, CommandArgs, CommandSpec } from '../types/commands';

/**
 * Язык шаблонов команд:
 *   send <n:int> people to <target:word>   — слова вперемешку с аргументами
 *   <kind:farm|lumber|quarry|mine>         — аргумент из списка вариантов
 *   [<type:basic|rapid|heavy>]             — необязательный последний аргумент
 */
type Elem =
  | { k: 'lit'; word: string }
  | { k: 'int'; name: string; optional: boolean }
  | { k: 'word'; name: string; optional: boolean }
  | { k: 'enum'; name: string; options: string[]; optional: boolean };

const cache = new Map<string, Elem[]>();

function compile(pattern: string): Elem[] {
  const hit = cache.get(pattern);
  if (hit) return hit;
  const elems: Elem[] = pattern.split(/\s+/).map((tok) => {
    let optional = false;
    let t = tok;
    if (t.startsWith('[') && t.endsWith(']')) {
      optional = true;
      t = t.slice(1, -1);
    }
    const m = /^<([a-z]+):([^>]+)>$/.exec(t);
    if (!m) return { k: 'lit', word: t };
    const name = m[1]!;
    const type = m[2]!;
    if (type === 'int') return { k: 'int', name, optional };
    if (type === 'word') return { k: 'word', name, optional };
    return { k: 'enum', name, options: type.split('|'), optional };
  });
  cache.set(pattern, elems);
  return elems;
}

function matchTokens(tokens: string[], elems: Elem[]): CommandArgs | null {
  const args: CommandArgs = {};
  let i = 0;
  for (const el of elems) {
    const tok = tokens[i];
    if (tok === undefined) {
      if (el.k !== 'lit' && el.optional) continue;
      return null;
    }
    let value: ArgValue;
    switch (el.k) {
      case 'lit':
        if (tok !== el.word) return null;
        i++;
        continue;
      case 'int':
        if (!/^\d{1,6}$/.test(tok)) return null;
        value = Number(tok);
        break;
      case 'word':
        value = tok;
        break;
      case 'enum':
        if (!el.options.includes(tok)) return null;
        value = tok;
        break;
    }
    args[el.name] = value;
    i++;
  }
  return i === tokens.length ? args : null;
}

export interface ParsedCommand {
  spec: CommandSpec;
  args: CommandArgs;
}

export type ParseResult =
  | { ok: true; cmd: ParsedCommand }
  | { ok: false; error: string; hints: string[] };

export function tokenize(line: string): string[] {
  return line.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Разбирает строку консоли. Порядок в specs важен: первое совпадение побеждает. */
export function parseCommand(line: string, specs: readonly CommandSpec[]): ParseResult {
  const tokens = tokenize(line);
  if (tokens.length === 0) return { ok: false, error: '', hints: [] };
  for (const spec of specs) {
    for (const p of spec.patterns) {
      const args = matchTokens(tokens, compile(p));
      if (args) return { ok: true, cmd: { spec, args } };
    }
  }
  // не подошло: подсказываем команды с тем же первым словом
  const verb = tokens[0]!;
  const hints = specs.filter((s) => s.usage.split(' ')[0] === verb).map((s) => s.usage);
  if (hints.length > 0) return { ok: false, error: `Неверные аргументы команды "${verb}". Варианты:`, hints };
  return { ok: false, error: `Неизвестная команда "${verb}". Введите help.`, hints: [] };
}
