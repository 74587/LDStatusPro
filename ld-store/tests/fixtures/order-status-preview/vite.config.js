import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  root: fileURLToPath(new URL('../../../', import.meta.url)), envDir: false, plugins: [vue()],
  resolve: { alias: [
    { find: '@/utils/api', replacement: fileURLToPath(new URL('./api.js', import.meta.url)) },
    { find: '@', replacement: fileURLToPath(new URL('../../../src', import.meta.url)) }
  ] },
  server: { host: '127.0.0.1', port: 4181, strictPort: true,
    headers: { 'Content-Security-Policy': "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:4181; form-action 'none'" } }
})
