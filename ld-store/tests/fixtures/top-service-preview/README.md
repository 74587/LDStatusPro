# 商家服务隔离预览

在 `ld-store` 目录执行 `npm run preview:services`，打开：

http://127.0.0.1:4183/tests/fixtures/top-service-preview/index.html#/seller/services

这是实际购买页面与组件的模拟接口预览，不是另一份 UI。顶部可切换正常购买、待支付、分类暂停、满额、未开放、加载失败、无物品、超时、退款待核验、创建超时恢复、价格变化、取消与付款竞态，以及 26 条购买记录。支持深色主题切换。

预览包含卖家后台顶部栏和隔离的路由内容层，复用 `SellerLayout` 样式，便于复现订单弹窗遮挡。订单详情浮于卖家布局顶层，标题与操作区固定，详情内容独立滚动；窄屏操作分两行，较矮的横屏布局并排显示。支付窗口被拦截后，唯一的“继续支付”入口会变为手动打开链接，不再同时出现第二个支付入口。

预览配置不读取应用环境文件，不配置 API 代理，API 与支付窗口模块均替换为本地模拟实现，并限制网络连接。模拟价格仅供验收，真实支付始终禁用。不要把此预览连接到生产环境。

验证超过第一页的订单恢复，可打开：

http://127.0.0.1:4183/tests/fixtures/top-service-preview/index.html#/seller/services?tab=orders&scenario=history&orderNo=LT-HISTORY-025

订单详情独立于记录列表的当前页及筛选。模拟场景在刷新时由 `scenario` 恢复；本次手动创建的模拟订单只保存在内存中。

“旧接口图片兼容”场景故意从 options 中省略 imageUrl，使用既有“我的物品”接口的 image_url 补回封面；真正无图、加载中和加载失败分别显示，失败可重试。测试覆盖分页、长链接、缓存与图片请求失败不影响购买方案。

待支付订单仅在页面可见时每 15 秒读取本站状态；切回窗口及支付窗口关闭触发的 Credit 自动检查至少间隔 30 秒，合并进行中的请求。打开记录或重新进入页面不自动查 Credit，用户主动“检查支付结果”可立即执行。已结束订单不显示付款检查，退款异常使用独立“检查退款进度”入口。

前端回归检查：

```sh
npm run test
npm run lint
npm run build
```

后端测试需要专用隔离数据库和 Redis；绝不可复用生产环境配置。Credit 回跳 HTML 由后端纯函数测试覆盖，其临时视觉预览文件不纳入仓库。

## 预览封面素材

封面仅用于模拟物品的图片布局验收，不是线上物品资料，不会进入生产页面。使用本地副本，浏览器验收无需请求图片站点。第三件模拟物品特意不设图片，用于检查“暂无图片”的回退。

- 云服务照片：[imgix / Unsplash](https://unsplash.com/photos/pgdaAwf6IJg)。
- 咖啡照片：[Todd Jiang / Unsplash](https://unsplash.com/photos/vlXhlQVkk6o)。
