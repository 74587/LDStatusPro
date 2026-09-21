# 士多前台响应式与密度合同

> 范围：`LDStatusPro/ld-store` 买家前台（首页、搜索、分类、商品卡、顶栏）。  
> 商家后台 Paper Console 已有 768–1023 紧凑侧栏，不套用本文密度变量；只要求断点数字与本文对齐。  
> 核对日期：2026-09-21。阶段 1–4 已落地。

## 1. 问题

前台不是「没做移动端」，而是 **768px 以上一律按宽屏桌面排**：字号、封面高度、区块内边距写死在组件里。小屏桌面（13 寸笔记本、1080p 系统缩放 125%/150%、高度 720–800 的窗口）会看到过大的 Banner、过厚的商品卡、顶栏 180px 用户胶囊，一屏只能露出大约一行半货架。

代码侧对应关系：

| 现象 | 实现 |
| --- | --- |
| 只有手机 / 桌面两档 | `AppHeader` `innerWidth < 768`；货架 CSS `768 / 1024` 切列 |
| 宽屏尺度写死 | 首页标题 `28px`、统计 `22px`、Banner `padding: 28px 24px`、商品封面 `140px`、详情主卡 `padding: 32px` |
| Token 几乎没进组件 | `tokens.css` 有 `--text-size-*` / `--space-*`，组件里约 1400 处 `font-size: Npx` |
| 断点不统一 | 同一产品出现 `640 / 767 / 768 / 900 / 1024 / 1180 / 1200` 等 20+ 个值；`768px` 时顶栏已是桌面、底栏仍显示（`AppFooter` `max-width: 768px`） |
| 测试缺口 | Playwright 只有 Desktop Chrome 与 Pixel 5，没有 1024×768 / 1280×720 |

`html { font-size: 16px }` 写死；`main.css` 在 `max-width: 640px` 时把 `html` 改成 `14px`。这只影响 rem 工具类，大多数组件仍是 px，**本轮不拿它当缩放开关**，避免和 Tailwind rem 搅在一起。

## 2. 原则

1. **列数跟宽度走，尺度跟密度走。** 768 仍是 3 列、1024 仍是 4 列；变的是封面高度、标题、间距。
2. **密度 token 是唯一尺度入口。** 组件写 `var(--card-cover-h)`，不在每个 `@media` 里重写一遍 140/120。
3. **JS 和 CSS 共用同一组像素常量。** 布局用 CSS；`isMobile` 只决定搜索是否收进图标。阈值来自 `src/config/breakpoints.js`。
4. **不改配色、不禁用缩放、正文字号不低于 14px。** 手机触控目标继续 ≥44px。
5. **不把 `html { font-size }` 做成整页缩放。** 现有大量 px 不会跟着变。

## 3. 断点合同

数值定义在 `src/config/breakpoints.js`，CSS 媒体查询必须使用同一数字。CSS 自定义属性不能写进 `@media` 条件，因此 token 里的 `--bp-*` 只作文档与测试对齐，真正的查询仍写字面量。

| Token | 像素 | 含义 | 密度 |
| --- | --- | --- | --- |
| `--bp-sm` | 360 | 极窄手机 | comfortable |
| `--bp-md` | 640 | 大手机 | comfortable |
| `--bp-lg` | 768 | 平板 / 窄窗；前台底栏消失 | compact |
| `--bp-xl` | 1024 | 小桌面；货架 4 列 | compact |
| `--bp-2xl` | 1280 | 标准桌面 | standard |
| `--bp-3xl` | 1440 | 宽屏（列数本轮仍为 4） | standard |

短窗规则：`(min-width: 768px) and (max-height: 800px) and (pointer: fine)` 强制 compact。覆盖 1280×720（1080p × 150%）和 13 寸 800 高窗口。

**导航**

- `< 768`：底栏 + 顶栏搜索收成图标。CSS 一律 `max-width: 767px`（含 `768` 会和 JS `< 768` 错位）。
- `≥ 768`：桌面顶栏搜索。`768–1279` 用户区只留头像，不展示 180px 胶囊。

**货架列数**（首页物品/小店/求购、搜索骨架列数）

| 宽度 | 列数 |
| --- | --- |
| `< 768` | 2 |
| `≥ 768` | 3 |
| `≥ 1024` | 4 |

分类页、搜索结果在 `< 640` 仍可维持现有单列，不在本轮强行改成 2 列。  
`≥ 1440` 开 5 列列为后续可选项，本轮不做。

## 4. 密度 Token

定义在 `src/styles/tokens.css`，mobile-first：

| Token | 手机 comfortable | 平板/小桌面 compact | `≥ 1280` 且高度充足 standard |
| --- | --- | --- | --- |
| `--ui-density` | `comfortable` | `compact` | `standard` |
| `--page-max` | 1200px | 1200px | 1200px |
| `--page-gutter` | 12px | 14px | 16px |
| `--section-gap` | 16px | 16px | 24px |
| `--grid-gap` | 12px | 12px | 16px |
| `--header-control-size` | 44px | 36px | 38px |
| `--header-profile-size` | 44px | 36px | 40px |
| `--header-user-width` | `auto` | `auto` | 180px |
| `--text-display` | 22px | 22px | 28px |
| `--text-subtitle` | 18px | 18px | 20px |
| `--text-stat` | 16px | 18px | 22px |
| `--text-price` | 16px | 16px | 18px |
| `--card-cover-h` | 120px | 112px | 140px |
| `--card-radius` | 14px | 14px | 16px |
| `--card-pad` | 12px | 10px | 12px |
| `--banner-pad` | `20px 16px` | `18px` | `28px 24px` |
| `--detail-pad` | 24px | 20px | 32px |

