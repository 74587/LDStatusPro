<template>
  <div class="doc-content">
    <h2 id="purpose">卖家后台是经营主入口</h2>
    <p class="lead">卖家后台把经营概览、订单、物品、优惠券、商家服务、小店和收款配置集中到独立页面，并与买家的个人中心分开。</p>

    <HelpPath :items="[{ label: '右上角头像' }, { label: '卖家后台', to: '/seller' }, { label: '经营概览' }]" />

    <h2 id="prepare">第一次进入前</h2>
    <ul>
      <li>登录准备经营的 LinuxDo 账号。</li>
      <li>先准备 LDC 收款应用的 Client ID、Client Key 和 PID。</li>
      <li>决定要发布普通物品、独立卡密还是共享卡密。</li>
      <li>准备清晰标题、说明、价格和 HTTPS 图片链接。</li>
    </ul>

    <h2 id="dashboard">查看经营概览与待办</h2>
    <HelpTable :columns="metricColumns" :rows="metricRows" caption="概览数据用于快速判断经营状态，具体口径以页面说明为准" />
    <p>待办区域会提示需要处理的事项，例如待发货、库存不足、收款未配置或需要关注的物品状态。点击待办进入对应管理页处理。</p>

    <h2 id="navigation">后台功能分区</h2>
    <dl class="definition-list">
      <div><dt>订单管理</dt><dd>在商品销售与求购服务之间切换，搜索订单并处理待发货。</dd></div>
      <div><dt>我的物品</dt><dd>按状态、类型和库存筛选，编辑物品与管理卡密库存。</dd></div>
      <div><dt>发布物品</dt><dd>选择普通物品或自动发卡，填写资料并提交审核。</dd></div>
      <div><dt>优惠券管理</dt><dd>创建活动、分享领取链接，查看领取、占用、核销和让利。</dd></div>
      <div><dt>商家服务</dt><dd>查看士多甄选、士多优选等推广服务及当前可用名额。</dd></div>
      <div><dt>小店管理</dt><dd>维护店铺资料、分类和展示状态。</dd></div>
      <div><dt>收款设置</dt><dd>保存 LDC 收款凭证，复制回调地址并完成通知测试。</dd></div>
    </dl>

    <h2 id="first-run">首次经营步骤</h2>
    <HelpSteps :steps="firstRunSteps" />

    <HelpCallout title="买卖订单已经分流" tone="info">
      个人中心主要查看你作为买家的记录；卖家后台处理你售出的物品和承接的求购服务。进入订单页后仍要确认当前选中的是“商品销售”还是“求购服务”。
    </HelpCallout>

    <h2 id="troubleshooting">异常处理</h2>
    <ul>
      <li>看不到发布入口：确认进入的是 `/seller` 卖家后台，而不是买家个人中心。</li>
      <li>发布被收款状态拦截：先到收款设置保存凭证并按页面完成测试。</li>
      <li>指标和列表不一致：检查当前时间范围、筛选条件和订单来源。</li>
      <li>某项限额不可用：以当前页面实时提示为准，固定名额不会写入帮助文档。</li>
    </ul>

    <div class="help-actions">
      <router-link to="/seller">打开卖家后台</router-link>
      <router-link to="/seller/payment" class="secondary">配置收款</router-link>
      <router-link to="/seller/products/new" class="secondary">发布物品</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const metricColumns = [
  { key: 'metric', label: '指标' },
  { key: 'meaning', label: '用于了解' },
  { key: 'next', label: '下一步' }
]
const metricRows = [
  { metric: '实收积分 / 收入', meaning: '已完成交易带来的 LDC 结果', next: '结合订单明细核对' },
  { metric: '成交订单', meaning: '指定范围内的成交数量', next: '进入订单管理筛选' },
  { metric: '服务买家', meaning: '完成交易的买家规模', next: '关注复购和售后' },
  { metric: '物品浏览', meaning: '物品获得的访问量', next: '优化资料或使用推广服务' }
]
const firstRunSteps = [
  { title: '配置 LDC 收款', description: '保存凭证，复制页面生成的通知与回调地址，并完成测试。' },
  { title: '发布第一件物品', description: '选择交付类型，填写资料、价格和库存，提交审核。' },
  { title: '关注经营状态', description: '在经营概览查看待办、收款状态和物品状态。' },
  { title: '处理订单', description: '普通物品及时手动履约；自动发卡也要关注异常和库存。', result: '后续可创建优惠券、完善小店或使用推广服务。' }
]
</script>
