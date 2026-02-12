import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/login': { target: 'http://localhost:3333' },
      '/register': { target: 'http://localhost:3333' },
      '/fornecedores': { target: 'http://localhost:3333' },
      '/produtos': { target: 'http://localhost:3333' },
      '/clientes': { target: 'http://localhost:3333' },
      '/vendas': { target: 'http://localhost:3333' },
      '/acertos': { target: 'http://localhost:3333' },
      '/dashboard': { target: 'http://localhost:3333' },
      '/usuarios': { target: 'http://localhost:3333' }
    }
  }
});
