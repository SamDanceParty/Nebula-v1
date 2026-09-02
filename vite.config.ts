import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Nebula-v1/', // 👈 Замените web-synth на точное имя вашего репозитория на GitHub
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
