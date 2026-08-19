<template>
  <div class="doc-content">
    <h2 id="purpose">优惠券能做什么</h2>
    <p class="lead">卖家可以通过领取链接发放商品券或店铺券。买家领取后在结算时选择，每个订单最多使用一张。</p>

    <HelpPath :items="[{ label: '优惠券领取链接' }, { label: '确认领取' }, { label: '个人中心', to: '/user' }, { label: '我的优惠券', to: '/user/coupons' }]" />

    <h2 id="claim-coupon">领取前准备</h2>
    <ul>
      <li>确认已经登录领取链接对应的账号。</li>
      <li>查看适用范围、最低消费、优惠方式和有效期。</li>
      <li>同一活动是否还能领取，以领取页的实时提示为准。</li>
    </ul>

    <h2 id="coupon-rules">商品券、店铺券和多件计算</h2>
    <HelpTable :columns="couponColumns" :rows="couponRows" caption="优惠范围和计算方式可以组合设置" />
    <ul>
      <li><strong>一单一券：</strong>一个订单只能选择一张优惠券，不能叠加。</li>
      <li><strong>固定减额：</strong>达到最低消费后，整笔订单只减一次固定 LDC 金额。</li>
      <li><strong>单件折扣：</strong>多件购买时只对其中一件计算折扣，其余数量按原价计算。</li>
      <li><strong>最低消费：</strong>按该券适用物品的优惠前小计判断，不把无关物品计入门槛。</li>
    </ul>

    <HelpCallout title="结算页金额是最终校验结果" tone="info">
      加入数量或切换优惠券后，检查结算页展示的原价、优惠和应付金额。券不符合范围、门槛或状态时不会被应用。
    </HelpCallout>

    <h2 id="use-coupon">使用步骤</h2>
    <HelpSteps :steps="couponSteps" />

    <h2 id="coupon-reservation">优惠券被订单占用与自动释放</h2>
    <p>选券并创建订单后，优惠券会进入“订单占用中”，防止同一张券同时用于其他订单。此时它不是已核销，但暂时不能再次选择。</p>
    <dl class="status-list">
      <div><dt>未使用</dt><dd>在有效期内，且没有被其他未结束订单占用，可以在符合条件的结算页选择。</dd></div>
      <div><dt>订单占用中</dt><dd>已关联一个待处理订单。完成该订单或等待它结束，不要反复创建新订单。</dd></div>
      <div><dt>已使用</dt><dd>订单支付成功并完成核销，不能再次使用。</dd></div>
      <div><dt>已过期</dt><dd>超过有效期，不能用于新订单。</dd></div>
    </dl>
    <p>订单取消或过期后，系统会释放仍有效的优惠券；释放后回到“未使用”。如果优惠券本身也已经过期，则会显示“已过期”，不会恢复可用。</p>

    <h2 id="troubleshooting">优惠券不可用时</h2>
    <ol>
      <li>检查当前物品是否属于指定商品或店铺。</li>
      <li>检查适用小计是否达到最低消费。</li>
      <li>检查优惠券是否过期、已使用或被另一订单占用。</li>
      <li>确认当前订单没有选择另一张券。</li>
      <li>仍不符合预期时，记录券名称、物品名称和页面提示再反馈。</li>
    </ol>

    <div class="help-actions">
      <router-link to="/user/coupons">打开我的优惠券</router-link>
      <router-link to="/docs/buy-guide" class="secondary">返回购买指南</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const couponColumns = [
  { key: 'rule', label: '维度' },
  { key: 'type', label: '类型' },
  { key: 'effect', label: '作用' }
]
const couponRows = [
  { rule: '适用范围', type: '商品券', effect: '只用于卖家指定的单个物品' },
  { rule: '适用范围', type: '店铺券', effect: '用于该卖家设置为可用的店铺物品' },
  { rule: '优惠方式', type: '固定减额', effect: '整单满足门槛后只减一次固定金额' },
  { rule: '优惠方式', type: '单件折扣', effect: '多件订单只优惠其中一件' }
]
const couponSteps = [
  { title: '打开领取链接', description: '登录后查看券的卖家、适用范围、门槛和有效期。' },
  { title: '确认领取', description: '领取成功后到“我的优惠券”查看当前状态。' },
  { title: '在结算页选券', description: '购买符合条件的物品，选择一张可用券并核对优惠金额。' },
  { title: '完成支付', description: '订单支付成功后优惠券变为已使用。', result: '若订单取消或过期，仍有效的占用券会自动释放。' }
]
</script>
