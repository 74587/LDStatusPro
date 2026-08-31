import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Never inherit the application's production proxy or .env files.
export default defineConfig({
  root: fileURLToPath(new URL('../../../', import.meta.url)),
  envDir: false,
  plugins: [vue()],
  resolve: { alias: [
    { find: '@/utils/api', replacement: fileURLToPath(new URL('./api.js', import.meta.url)) },
    { find: '@', replacement: fileURLToPath(new URL('../../../src', import.meta.url)) }
  ] },
  server: {
    host: '127.0.0.1', port: 4179, strictPort: true, open: false,
    headers: { 'Content-Security-Policy': "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:4179; form-action 'none'; frame-src 'none'" }
  }
})
