import { defineConfig } from 'tsup';

// Собираем и ESM (для Vite/клиента), и CJS (для NestJS), плюс .d.ts.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
