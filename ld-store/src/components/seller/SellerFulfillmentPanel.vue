<template>
  <section v-if="state?.enabled || error" class="fulfillment-panel" aria-label="发货规则与履约记录">
    <p v-if="error" role="alert">{{ error }} <button type="button" :disabled="busy" @click="load">重新加载</button></p>
    <template v-if="state?.enabled">
      <div class="fulfillment-panel__heading"><h2>发货与交易保障</h2><router-link to="/docs/shipping-deadline">完整规则</router-link></div>
      <p>普通物品须在支付后 72 小时内交付；48 小时未发货下架，72 小时自动发起全额退款。最近 30 天累计 3 笔有效超时退款，限制新增交易 7 天。</p>
      <p v-if="state.activeRestriction" role="status"><strong>本次新增交易限制至 {{ formatDate(state.activeRestriction.endsAt) }}（北京时间）</strong>。已有订单仍可履约及处理售后；到期不会自动上架物品。</p>
      <p v-else>本轮有效超时记录：<strong>{{ state.validCount }}/3</strong><span v-if="state.validCount === 2">，再有 1 笔有效超时退款将触发限制。</span></p>
      <form v-if="!state.accepted" @submit.prevent="accept">
        <label><input v-model="checked" type="checkbox" />我已阅读并接受发货时限、自动全额退款及卖家限制规则</label>
        <button type="submit" :disabled="!checked || busy">{{ busy ? '确认中…' : '确认规则，继续经营' }}</button>
        <p>确认后可经营普通物品；如需更长交付时间，请暂勿通过此类型接单。</p>
      </form>
      <div class="fulfillment-panel__links"><router-link to="/seller/orders?status=paid">处理待发货订单</router-link><router-link to="/support">联系平台 / 申诉</router-link></div>
      <details v-if="state.history.length"><summary>查看超时记录（{{ state.history.length }}）</summary>
        <ul><li v-for="record in state.history" :key="record.id"><router-link :to="`/seller/orders/${encodeURIComponent(record.orderNo)}?source=product`">{{ record.orderNo }}</router-link>
          <span>{{ formatDate(record.occurredAt) }} · {{ record.revokedAt ? '已撤销' : record.exemptReason ? '旧处罚周期，不重复计次' : record.penaltyId ? '已用于本轮处罚' : '超时记录' }}</span>
          <span v-if="record.revokeReason">{{ record.revokeReason }}</span></li></ul>
      </details>
    </template>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { SellerFulfillment } from '@/contracts/fulfillment'
import { acknowledgeFulfillment, fetchSellerFulfillment } from '@/services/shop/fulfillmentService'
const state = ref<SellerFulfillment | null>(null), error = ref(''), checked = ref(false), busy = ref(false)
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
async function load() { const result = await fetchSellerFulfillment(); if (result.success) { state.value = result.data; error.value = '' } else error.value = result.error }
async function accept() {
  if (!checked.value || !state.value || busy.value) return
  busy.value = true
  const result = await acknowledgeFulfillment(state.value.policyVersion)
  busy.value = false
  if (result.success) { state.value = result.data; error.value = '' } else error.value = result.error
}
onMounted(load)
</script>
<style scoped>
.fulfillment-panel { margin-bottom: 1rem; padding: 1.25rem; border: 1px solid var(--border-default-semantic); border-radius: var(--radius-lg, 16px); background: var(--surface-subtle); color: var(--text-primary-semantic); }
.fulfillment-panel__heading, .fulfillment-panel__links { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
h2 { font-size: 1.1rem; margin: 0; } p, li { font-size: .875rem; line-height: 1.7; } p { color: var(--text-secondary-semantic); }
a { color: var(--text-link); text-decoration: underline; } form, li { display: grid; gap: .75rem; }
label { display: flex; align-items: flex-start; gap: .6rem; line-height: 1.6; font-size: .875rem; } input { margin-top: .35rem; }
button { min-height: 44px; padding: .5rem 1rem; border: 1px solid var(--border-default-semantic); border-radius: var(--radius-md, 12px); background: var(--surface-card); color: var(--text-primary-semantic); cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; } summary { cursor: pointer; padding: .75rem 0; } ul { padding-left: 1rem; } li { margin-bottom: 1rem; overflow-wrap: anywhere; }
</style>