组件只引用这些变量。短窗媒体查询重复 compact 那一列，不能另发明一套值。

## 5. 页面壳

全局 `.page-container` 放在 `main.css`：

```css
.page-container {
  width: min(100%, var(--page-max));
  margin-inline: auto;
  padding: var(--page-gutter);
  box-sizing: border-box;
}
```

- 首页、分类等「货架页」删掉本地 `max-width: 1200px; padding: 16px`，改吃全局类。
- 商品详情保持阅读列 `max-width: 900px`，内边距改为 `var(--page-gutter)` / `var(--detail-pad)`。
- 收藏等本来就更窄的页（如 `960px`）本轮不动。
- 商家后台继续 `seller.css` 的 `max-width: none`。

顶栏 `.header-content` 使用同一套 `--page-max` 与 `--page-gutter`，避免和内容区错位。

## 6. 分阶段

### 阶段 1 — Foundation（本轮）

- `src/config/breakpoints.js`：像素常量、`catalogColumns()`、`isMobileNav()`。
- `tokens.css`：断点注释 + 密度变量 + 媒体查询。
- `main.css`：全局 `.page-container`。
- `tailwind.config.js` 增加命名 screen（不改默认 `sm/md/lg`，避免误伤）。
- `check-style-tokens.mjs` 把密度 token 列入必有项。
- 单测对齐 JS 常量与 `tokens.css` 媒体查询字面量。

### 阶段 2 — 前台壳层（本轮）

覆盖「小屏桌面内容过大」的主路径：

| 文件 | 改动 |
| --- | --- |
| `AppHeader.vue` | 控件尺寸走 token；`isMobileNav()`；compact 隐藏用户名胶囊 |
| `AppFooter.vue` | `max-width: 767px`，与 JS `< 768` 对齐 |
| `Home.vue` | Banner / 标题 / 统计 / 间距走 token；去掉本地 page-container 宽度 |
| `ProductCard.vue` | 封面、圆角、内边距、价格走 token |
| `ProductsMarketplace.vue` `StoresMarketplace.vue` `BuyRequestMarketplace.vue` `Search.vue` | `catalogColumns()`；`gap: var(--grid-gap)` |
| `HotboardMarketplace.vue` | Hero 内边距与统计数字走 token |
| `Category.vue` | 页标题走 `--text-display`；gutter 走 token |
| `ProductDetail.vue` | 主卡 `padding: var(--detail-pad)` |
| `LiquidTabs.vue` | 768–1279 使用略紧的 tab 内边距 |
| `ShopCard.vue` | 信息区内边距走 `--card-pad`（封面已是 16:9，随列宽缩放） |

### 阶段 3 — 交易与个人中心

一次性 layout 查询迁回合同值：`520/560 → 639`，`720/760/820/900 → 767`，`980 → 1024`。页标题、卡片内边距吃密度 token。阅读列 `max-width`（订单 600、用户 760 等）保留。

已迁移：`OrderConfirm`、`Orders`、`OrderDetail`、`User`、`BuyRequestDetail`、`BuyOrderDetail`、`MyBuyRequests`、`MyCoupons`、`MyFavorites`、`MyBuyChats`、`ShopDetail`、`Support`、`CouponClaim`、`MerchantProfile`、`MyReports`、`MyReportDetail`、`PurchaseLimitSelector`。卖家收款页 `Settings.vue` 只对齐断点数字，不套前台货架密度。

### 阶段 4 — 门禁与验收视口

- `check-style-tokens.mjs` 对 `CONTRACT_LAYOUT_FILES` 禁止合同外的 `min/max-width`、`max-height` 查询。允许值：`359/360`、`639/640`、`767/768`、`1023/1024`、`1279/1280`、`1439/1440`，以及短窗 `max-height: 800px`。
- Playwright：`commerce.spec.ts` 仍只跑 `desktop` + `mobile`。`density.spec.ts` 跑全部项目，其中 `tablet-768`、`tablet-1024`、`laptop-1280x720`、`desktop-wide` **只跑密度用例**，避免把下单套件乘以视口数量。默认 `desktop` 项目本身就是 1280×720。

验收视口：

| 视口 | 期望 |
| --- | --- |
| 375×667 | 底栏、2 列、封面 120px、触控 44px |
| 768×1024 | 无底栏、3 列、compact、顶栏有搜索、无用户名胶囊 |
| 1024×768 | 4 列 compact |
| 1280×720 | compact（短窗规则），Banner/封面明显小于宽屏 |
| 1440×900 | standard：28px 标题、140px 封面、180px 用户胶囊 |

## 7. 明确不做

- 不把全站 px 一次性改成 rem。
- 不在本轮给 1440 加第 5 列。
- 不把商家后台表单/侧栏改成前台密度。
- 不关闭浏览器缩放、不把正文字号降到 14px 以下。
- 不引入容器查询断点体系替代宽度合同（商品卡已有 `@container` 处理极窄页脚，保留）。

## 8. 验证

```bash
cd LDStatusPro/ld-store
npm run test -- tests/breakpoints.test.js tests/style-token-policy.test.js
npm run check:styles
npm run test:e2e -- e2e/density.spec.ts
```

`npm run test:e2e` 仍包含 desktop/mobile 的 commerce 回归；密度视口由同一次运行里的额外 project 覆盖。
