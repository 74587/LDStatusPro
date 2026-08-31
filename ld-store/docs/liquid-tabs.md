# LiquidTabs

首页、分类筛选与卖家后台共用 `src/components/common/LiquidTabs.vue`。组件只负责展示、选择事件、键盘焦点与指示器；请求、路由、缓存、页码及表单状态仍归页面管理。

## 接口

- `tabs`：`{ value, label, icon?, iconComponent?, badge?, description?, disabled?, id?, panelId? }[]`。`value` 是唯一字符串或数字，严格匹配 `modelValue`；`badge: 0` 正常显示。
- `v-model` / `update:modelValue`：仅在请求选择的值与父组件值不同时触发。父组件值是唯一选中依据；无匹配项时隐藏指示器，不自行修正值。
- `activate(value)`：每次有效点击或键盘确认都会触发，包括重复选中。不要与 `update:modelValue` 同时绑定同一个业务操作。分类适配层用它保留重复点击行为和原始分类 ID 类型。
- `mode="select"`（默认）：筛选按钮组，使用 `aria-pressed`，保留原生 Tab 顺序。
- `mode="tabs"`：内容页签，只有一个 Tab 焦点入口；方向键循环跳过禁用项，支持 Home/End。
- `activation="manual"`（默认）：方向键只移动焦点，Enter/空格确认。`automatic` 在方向键移动时直接请求切换。只对内容页签有效。
- `disabled`：禁用整组；单项也可禁用。
- `size="md" | "sm"`：标准／紧凑；小屏均至少 44px 高。
- `layout="content" | "equal"`：内容宽度／等宽。超出可用宽度时在组件内部横向滚动。
- `aria-label`：调用方提供清晰的组名。

## 内容面板关联

`mode="tabs"` 必须为每项提供在页面内唯一的 `id` 和 `panelId`，并由调用方渲染相应面板：

```vue
<LiquidTabs v-model="view" :tabs="views" mode="tabs" aria-label="管理功能" />
<section
  v-for="item in views"
  v-show="view === item.value"
  :id="item.panelId"
  :key="item.value"
  role="tabpanel"
  :aria-labelledby="item.id"
  tabindex="0"
>
  <!-- 业务内容；数据请求仍由页面控制 -->
</section>
```

首页与商家服务采用手动确认，优惠券及其详情采用自动激活。优惠券面板使用 `v-show` 保持表单输入。不要给普通筛选仅添加 `role="tab"` 而不提供面板关联。

## 样式与布局

玻璃材质默认沿用首页变量；卖家主题在 `src/styles/seller.css` 的 `.seller-shell` 集中映射 `--liquid-*` 变量。调用方只设置容器宽度、外边距和 flex 布局，不通过 `:deep()` 修改按钮或指示器。网格／flex 父级应允许收缩（必要时 `min-width: 0`）。小屏等宽说明型页签隐藏副说明，但保留 `aria-describedby` 关联。

指示器监听容器与各按钮尺寸，批量测量本地坐标，支持动态徽标、字体加载、隐藏恢复及 KeepAlive；不使用 `scrollIntoView`，不引入背景模糊。`prefers-reduced-motion` 关闭过渡并使用即时滚动。

## 本地验证

```sh
npm run test -- tests/liquid-tabs.test.js tests/liquid-tabs-pages.test.js
npm run check
npm run preview:tabs
```

隔离预览入口：`http://127.0.0.1:4179/tests/fixtures/liquid-tabs-preview/index.html`。可切换六个真实页面、浅深色及“组件边界”示例，检查 320／375／768／1440px、动态徽标、隐藏恢复、缓存恢复、禁用及抽屉重开；减少动效的视觉验收需开启系统设置。

预览使用合成数据，不加载应用 `.env` 或生产代理，API 写操作与真实 fetch 被阻止，CSP 限制外部连接。不要将其替换为生产接口进行测试。Vitest 继续使用项目的网络隔离配置。预览入口不被正式应用导入。
