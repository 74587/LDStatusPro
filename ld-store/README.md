# LD 士多 Web

独立商城前端，生产站点 `https://ldcstore.com/`。Cloudflare Pages 项目名 `ld-store`。

用户脚本只保留入口按钮（`GM_openInTab`），商城不再内嵌在 `LDStatusPro.user.js`。

> 核对日期：2026-09-19。以本目录 `package.json`、`src/utils/api.ts`、`src/router/index.js` 为准。

## 技术栈

| 项 | 实际值 |
|---|---|
| 框架 | Vue 3.5、Vue Router 4.2、Pinia 2.1 |
| 构建 | Vite 8.2（dev 端口 **3001**，`strictPort: true`） |
| 样式 | Tailwind CSS 3.4 |
| 语言 | JavaScript + TypeScript |
| Node | `^20.19.0 \|\| >=22.12.0`（CI 用 22） |
| 测试 | Vitest 4、Playwright 1.63 |
| 观测 | Grafana Faro（生产强制开启） |

## 快速开始

```bash
cd ld-store
npm install
cp .env.example .env.local   # 本地三个 API 地址留空，走 Vite 代理
npm run dev                  # http://localhost:3001
npm run check                # 全部门禁（含测试）
```

本地代理（仅 `npm run dev`）：

```text
/api/auth  → https://api1.ldspro.qzz.io
/api/image → https://api.ldspro.qzz.io
/api       → https://api2.ldspro.qzz.io
```

生产默认（`src/utils/api.ts`）：

| 变量 | 默认 |
|---|---|
| `VITE_API_BASE` | `https://api2.ldspro.qzz.io` |
| `VITE_AUTH_API_BASE` | `https://api1.ldspro.qzz.io` |
| `VITE_IMAGE_API_BASE` | `https://api.ldspro.qzz.io` |

无 token 且 `auth: required` 时 **不发请求**。超时 15s。

## 主要路由

买家：`/`、`/product/:id`、`/checkout/:productId`、`/user/orders`、`/user/coupons`、`/buy-request/:id`、`/ld-image`、`/docs`、`/announcements`。

卖家：`/seller/*`（订单、退款、履约、商品、优惠券、店铺、通知、收款）。旧路径 `/publish`、`/user/products` 等会重定向到 seller 命名路由。

帮助中心文案日期 `HELP_UPDATED_AT = '2026-09-06'`。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | Vite :3001 |
| `npm test` | Vitest（禁真实外网） |
| `npm run test:e2e` | Playwright desktop + Pixel 5；密度视口只跑 `density.spec.ts` |
| `npm run lint` / `typecheck` / `build` | 质量与构建 |
| `npm run check` | 含测试的全部门禁 |
| `npm run check:deploy` | 部署门禁，不含 `npm test` |
| `npm run deploy` | `scripts/deploy-pages-production.sh` |

`deploy` 要求：`main`、干净工作区、与 `origin/main` 一致；Faro 必须开，collector 必须是 `https://api1.ldspro.qzz.io/faro/collect`。公开 dist 禁止 source map。

CI：仓库根目录 [CI.md](../CI.md)。推送只跑 `.github/workflows/ci.yml` 里的质量检查和浏览器回归；生产 Pages 用手动的 Deploy Pages，不随推送发布。

仓库内没有 `wrangler.toml`。边缘逻辑在 `public/_worker.js`（OG、oEmbed、CSP、noindex）。全站 `X-Robots-Tag: noindex`。

## 文档

- [docs/README.md](./docs/README.md) — OG / noindex 索引
- [docs/open-graph.md](./docs/open-graph.md)
- [docs/adr/0001-noindex-sharing-metadata.md](./docs/adr/0001-noindex-sharing-metadata.md)
- [docs/liquid-tabs.md](./docs/liquid-tabs.md)
- [docs/testing/browser-regression.md](./docs/testing/browser-regression.md)
