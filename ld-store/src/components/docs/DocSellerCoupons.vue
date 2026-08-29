<template>
  <div class="doc-content">
    <h2 id="purpose">用券前先确定目标</h2>
    <p class="lead">优惠券适合为指定物品引流或促进店铺内多种物品成交。创建时同时选择适用范围和优惠方式。</p>

    <HelpPath :items="[{ label: '卖家后台', to: '/seller' }, { label: '优惠券管理', to: '/seller/coupons' }]" />

    <h2 id="prepare">创建前准备</h2>
    <ul>
      <li>确认目标物品处于买家可访问状态，并核算你能承担的最大让利。</li>
      <li>决定只用于单个物品的商品券，还是用于当前店铺可用物品的店铺券。</li>
      <li>决定使用固定减额还是单件折扣，并设置合理的最低消费。</li>
      <li>准备发行数量和有效期；动态上限以创建页实时提示为准。</li>
    </ul>

    <h2 id="coupon-types">商品券、店铺券与两种优惠方式</h2>
    <HelpTable :columns="typeColumns" :rows="typeRows" />
    <HelpCallout title="多件订单的让利方式不同" tone="info">
      固定减额在整单只减一次；单件折扣在多件购买时只优惠其中一件。创建前用最大购买数量估算最坏情况下的实际让利。
    </HelpCallout>

    <h2 id="create-coupon">创建步骤</h2>
    <HelpSteps :steps="createSteps" />

    <h2 id="share-link">分享领取链接</h2>
    <p>活动创建后，从管理页复制专属领取链接。买家登录后通过链接领取，再到结算页使用。公开分享前先自己打开链接，确认卖家、适用范围、优惠值、门槛和有效期正确。</p>

    <h2 id="manage-campaign">查看领取、占用、核销和累计让利</h2>
    <p>打开某个活动的详情，可按用户名或使用状态筛选领取记录。记录会显示领取时间、当前状态、关联订单和使用时间，便于核对活动效果与异常占用。</p>
    <dl class="status-list">
      <div><dt>已领取</dt><dd>买家已把券放入券包，但不代表已经用于成交。</dd></div>
      <div><dt>订单占用</dt><dd>优惠券被一个未结束订单暂时锁定；取消或过期后按规则释放。</dd></div>
      <div><dt>已核销</dt><dd>券随成功支付的订单使用完成，不能再次使用。</dd></div>
      <div><dt>累计让利</dt><dd>活动实际用于成交的优惠结果，用于评估活动成本。</dd></div>
    </dl>

    <h3 id="campaign-changes">活动创建后能改什么</h3>
    <ul>
      <li>为避免已领取规则变化，适用范围、优惠方式、优惠值、门槛和有效期等核心条件不能随意改写。</li>
      <li>发行量只能按页面允许的方式增加，不能减少到低于已领取数量。</li>
      <li>活动生效后、过期前可以暂停或恢复新领取；暂停不会修改优惠规则和有效期。</li>
      <li>暂停领取后，买家已经领取且仍有效的券继续按原规则使用。</li>
      <li>旧版中已经标记为“永久停领”的历史活动仍不可恢复，管理页会单独显示该状态。</li>
    </ul>

    <h2 id="troubleshooting">常见异常</h2>
    <ul>
      <li>买家无法领取：检查活动是否已开始、已结束、领完、暂停领取或被平台停用。</li>
      <li>结算页不可选：检查物品范围、最低消费、有效期和券的占用状态。</li>
      <li>多件优惠低于预期：确认是否使用单件折扣，它只优惠一件。</li>
      <li>想修改核心规则：新建一个活动并重新分享链接，不要误导已领取用户。</li>
    </ul>

    <div class="help-actions">
      <router-link to="/seller/coupons">管理优惠券</router-link>
      <router-link to="/docs/buyer-coupons" class="secondary">查看买家使用规则</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const typeColumns = [
  { key: 'dimension', label: '维度' },
  { key: 'option', label: '选项' },
  { key: 'rule', label: '规则' },
  { key: 'bestFor', label: '适合' }
]
const typeRows = [
  { dimension: '适用范围', option: '商品券', rule: '只用于指定物品', bestFor: '单品推广、清理特定库存' },
  { dimension: '适用范围', option: '店铺券', rule: '用于该卖家的可用物品', bestFor: '店铺拉新、跨物品转化' },
  { dimension: '优惠方式', option: '固定减额', rule: '达到门槛后整单减一次', bestFor: '控制每单固定成本' },
  { dimension: '优惠方式', option: '单件折扣', rule: '多件订单只折扣一件', bestFor: '按比例降低单件价格' }
]
const createSteps = [
  { title: '选择适用范围', description: '选择商品券或店铺券；商品券还要指定物品。' },
  { title: '设置优惠与门槛', description: '选择固定减额或单件折扣，填写优惠值和最低消费。' },
  { title: '设置发行与有效期', description: '填写数量和时间，阅读页面显示的动态限额。' },
  { title: '创建并复核链接', description: '保存后打开领取链接核对全部规则。', result: '分享后可在管理页跟踪领取、占用、核销和让利。' }
]
</script>
