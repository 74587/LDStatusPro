import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
export default defineConfig({
  envDir: false,
  plugins: [vue(), {
    name: 'reject-unmocked-test-api',
    configureServer(server) {
      server.middlewares.use('/api', (_req, res) => {
        res.statusCode = 503
        res.end('Browser tests require an explicit API mock')
      })
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { 'import.meta.env.VITE_BUILD_VERSION': JSON.stringify('browser-test') },
  server: { host: '127.0.0.1', port: 4197, strictPort: true, open: false, hmr: false },
})
