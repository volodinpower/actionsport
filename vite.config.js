import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
    server: {
      proxy: {
        '/popular-products': 'http://localhost:8000',
        '/random-products': 'http://localhost:8000',
        '/products': 'http://localhost:8000',
        '/admin': 'http://localhost:8000',
        '/api': 'http://localhost:8000',
        '/brands': 'http://localhost:8000',
        '/banners': 'http://localhost:8000',
        '/token': 'http://localhost:8000',
        '/search_smart': 'http://localhost:8000',
        '/categories': 'http://localhost:8000',
        '/sizes': 'http://localhost:8000',            // <--- добавь!
        '/genders': 'http://localhost:8000',          // <--- добавь!
      },
    },
  };
});
