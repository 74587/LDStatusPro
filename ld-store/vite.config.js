import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'

// Route dev-server proxies through the local HTTP proxy when set (e.g.
// HTTPS_PROXY=http://127.0.0.1:7897) — Node itself ignores the system proxy,
// so Cloudflare-hosted backends are unreachable without this on some networks.
const proxyEnv = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
const proxyAgent = proxyEnv ? new HttpsProxyAgent(proxyEnv) : undefined
const privateBuildMetadata = process.env.LDSP_PRIVATE_BUILD_METADATA === '1'
const buildVersion = process.env.VITE_APP_VERSION
  || process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12)
  || process.env.npm_package_version
  || 'development'

if (privateBuildMetadata && !/^[0-9a-f]{12}$/.test(buildVersion)) {
  throw new Error('Private build metadata requires a 12 character Git revision in VITE_APP_VERSION')
}

function proxyOptions(target) {
  return {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path,
    ...(proxyAgent ? { agent: proxyAgent } : {})
  }
}

export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(
      buildVersion
    )
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3001,
    // api2 的本地 CORS 白名单以端口为精确 Origin。端口被占用时直接报错，
    // 避免 Vite 静默切换到 3002 后产生难以识别的跨域问题。
    strictPort: true,
    open: true,
    proxy: {
      '/api/auth': proxyOptions('https://api1.ldspro.qzz.io'),
      '/api/image': proxyOptions('https://api.ldspro.qzz.io'),
      '/api': proxyOptions('https://api2.ldspro.qzz.io')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 600,
    // Normal Pages builds never publish maps. A trusted build host may opt in
    // to hidden maps and transfer only those private artifacts to Alloy.
    sourcemap: privateBuildMetadata ? 'hidden' : false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})
