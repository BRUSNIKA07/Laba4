import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// shared подключаем прямо из исходников: пересборка shared для клиента не нужна.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@outpost/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
  },
  server: { port: 5173, fs: { allow: ['..'] } },
});
