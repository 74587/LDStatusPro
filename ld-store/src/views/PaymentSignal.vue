<template>
  <section class="payment-signal" :data-seal="seal">
    <main class="sheet">
      <div class="head">
        <div>
          <p class="kicker">LD士多</p>
          <h1>{{ title }}</h1>
        </div>
        <svg class="seal" viewBox="0 0 48 48" aria-hidden="true">
          <circle class="orbit" cx="24" cy="24" r="20" />
          <circle cx="24" cy="24" r="20" />
          <path v-if="seal === 'done'" class="mark" d="M15 24.6 21.2 30.6 33.4 17.8" />
          <path v-else-if="seal === 'attention'" class="mark" d="M17.5 17.5 30.5 30.5M30.5 17.5 17.5 30.5" />
          <path v-else class="mark" d="M24 16.5v8.2l5.2 3.2" />
        </svg>
      </div>
      <div class="copy">
        <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
        <p v-if="orderNo" class="order"><span>订单号</span><strong>{{ orderNo }}</strong></p>
      </div>
      <div class="actions">
        <a class="primary" :href="backHref">{{ orderNo ? '查看这张订单' : '返回我的订单' }}</a>
        <a class="secondary" href="https://credit.linux.do/balance">查看 Credit 记录</a>
      </div>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { announcePaymentSignal, normalizeOrderNo, normalizePaymentResult } from '@/utils/paymentReturn'

const COPY = {
  delivered: { seal: 'done', title: '已经发货', paragraphs: ['付款已经确认，交付内容在这张订单里。'] },
  completed: { seal: 'done', title: '这张订单已完成', paragraphs: ['付款和交付都已结束，记录留在这张订单里。'] },
  'paid-auto': { seal: 'wait', title: '付款已确认', paragraphs: ['自动发货还在处理，请到这张订单里查看。'] },
  'paid-contact': { seal: 'wait', title: '付款已确认', paragraphs: ['请到订单里联系卖家，由卖家完成交付。'] },
  paid: { seal: 'wait', title: '付款已确认', paragraphs: ['请到这张订单里查看交付内容。'] },
  pending: { seal: 'wait', title: '还在确认付款', paragraphs: ['回到这张订单查看结果。如果已经付款，请不要重复支付。'] },
  missing: { seal: 'attention', title: '没有找到这张订单', paragraphs: ['请回到订单列表核对。如果已经付款，请不要重复支付。'] },
  cancelled: { seal: 'attention', title: '这张订单已取消', paragraphs: ['如果已经付款，请到订单里核对，不要重复支付。'] },
  refunded: { seal: 'attention', title: '这张订单已退款', paragraphs: ['退款记录在这张订单里。'] },
  refunding: { seal: 'wait', title: '这张订单正在退款', paragraphs: ['请到订单里查看进度，不要重复支付。'] },
  expired: { seal: 'attention', title: '这张订单已过期', paragraphs: ['如果已经付款，请到订单里核对，不要重复支付。'] },
  dispute: { seal: 'attention', title: '这张订单有争议', paragraphs: ['请到订单里查看处理进度，不要重复支付。'] },
  review: { seal: 'attention', title: '请查看这张订单', paragraphs: ['当前结果以订单页为准。如果已经付款，请不要重复支付。'] }
}

const route = useRoute()
const orderNo = normalizeOrderNo(route.query.orderNo)
const result = normalizePaymentResult(route.query.result)
const state = typeof route.query.state === 'string' ? route.query.state : ''

const view = computed(() => {
  if (Object.hasOwn(COPY, state)) return COPY[state]
  if (result === 'success') return COPY.paid
  if (result === 'error') return COPY.missing
  return COPY.pending
})

const seal = computed(() => view.value.seal)
const title = computed(() => view.value.title)
const paragraphs = computed(() => view.value.paragraphs)
const backHref = computed(() => (orderNo ? `/order/${encodeURIComponent(orderNo)}?role=buyer` : '/user/orders'))

onMounted(() => {
  announcePaymentSignal({ orderNo, result })
  window.setTimeout(() => {
    window.close()
  }, 800)
})
</script>

<style scoped>
.payment-signal {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px var(--page-gutter);
  background: var(--surface-canvas);
}

.sheet {
  width: min(100%, 440px);
  display: flex;
  flex-direction: column;
  padding: 28px 28px 24px;
  border: 1px solid var(--border-default-semantic);
  border-radius: 18px;
  background: var(--surface-card);
  box-shadow: var(--elevation-sm);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.kicker {
  margin: 2px 0 12px;
  color: var(--text-muted-semantic);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--text-primary-semantic);
  font-family: "Songti SC", "STSong", "Noto Serif SC", var(--font-sans);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.seal {
  width: 46px;
  height: 46px;
  flex: none;
  color: var(--status-success);
}

.payment-signal[data-seal="attention"] .seal {
  color: var(--status-danger);
}

.seal circle,
.seal path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.seal .orbit { opacity: 0.28; }

.copy {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border-default-semantic);
}

.copy p {
  margin: 0 0 10px;
  color: var(--text-secondary-semantic);
  font-size: 15px;
  line-height: 1.65;
}

.order {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface-subtle);
  color: var(--text-primary-semantic);
  overflow-wrap: anywhere;
}

.order span {
  color: var(--text-muted-semantic);
  font-size: 12px;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 22px;
}

.primary,
.secondary { text-decoration: none; }

.primary {
  padding: 11px 16px;
  border-radius: 8px;
  background: var(--action-primary);
  color: var(--text-inverse);
  font-size: 14px;
  letter-spacing: 0.04em;
}

.secondary {
  color: var(--text-muted-semantic);
  font-size: 13px;
}

.primary:focus-visible,
.secondary:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

@media (max-width: 520px) {
  .sheet { padding: 24px 20px 20px; }
  h1 { font-size: 28px; }
}
</style>
