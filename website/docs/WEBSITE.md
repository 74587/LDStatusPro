# 官网技术说明

> 核对日期：2026-09-19。代码目录 `LDStatusPro/website`。

## 定位

Cloudflare Pages 上的静态产品站。首页不走后端 CMS。年报是唯一使用 LDSP API 的页面。

## 结构

```text
website/src/
├── App.tsx                 # `/report/2025*` → AnnualReport2025，其余首页
├── main.tsx
├── index.css
├── components/             # Header Hero Features Levels Installation UpdateLog FAQ Footer Logo PanelPreview
└── pages/AnnualReport2025.tsx
```

不存在 `src/hooks/`。

## 部署

```bash
npm run build
npx wrangler pages deploy dist --project-name=ldstatus-pro
```

`public/_headers` 仅基础安全头（无 CSP）。`public/_redirects`：`/* /index.html 200`。

脚本真实版本以仓库根 `LDStatusPro.user.js` `@version` 为准；官网展示文案需单独改组件。
