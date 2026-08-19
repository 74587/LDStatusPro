<template>
  <div class="coupon-claim-page">
    <main class="claim-shell">
      <router-link to="/" class="back-link" aria-label="返回首页">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        返回首页
      </router-link>

      <section v-if="loading" class="coupon-card loading-card" aria-live="polite">
        <div class="skeleton skeleton-icon" />
        <div class="skeleton skeleton-title" />
        <div class="skeleton skeleton-line" />
        <div class="skeleton skeleton-button" />
      </section>

      <section v-else-if="error" class="coupon-card state-card" role="alert">
        <svg class="state-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" />
        </svg>
        <h1>无法查看这张优惠券</h1>
        <p>{{ error }}</p>
        <button type="button" class="secondary-button" @click="loadCoupon">重新加载</button>
      </section>

      <section v-else-if="coupon" class="coupon-card">
        <div class="ticket-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9a3 3 0 0 0 0 6v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5V15a3 3 0 0 0 0-6V7.5Z" /><path d="M12 7v2m0 2v2m0 2v2" /></svg>
        </div>
        <p class="eyebrow">{{ coupon.sellerUsername }} 发放</p>
        <h1>{{ coupon.name }}</h1>
        <p class="coupon-value">{{ formatCouponRule(coupon) }}</p>
        <p v-if="coupon.description" class="description">{{ coupon.description }}</p>

        <dl class="rule-list">
          <div><dt>适用范围</dt><dd>{{ scopeText }}</dd></div>
          <div><dt>最低消费</dt><dd>{{ Number(coupon.minSpend || 0) > 0 ? `满 ${Number(coupon.minSpend).toFixed(2)} LDC` : '无门槛' }}</dd></div>
          <div><dt>生效时间</dt><dd>{{ formatCouponDate(coupon.startsAt) }}</dd></div>
          <div><dt>过期时间</dt><dd>{{ formatCouponDate(coupon.expiresAt) }}</dd></div>
          <div><dt>剩余数量</dt><dd>{{ coupon.remainingQuantity }} / {{ coupon.totalQuantity }}</dd></div>
        </dl>

        <p v-if="coupon.discountType === 'percentage'" class="notice">
          折扣券每笔订单仅优惠一件，其余商品仍按当前商品折后售价结算。
        </p>

        <div class="claim-actions">
          <template v-if="coupon.claimed">
            <div class="claimed-status" role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              已领取到你的账户
            </div>
            <router-link class="primary-button" :to="usePath">立即使用</router-link>
            <router-link class="text-button" to="/user/coupons">查看我的优惠券</router-link>
          </template>
          <button v-else-if="userStore.isLoggedIn" type="button" class="primary-button" :disabled="claiming || !coupon.claimable" @click="claimCoupon">
            {{ claiming ? '领取中…' : claimButtonText }}
          </button>
          <router-link v-else class="primary-button" :to="loginPath">登录后领取</router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { claimCouponRequest, formatCouponDate, formatCouponRule, getCouponRequest, getCouponUsePath } from '@/services/shop/couponService'

const route = useRoute()
const userStore = useUserStore()
const toast = useToast()
const loading = ref(true)
const claiming = ref(false)
const error = ref('')
const coupon = ref(null)

const token = computed(() => String(route.params.token || ''))
const scopeText = computed(() => coupon.value?.scopeType === 'product'
  ? `仅限「${coupon.value.productName || '指定商品'}」`
  : `${coupon.value?.sellerUsername || '该卖家'}店铺内平台商品`)
const usePath = computed(() => getCouponUsePath(coupon.value))
const loginPath = computed(() => ({ name: 'Login', query: { redirect: route.fullPath } }))
const claimButtonText = computed(() => {
  const state = coupon.value?.state
  if (state === 'scheduled') return '尚未开始领取'
  if (state === 'expired') return '优惠券已过期'
  if (state === 'closed') return '已停止领取'
  if (state === 'sold_out') return '优惠券已领完'
  if (state === 'disabled') return '优惠券已停用'
  return '领取优惠券'
})

async function loadCoupon() {
  loading.value = true
  error.value = ''
  const result = await getCouponRequest(token.value)
  if (result.success) coupon.value = result.data
  else error.value = result.error || '优惠券加载失败，请稍后重试'
  loading.value = false
}

