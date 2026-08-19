<template>
  <div class="doc-content">
    <h2 id="what-is-ld-store">LD 士多有什么用</h2>
    <p class="lead">LD 士多为 LinuxDo 社区成员提供物品展示、LDC 支付、订单记录、自动发卡、求购洽谈和小店展示等功能。</p>

    <h2 id="ldc">认识 LDC</h2>
    <dl class="definition-list">
      <div><dt>LDC</dt><dd>Linux.do Credit，社区活跃积分。它不是法定货币，也不用于提现或与真实货币兑换。</dd></div>
      <div><dt>平台内支付</dt><dd>买家在 LD 士多订单中发起 LDC 支付；平台根据通知更新订单并触发后续交付。</dd></div>
      <div><dt>卖家收款</dt><dd>普通物品和自动发卡物品均要求卖家先在后台接入自己的 LDC 收款配置。</dd></div>
    </dl>

    <h2 id="roles-and-areas">角色和三个主要区域</h2>
    <HelpTable :columns="areaColumns" :rows="areaRows" caption="角色不是固定身份，同一账号可以购买也可以经营" />

    <h2 id="core-flow">一次交易如何完成</h2>
    <HelpSteps :steps="transactionSteps" />

    <h2 id="order-status">看懂用户可见状态</h2>
    <dl class="status-list">
      <div><dt>待支付 / 支付中</dt><dd>订单已创建，正在等待支付完成或等待支付通知确认。</dd></div>
      <div><dt>待发货</dt><dd>普通物品通常等待卖家手动履约；自动发卡异常时也可能需要卖家补充处理。</dd></div>
      <div><dt>已发货 / 已完成</dt><dd>交付信息已写入订单，或交易流程已经结束。以订单详情展示为准。</dd></div>
      <div><dt>已取消 / 已过期</dt><dd>订单不再继续；被该订单占用的有效优惠券会按规则释放。</dd></div>
    </dl>

    <h2 id="review-status">看懂审核状态</h2>
    <p>发布或编辑内容后，页面会显示当前审核结果，例如“审核中”“审核通过”“审核不通过”或进入人工复核。帮助文档不承诺固定审核时长；请以物品列表和编辑页显示的中文状态与提示为准。</p>
    <HelpCallout title="限额和名额以页面为准" tone="warning">
      发布上限、卡密批量操作限制、推广名额等可能动态调整。页面实时提示是当前可执行规则，不要依赖旧教程里的固定数字。
    </HelpCallout>

    <h2 id="next-step">下一步</h2>
    <div class="help-actions">
      <router-link to="/docs/product-types">选择物品类型</router-link>
      <router-link to="/docs/buy-guide" class="secondary">开始购买</router-link>
      <router-link to="/docs/seller-center" class="secondary">开始经营</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const areaColumns = [
  { key: 'area', label: '区域' },
  { key: 'bestFor', label: '适合任务' },
  { key: 'role', label: '主要角色' }
]
const areaRows = [
  { area: '物品广场', bestFor: '浏览普通物品和自动发卡物品，直接下单', role: '买家、卖家' },
  { area: '求购广场', bestFor: '先说明需求，再由服务方洽谈承接', role: '求购方、服务方' },
  { area: '小店集市', bestFor: '展示站点、服务与店主信息，建立经营主页', role: '访客、店主' }
]
const transactionSteps = [
  { title: '查看详情', description: '确认价格、库存、交付方式、卖家说明和适用优惠券。' },
  { title: '创建订单并支付', description: '在平台订单内选择数量与优惠券，使用 LDC 完成支付。' },
  { title: '完成交付', description: '独立或共享卡密可自动发放；普通物品由卖家按约定履约。' },
  { title: '保留记录', description: '在个人中心查看订单、消息和交付信息，发生争议时以平台记录为依据。' }
]
</script>
