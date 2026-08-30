// Isolated manual UI fixture: no .env, proxies, database, or external API access.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

if (process.env.NODE_ENV === 'production') throw new Error('UI fixtures cannot run in production')
const root = fileURLToPath(new URL('../', import.meta.url))
let rotation = 0
const server = await createServer({ configFile: false, root, envDir: false, plugins: [vue(), {
  name: 'isolated-catalog-fixture', configureServer(server) { server.middlewares.use(fixture) }
}],
  resolve: { alias: { '@': `${root}/src` } },
  define: { 'import.meta.env.VITE_FARO_ENABLED': JSON.stringify('0') },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
})
async function fixture(req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:4174")
  const url = new URL(req.url, 'http://127.0.0.1:4174')
  if (!url.pathname.startsWith('/api/')) return next()
  res.setHeader('Content-Type', 'application/json')
  let data = {}
  if (url.pathname === '/api/shop/categories') data = { categories: [{ id: 1, name: '数码好物' }] }
  if (url.pathname === '/api/shop/system-status') data = { maintenanceMode: 'normal', mode: 'normal', maintenance: { mode: 'normal' } }
  if (url.pathname === '/api/shop/products') {
    rotation++
    if (rotation > 1) await new Promise(resolve => setTimeout(resolve, 1200))
    if (rotation === 3) {
      res.statusCode = 503
      return res.end(JSON.stringify({ success: false, error: '模拟换批失败，原列表仍可浏览' }))
    }
    const start = (rotation - 1) * 7
    data = { products: Array.from({ length: 20 }, (_, i) => ({
      id: start + i + 1, name: `本地推荐样品 ${start + i + 1}`, description: '仅用于本地交互验收',
      product_type: 'normal', category_id: 1, category_name: '数码好物', seller_username: 'fixture',
      price: 10 + i, stock: 10, available_stock: 10, created_at: new Date().toISOString(),
      discovery_token: `fixture-${rotation}-${i}`, status: 'approved',
    })), pagination: { total: 20, hasMore: false }, rankingContext: { slateId: crypto.randomUUID(), version: 'catalog-recommended-v2.2@ui-fixture' } }
  }
  res.end(JSON.stringify({ success: true, data }))
}
await server.listen()
console.log('Isolated catalog UI: http://127.0.0.1:4174 (second batch succeeds; third batch fails)')