async function claimCoupon() {
  if (claiming.value || !coupon.value?.claimable) return
  claiming.value = true
  const result = await claimCouponRequest(token.value)
  if (result.success) {
    toast.success(result.data?.alreadyClaimed ? '你已经领取过这张优惠券' : '领取成功')
    await loadCoupon()
  } else {
    toast.error(result.error || '领取失败，请稍后重试')
  }
  claiming.value = false
}

onMounted(loadCoupon)
</script>

<style scoped>
.coupon-claim-page { min-height: calc(100vh - 72px); padding: 40px 16px 96px; }
.claim-shell { width: min(100%, 620px); margin: 0 auto; }
.back-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-bottom: 16px; color: var(--text-secondary); font-size: 14px; }
.back-link svg { width: 20px; fill: none; stroke: currentColor; stroke-width: 2; }
.coupon-card { position: relative; overflow: hidden; padding: clamp(28px, 6vw, 48px); border: 1px solid var(--border-light); border-radius: 28px; background: var(--glass-bg-heavy); box-shadow: var(--shadow-lg); text-align: center; }
.coupon-card::before, .coupon-card::after { content: ''; position: absolute; top: 42%; width: 28px; height: 28px; border-radius: 50%; background: var(--bg-primary); border: 1px solid var(--border-light); }
.coupon-card::before { left: -15px; }.coupon-card::after { right: -15px; }
.ticket-mark { width: 72px; height: 72px; margin: 0 auto 20px; display: grid; place-items: center; border-radius: 22px; color: var(--color-primary-hover); background: var(--color-primary-light); }
.ticket-mark svg { width: 40px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.eyebrow { margin: 0 0 8px; color: var(--text-tertiary); font-size: 13px; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 5vw, 34px); line-height: 1.25; }
.coupon-value { margin: 12px 0 0; color: var(--color-danger); font-size: clamp(22px, 5vw, 30px); font-weight: 750; }
.description { margin: 12px auto 0; max-width: 460px; color: var(--text-secondary); line-height: 1.7; }
.rule-list { margin: 28px 0 0; padding: 8px 20px; border-radius: 18px; background: var(--bg-secondary); text-align: left; }
.rule-list div { display: grid; grid-template-columns: 92px 1fr; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--border-light); }
.rule-list div:last-child { border-bottom: 0; }.rule-list dt { color: var(--text-tertiary); }.rule-list dd { margin: 0; text-align: right; color: var(--text-primary); font-weight: 550; overflow-wrap: anywhere; }
.notice { margin: 18px 0 0; padding: 14px 16px; border-radius: 14px; color: var(--color-warning); background: var(--color-warning-bg); font-size: 13px; line-height: 1.65; text-align: left; }
.claim-actions { display: grid; gap: 10px; margin-top: 28px; }
.primary-button, .secondary-button { min-height: 48px; display: inline-flex; align-items: center; justify-content: center; border-radius: 14px; font-weight: 650; transition: transform .2s ease, opacity .2s ease, box-shadow .2s ease; }
.primary-button { padding: 0 22px; background: var(--publish-btn-bg); color: var(--publish-btn-color); box-shadow: var(--publish-btn-shadow); }
.primary-button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--publish-btn-hover-shadow); }.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.secondary-button { margin: 18px auto 0; padding: 0 22px; color: var(--text-primary); background: var(--bg-secondary); }
.text-button { min-height: 44px; display: grid; place-items: center; color: var(--text-secondary); }
.claimed-status { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; color: var(--color-success); font-weight: 650; }.claimed-status svg { width: 22px; fill: none; stroke: currentColor; stroke-width: 2.4; }
.state-card { padding-block: 56px; }.state-icon { width: 64px; fill: none; stroke: var(--color-warning); stroke-width: 1.6; }.state-card p { margin: 12px 0 0; color: var(--text-secondary); }
.skeleton { border-radius: 10px; background: var(--skeleton-gradient); background-size: 200% 100%; animation: shimmer 1.4s infinite; }.skeleton-icon { width: 72px; height: 72px; margin: 0 auto 20px; }.skeleton-title { width: 58%; height: 30px; margin: 0 auto 14px; }.skeleton-line { width: 82%; height: 18px; margin: 0 auto 32px; }.skeleton-button { width: 100%; height: 48px; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (max-width: 520px) { .coupon-claim-page { padding-top: 20px; }.coupon-card { border-radius: 22px; }.rule-list { padding-inline: 14px; }.rule-list div { grid-template-columns: 78px 1fr; gap: 10px; font-size: 13px; } }
@media (prefers-reduced-motion: reduce) { .primary-button, .skeleton { transition: none; animation: none; } }
</style>
