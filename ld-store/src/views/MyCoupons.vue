<template>
  <div class="wallet-page">
    <main class="wallet-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">COUPON WALLET</p>
          <h1>我的优惠券</h1>
          <p class="subtitle">结算时由你主动选择，每笔订单最多使用一张。</p>
        </div>
        <router-link to="/user/coupons/manage" class="manage-link">卖家优惠券管理</router-link>
      </header>

      <nav class="status-tabs" role="tablist" aria-label="优惠券分类">
        <button
          v-for="tab in tabs"
          :id="`coupon-tab-${tab.value}`"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="activeStatus === tab.value"
          :aria-controls="`coupon-panel-${tab.value}`"
          :class="{ active: activeStatus === tab.value }"
          @click="selectStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section
        :id="`coupon-panel-${activeStatus}`"
        role="tabpanel"
        :aria-labelledby="`coupon-tab-${activeStatus}`"
        :aria-busy="loading"
      >
        <div v-if="loading" class="coupon-grid" aria-live="polite">
          <article v-for="item in 4" :key="item" class="coupon-item skeleton-card">
            <span class="skeleton line short" /><span class="skeleton line title" /><span class="skeleton line" /><span class="skeleton button" />
          </article>
        </div>

        <div v-else-if="error" class="state-box" role="alert">
          <p>{{ error }}</p>
          <button type="button" @click="loadCoupons">重新加载</button>
        </div>

        <div v-else-if="items.length" class="coupon-grid">
          <article v-for="item in items" :key="item.claimId" :class="['coupon-item', `status-${activeStatus}`]">
            <div class="coupon-topline">
              <span class="scope-badge">{{ item.campaign.scopeType === 'product' ? '商品券' : '店铺券' }}</span>
              <span v-if="item.claimStatus === 'reserved'" class="state-badge reserved">订单占用中</span>
              <span v-else-if="isScheduled(item.campaign)" class="state-badge scheduled">待生效</span>
              <span v-else-if="activeStatus === 'used'" class="state-badge used">已使用</span>
              <span v-else-if="activeStatus === 'expired'" class="state-badge expired">已失效</span>
            </div>
            <h2>{{ item.campaign.name }}</h2>
            <p class="coupon-rule">{{ formatCouponRule(item.campaign) }}</p>
            <p class="seller">{{ item.campaign.sellerUsername }} · {{ scopeText(item.campaign) }}</p>

            <dl class="coupon-meta">
              <div><dt>使用门槛</dt><dd>{{ minSpendText(item.campaign) }}</dd></div>
              <div><dt>{{ activeStatus === 'used' ? '使用时间' : '有效期至' }}</dt><dd>{{ formatCouponDate(activeStatus === 'used' ? item.usedAt : item.campaign.expiresAt) }}</dd></div>
              <div v-if="activeStatus === 'used'"><dt>实际优惠</dt><dd>{{ Number(item.actualDiscountAmount || 0).toFixed(2) }} LDC</dd></div>
              <div v-if="activeStatus === 'expired'"><dt>失效原因</dt><dd>{{ item.invalidReason || '已过期' }}</dd></div>
            </dl>

            <div class="coupon-actions">
              <router-link v-if="item.claimStatus === 'reserved'" :to="`/order/${item.reservedOrderNo}`" class="secondary-action">查看占用订单</router-link>
              <router-link v-else-if="activeStatus === 'unused'" :to="getCouponUsePath(item.campaign)" class="primary-action">立即使用</router-link>
              <router-link v-else-if="activeStatus === 'used' && item.usedOrderNo" :to="`/order/${item.usedOrderNo}`" class="secondary-action">查看使用订单</router-link>
            </div>
          </article>
        </div>

        <div v-else class="state-box empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9a3 3 0 0 0 0 6v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5V15a3 3 0 0 0 0-6V7.5Z" /></svg>
          <h2>{{ emptyText }}</h2>
          <p>{{ activeStatus === 'unused' ? '从卖家分享的领取链接获取优惠券吧。' : '这里会保留对应的优惠券记录。' }}</p>
        </div>

        <nav v-if="pagination.totalPages > 1" class="pagination" aria-label="优惠券分页">
          <button type="button" :disabled="pagination.page <= 1" @click="goPage(pagination.page - 1)">上一页</button>
          <span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
          <button type="button" :disabled="pagination.page >= pagination.totalPages" @click="goPage(pagination.page + 1)">下一页</button>
        </nav>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchMyCouponsRequest, formatCouponDate, formatCouponRule, getCouponUsePath } from '@/services/shop/couponService'

const tabs = [
  { value: 'unused', label: '未使用' },
  { value: 'used', label: '已使用' },
  { value: 'expired', label: '已过期' }
]
const route = useRoute()
const router = useRouter()
const activeStatus = ref(tabs.some(tab => tab.value === route.query.status) ? route.query.status : 'unused')
const loading = ref(true)
const error = ref('')
const items = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const emptyText = computed(() => ({ unused: '暂无未使用优惠券', used: '暂无已使用优惠券', expired: '暂无已过期优惠券' }[activeStatus.value]))

function isScheduled(campaign) { return campaign?.startsAt && new Date(campaign.startsAt).getTime() > Date.now() }
function minSpendText(campaign) { return Number(campaign?.minSpend || 0) > 0 ? `满 ${Number(campaign.minSpend).toFixed(2)} LDC` : '无门槛' }
function scopeText(campaign) { return campaign.scopeType === 'product' ? (campaign.productName || '指定商品') : '店铺内平台商品' }

