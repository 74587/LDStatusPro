import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Never inherit the dev proxy or load production .env files in tests.
export default defineConfig({
  envDir: false,
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { setupFiles: ['./tests/network-sandbox.js'] }
})
