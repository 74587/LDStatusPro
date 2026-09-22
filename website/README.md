# LDStatus Pro 官网

产品介绍站，生产 `https://ldspro.qzz.io/`。Cloudflare Pages 项目名 `ldstatus-pro`。

首页文案写在组件里，**不是** 动态 CMS。没有 `src/hooks/useSiteData.ts`，也不请求 `/api/site/settings|update-logs|faqs`。

> 核对日期：2026-09-19。以 `src/App.tsx` 与 `package.json` 为准。

## 技术栈

| 项 | 实际值 |
|---|---|
| UI | React 19.2 + TypeScript 5.9 |
| 构建 | Vite 7.2 |
| 样式 | Tailwind CSS 4.1（`@tailwindcss/vite`，无 `tailwind.config.js`） |
| 动画 | Framer Motion 12 |
| 图标 | Lucide React |
| 路由 | `App.tsx` 手写 pathname，无 React Router |

## 页面

| 路径 | 内容 |
|---|---|
| `/` | Header、Hero、Features、Levels、Installation、UpdateLog、FAQ、Footer |
| `/report/2025*` | 2025 年报（OAuth + `https://api.ldspro.qzz.io`） |

Hero / Footer / UpdateLog 里写死的版本号（如 v3.5.4、v3.3.2）**落后于脚本** `3.9.0.3`，改官网展示需改对应组件，不是改 README。

外部请求：

- Header：GitHub API 拉 star
- 年报：`GET /api/auth/init`、`GET /api/annual-report/2025`

主题是浅色莫兰迪，不是旧文档里的暗色 `#0c0c14`。

## 命令

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
npm run deploy    # build + wrangler pages deploy dist --project-name=ldstatus-pro
```

无测试脚本、无 Vite proxy、无 `.env.example`。推送 `website/**` 时 GitHub Actions 跑 `npm run lint` 和 `npm run build`。生产发布不随推送执行，见 [CI.md](../CI.md)。

更细的结构见 [docs/WEBSITE.md](./docs/WEBSITE.md)。