async function loadCoupons(page = pagination.value.page || 1) {
  loading.value = true
  error.value = ''
  const result = await fetchMyCouponsRequest(activeStatus.value, page, 20)
  if (result.success) {
    items.value = Array.isArray(result.data?.items) ? result.data.items : []
    pagination.value = result.data?.pagination || { page, pageSize: 20, total: items.value.length, totalPages: 1 }
  } else {
    items.value = []
    error.value = result.error || '优惠券加载失败，请稍后重试'
  }
  loading.value = false
}

function selectStatus(status) {
  if (status === activeStatus.value) return
  activeStatus.value = status
}
function goPage(page) { loadCoupons(page) }

watch(activeStatus, async (status) => {
  await router.replace({ query: status === 'unused' ? {} : { status } })
  await loadCoupons(1)
})
onMounted(() => loadCoupons(1))
</script>

<style scoped>
.wallet-page { min-height: calc(100vh - 72px); padding: 44px 16px 100px; }
.wallet-shell { width: min(100%, 1080px); margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 26px; }
.eyebrow { margin: 0 0 6px; color: var(--text-tertiary); font-size: 12px; font-weight: 700; letter-spacing: .14em; }
h1 { margin: 0; font-size: clamp(28px, 5vw, 40px); line-height: 1.2; }.subtitle { margin: 10px 0 0; color: var(--text-secondary); }
.manage-link { min-height: 44px; display: inline-flex; align-items: center; padding: 0 18px; border: 1px solid var(--border-medium); border-radius: 13px; background: var(--glass-bg); color: var(--text-primary); font-size: 14px; white-space: nowrap; }
.status-tabs { width: fit-content; display: flex; gap: 4px; padding: 5px; margin-bottom: 24px; border: 1px solid var(--border-light); border-radius: 16px; background: var(--glass-bg-medium); }
.status-tabs button { min-width: 92px; min-height: 44px; padding: 0 18px; border-radius: 12px; color: var(--text-secondary); font-weight: 600; transition: background .2s ease, color .2s ease, box-shadow .2s ease; }
.status-tabs button.active { color: var(--text-primary); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.coupon-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.coupon-item { position: relative; overflow: hidden; padding: 24px; border: 1px solid var(--border-light); border-radius: 22px; background: var(--glass-bg-heavy); box-shadow: var(--shadow-md); }
.coupon-item::after { content: ''; position: absolute; top: 0; right: 0; width: 92px; height: 5px; border-radius: 0 0 0 5px; background: var(--color-primary); }.coupon-item.status-used::after { background: var(--color-success); }.coupon-item.status-expired::after { background: var(--text-tertiary); }
.coupon-topline { min-height: 28px; display: flex; justify-content: space-between; gap: 10px; }
.scope-badge, .state-badge { display: inline-flex; align-items: center; width: fit-content; min-height: 26px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 650; }
.scope-badge { color: var(--color-primary-hover); background: var(--color-primary-light); }.state-badge.reserved { color: var(--color-warning); background: var(--color-warning-bg); }.state-badge.scheduled { color: var(--color-info); background: var(--color-info-bg); }.state-badge.used { color: var(--color-success); background: var(--color-success-bg); }.state-badge.expired { color: var(--text-secondary); background: var(--bg-tertiary); }
.coupon-item h2 { margin: 18px 0 0; font-size: 20px; line-height: 1.35; }.coupon-rule { margin: 8px 0 0; color: var(--color-danger); font-size: 20px; font-weight: 750; }.seller { margin: 8px 0 0; color: var(--text-tertiary); font-size: 13px; }
.coupon-meta { margin: 20px 0 0; padding-top: 14px; border-top: 1px dashed var(--border-medium); }.coupon-meta div { display: flex; justify-content: space-between; gap: 18px; padding: 5px 0; font-size: 13px; }.coupon-meta dt { color: var(--text-tertiary); }.coupon-meta dd { margin: 0; color: var(--text-secondary); text-align: right; }
.coupon-actions { margin-top: 20px; }.primary-action, .secondary-action { min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 13px; font-weight: 650; }.primary-action { background: var(--publish-btn-bg); color: var(--publish-btn-color); }.secondary-action { border: 1px solid var(--border-medium); background: var(--bg-secondary); color: var(--text-primary); }
.state-box { min-height: 280px; display: grid; place-items: center; align-content: center; gap: 12px; padding: 36px; border: 1px solid var(--border-light); border-radius: 22px; background: var(--glass-bg); text-align: center; }.state-box p { margin: 0; color: var(--text-secondary); }.state-box button { min-height: 44px; padding: 0 18px; border-radius: 12px; background: var(--bg-tertiary); color: var(--text-primary); }.state-box svg { width: 54px; fill: none; stroke: var(--text-tertiary); stroke-width: 1.5; }.state-box h2 { margin: 4px 0 0; font-size: 19px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 26px; color: var(--text-secondary); font-size: 13px; }.pagination button { min-height: 44px; padding: 0 16px; border: 1px solid var(--border-medium); border-radius: 12px; color: var(--text-primary); }.pagination button:disabled { opacity: .4; cursor: not-allowed; }
.skeleton-card { min-height: 290px; }.skeleton { display: block; background: var(--skeleton-gradient); background-size: 200% 100%; animation: shimmer 1.4s infinite; }.skeleton.line { width: 100%; height: 15px; margin-top: 16px; border-radius: 7px; }.skeleton.short { width: 28%; margin-top: 0; }.skeleton.title { width: 65%; height: 24px; }.skeleton.button { height: 44px; margin-top: 58px; border-radius: 13px; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (max-width: 720px) { .wallet-page { padding-top: 26px; }.page-header { align-items: flex-start; flex-direction: column; }.coupon-grid { grid-template-columns: 1fr; }.status-tabs { width: 100%; }.status-tabs button { flex: 1; min-width: 0; padding-inline: 8px; }.manage-link { width: 100%; justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .status-tabs button, .skeleton { transition: none; animation: none; } }
</style>
