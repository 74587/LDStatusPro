<template>
  <div class="seller-refunds-page">
    <SellerPageToolbar eyebrow="AFTER-SALES LEDGER" description="集中处理买家退款申请。优先通过 LINUX DO 沟通，确认同意后由系统按原订单金额全额退回 LDC。">
      <template #actions>
        <button type="button" class="refund-refresh" :disabled="loading" @click="loadRefunds">
          <RefreshCw :class="{ spinning: loading }" :size="16" aria-hidden="true" />刷新
        </button>
      </template>
      <form class="refund-filter-form" role="search" @submit.prevent="applySearch">
        <div class="refund-tabs" role="tablist" aria-label="退款状态筛选">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="status === tab.value"
            :class="{ active: status === tab.value }"
            @click="selectStatus(tab.value)"
          >{{ tab.label }}<span v-if="tab.countKey">{{ summary[tab.countKey] || 0 }}</span></button>
        </div>
        <label class="refund-search">
          <Search :size="16" aria-hidden="true" />
          <span class="seller-sr-only">搜索退款申请</span>
          <input v-model.trim="search" type="search" placeholder="搜索订单号、买家或物品" />
        </label>
        <button type="submit" class="refund-search-submit">搜索</button>
      </form>
      <template #summary>
        <span>待响应 {{ summary.requested || 0 }}</span>
        <span>协商中 {{ summary.negotiating || 0 }}</span>
        <span :class="{ alert: summary.exception }">执行异常 {{ summary.exception || 0 }}</span>
        <span>已结束 {{ summary.closed || 0 }}</span>
      </template>
    </SellerPageToolbar>

    <div v-if="errorMessage" class="refund-page-error" role="alert">
      <CircleAlert :size="19" aria-hidden="true" />
      <div><strong>退款台账加载失败</strong><p>{{ errorMessage }}</p></div>
      <button type="button" @click="loadRefunds">重试</button>
    </div>

    <SellerDataTable
      caption="退款售后台账"
      :columns="columns"
      :rows="refunds"
      :loading="loading"
      row-key="id"
    >
      <template #cell-orderNo="{ row }">
        <router-link :to="detailTarget(row)" class="refund-order-link">
          <strong>{{ row.orderNo }}</strong>
          <small>{{ formatRefundDate(row.requestedAt) }}</small>
        </router-link>
      </template>
      <template #cell-buyer="{ row }">
        <div class="refund-party"><strong>@{{ row.buyerUsername || '未知买家' }}</strong><small>{{ row.productName }}</small></div>
      </template>
      <template #cell-reason="{ row }">
        <div class="refund-reason"><strong>{{ getRefundReasonLabel(row.reasonCode) }}</strong><small>{{ row.reasonDetail }}</small></div>
      </template>
      <template #cell-amount="{ row }"><strong class="refund-amount-cell">{{ Number(row.refundAmount || 0).toFixed(2) }} LDC</strong></template>
      <template #cell-status="{ row }"><SellerStatusBadge :label="getRefundStatusMeta(row.status).label" :tone="getRefundStatusMeta(row.status).tone" /></template>
      <template #cell-action="{ row }"><router-link :to="detailTarget(row)" class="refund-detail-link">查看处理<ArrowUpRight :size="14" aria-hidden="true" /></router-link></template>
      <template #mobile-row="{ row }">
        <div class="refund-mobile-head">
          <router-link :to="detailTarget(row)">{{ row.orderNo }}</router-link>
          <SellerStatusBadge :label="getRefundStatusMeta(row.status).label" :tone="getRefundStatusMeta(row.status).tone" />
        </div>
        <div class="refund-mobile-product"><strong>{{ row.productName }}</strong><span>@{{ row.buyerUsername || '未知买家' }}</span></div>
        <p class="refund-mobile-reason">{{ getRefundReasonLabel(row.reasonCode) }} · {{ row.reasonDetail }}</p>
        <div class="refund-mobile-foot"><strong>{{ Number(row.refundAmount || 0).toFixed(2) }} LDC</strong><router-link :to="detailTarget(row)">查看处理<ArrowUpRight :size="14" aria-hidden="true" /></router-link></div>
      </template>
      <template #empty>
        <div class="refund-empty">
          <BadgeCheck :size="34" aria-hidden="true" />
          <strong>{{ status === 'action_required' ? '当前没有待处理退款' : '没有符合筛选条件的退款记录' }}</strong>
          <p>{{ status === 'action_required' ? '新的退款申请会在这里形成待办。' : '可切换状态或清除搜索后再查看。' }}</p>
          <router-link to="/seller/orders">返回订单管理</router-link>
        </div>
      </template>
      <template #footer>
        <SellerPagination :page="pagination.page" :total-pages="pagination.totalPages" :total="pagination.total" @change="changePage" />
      </template>
    </SellerDataTable>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowUpRight, BadgeCheck, CircleAlert, RefreshCw, Search } from '@lucide/vue'
import SellerDataTable from '@/components/seller/SellerDataTable.vue'
import SellerPageToolbar from '@/components/seller/SellerPageToolbar.vue'
import SellerPagination from '@/components/seller/SellerPagination.vue'
import SellerStatusBadge from '@/components/seller/SellerStatusBadge.vue'
import { fetchSellerRefundsRequest } from '@/services/shop/refundService'
import { formatRefundDate, getRefundErrorMessage, getRefundReasonLabel, getRefundStatusMeta } from '@/utils/refund'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const refunds = ref([])
const status = ref(String(route.query.status || 'action_required'))
const search = ref(String(route.query.search || ''))
const summary = reactive({ total: 0, requested: 0, negotiating: 0, exception: 0, closed: 0, actionRequired: 0 })
const pagination = reactive({ page: Number(route.query.page) || 1, pageSize: 20, total: 0, totalPages: 0 })

const columns = Object.freeze([
  { key: 'orderNo', label: '订单 / 申请时间', width: '20%' },
  { key: 'buyer', label: '买家 / 物品', width: '21%' },
  { key: 'reason', label: '申请原因', width: '24%' },
  { key: 'amount', label: '全额退回', width: '12%' },
  { key: 'status', label: '状态', width: '13%' },
  { key: 'action', label: '', align: 'right', width: '10%' }
])

const statusTabs = [
  { value: 'action_required', label: '待处理', countKey: 'actionRequired' },
  { value: 'requested', label: '待响应', countKey: 'requested' },
  { value: 'negotiating', label: '协商中', countKey: 'negotiating' },
  { value: 'exception', label: '执行异常', countKey: 'exception' },
  { value: 'closed', label: '已结束', countKey: 'closed' },
  { value: 'all', label: '全部', countKey: 'total' }
]

function detailTarget(row) {
  return { path: `/seller/orders/${encodeURIComponent(row.orderNo)}`, query: { source: 'product', from: 'refunds' } }
}

async function syncRoute(next = {}) {
  await router.push({
    query: {
      status: next.status || status.value,
      ...(next.search ?? search.value ? { search: next.search ?? search.value } : {}),
      ...(Number(next.page || pagination.page) > 1 ? { page: next.page || pagination.page } : {})
    }
  })
}

async function selectStatus(nextStatus) {
  if (nextStatus === status.value) return
  status.value = nextStatus
  pagination.page = 1
  await syncRoute({ status: nextStatus, page: 1 })
}

async function applySearch() {
  pagination.page = 1
  await syncRoute({ search: search.value, page: 1 })
}

async function changePage(page) {
  pagination.page = page
  await syncRoute({ page })
}

async function loadRefunds() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchSellerRefundsRequest({
    status: status.value,
    search: search.value,
    page: pagination.page,
    pageSize: pagination.pageSize
  })
  if (!result?.success) {
    errorMessage.value = getRefundErrorMessage(result, '加载退款售后列表失败，请稍后重试')
    loading.value = false
    return
  }
  const data = result.data || result
  refunds.value = Array.isArray(data.refunds) ? data.refunds : []
  Object.assign(summary, data.summary || {})
  Object.assign(pagination, data.pagination || {})
  loading.value = false
}

watch(() => route.query, () => {
  status.value = String(route.query.status || 'action_required')
  search.value = String(route.query.search || '')
  pagination.page = Number(route.query.page) || 1
  loadRefunds()
})
onMounted(loadRefunds)
</script>

<style scoped>
/* 筛选表单 - 更清晰的布局 */
.refund-filter-form {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 状态标签页 - 温暖海军蓝配色 */
.refund-tabs {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.refund-tabs::-webkit-scrollbar { display: none; }

.refund-tabs button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 999px;
  color: #5C635D;
  background: #FFFFFF;
  border: 1px solid #E7E1D7;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 180ms ease;
}

.refund-tabs button:hover {
  background: #FBF9F5;
  border-color: #C4612F;
  color: #1F2421;
}

.refund-tabs button span {
  min-width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  padding: 0 6px;
  border-radius: 999px;
  color: #5C635D;
  background: #F7F4EF;
  font: 700 11px/1 ui-monospace, monospace;
}

.refund-tabs button.active {
  color: #FFFFFF;
  background: #1F2421;
  border-color: #1F2421;
  box-shadow: 0 2px 4px rgba(31, 36, 33, 0.15);
}

.refund-tabs button.active span {
  color: #1F2421;
  background: #F2E3D6;
}

/* 搜索框 - 柔和的聚焦效果 */
.refund-search {
  min-width: 240px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #E7E1D7;
  border-radius: 999px;
  color: #5C635D;
  background: #FFFFFF;
  transition: all 180ms ease;
}

.refund-search:hover {
  border-color: #C4612F;
  background: #FBF9F5;
}

.refund-search input {
  width: 100%;
  min-height: 42px;
  border: 0;
  outline: 0;
  color: #1F2421;
  background: transparent;
  font-size: 14px;
}

.refund-search input::placeholder {
  color: #5C635D;
}

.refund-search:focus-within {
  border-color: #C4612F;
  box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.15);
  background: #FFFFFF;
}

.refund-search-submit,
.refund-refresh {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid #E7E1D7;
  border-radius: 999px;
  color: #1F2421;
  background: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 180ms ease;
}

.refund-search-submit:hover,
.refund-refresh:hover {
  background: #C4612F;
  border-color: #C4612F;
  color: #FFFFFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(196, 97, 47, 0.2);
}

.refund-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 摘要统计 - 温暖色调胶囊 */
.seller-refunds-page :deep(.seller-filter-summary > span) {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid #E7E1D7;
  border-radius: 999px;
  color: #5C635D;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
}

.seller-refunds-page :deep(.seller-filter-summary > span.alert) {
  border-color: rgba(220, 38, 38, 0.3);
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

/* 表格单元格内容 - 改进可读性 */
.refund-order-link,
.refund-party,
.refund-reason {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.refund-order-link {
  text-decoration: none;
  transition: opacity 180ms ease;
}

.refund-order-link:hover { opacity: 0.8; }

.refund-order-link strong {
  color: #1F2421;
  font: 700 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
}

.refund-order-link small,
.refund-party small,
.refund-reason small {
  color: #5C635D;
  font-size: 12px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-party strong,
.refund-reason strong {
  overflow: hidden;
  color: #1F2421;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-amount-cell {
  color: #C4612F;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  white-space: nowrap;
}

/* 详情链接 - terracotta 强调色 */
.refund-detail-link {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  color: #C4612F;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  transition: all 180ms ease;
}

.refund-detail-link:hover {
  background: #F2E3D6;
  transform: translateY(-1px);
}

/* 错误状态 - 柔和的错误提示 */
.refund-page-error {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 14px;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

.refund-page-error p {
  margin: 4px 0 0;
  color: #5C635D;
  font-size: 13px;
  line-height: 1.6;
}

.refund-page-error button {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-weight: 600;
  transition: all 180ms ease;
}

.refund-page-error button:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 空状态 - 友好的空状态设计 */
.refund-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: #5C635D;
}

.refund-empty svg {
  color: #C4612F;
  opacity: 0.7;
}

.refund-empty strong {
  color: #1F2421;
  font-size: 16px;
}

.refund-empty p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.refund-empty a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  padding: 0 20px;
  border: 1px solid #E7E1D7;
  border-radius: 999px;
  color: #1F2421;
  font-weight: 600;
  text-decoration: none;
  transition: all 180ms ease;
}

.refund-empty a:hover {
  background: #C4612F;
  border-color: #C4612F;
  color: #FFFFFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(196, 97, 47, 0.2);
}

/* 移动端卡片布局 - 改进层次 */
.refund-mobile-head,
.refund-mobile-foot,
.refund-mobile-product {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.refund-mobile-head > a {
  color: #1F2421;
  font: 700 13px/1.5 ui-monospace, monospace;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.refund-mobile-product {
  margin-top: 14px;
}

.refund-mobile-product strong {
  color: #1F2421;
  font-weight: 600;
}

.refund-mobile-product span {
  color: #5C635D;
  font-size: 12px;
}

.refund-mobile-reason {
  margin: 12px 0;
  color: #5C635D;
  font-size: 13px;
  line-height: 1.7;
}

.refund-mobile-foot {
  padding-top: 12px;
  border-top: 1px solid #E7E1D7;
}

.refund-mobile-foot strong {
  color: #C4612F;
  font-weight: 700;
}

.refund-mobile-foot a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  color: #C4612F;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 180ms ease;
}

.refund-mobile-foot a:hover {
  background: #F2E3D6;
}

.seller-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.spinning {
  animation: refund-rotate 800ms linear infinite;
}

@keyframes refund-rotate {
  to { transform: rotate(360deg); }
}

/* 响应式优化 */
@media (max-width: 1100px) {
  .refund-filter-form {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .refund-tabs {
    flex: 1 1 100%;
  }
}

@media (max-width: 767px) {
  .refund-filter-form {
    flex-direction: column;
  }
  .refund-tabs,
  .refund-search,
  .refund-search-submit {
    width: 100%;
    box-sizing: border-box;
  }
  .refund-page-error {
    grid-template-columns: auto 1fr;
  }
  .refund-page-error button {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinning { animation: none; }
  .refund-tabs button,
  .refund-search-submit,
  .refund-refresh,
  .refund-detail-link,
  .refund-empty a,
  .refund-mobile-foot a {
    transition: none;
  }
  .refund-tabs button:hover,
  .refund-search-submit:hover,
  .refund-refresh:hover:not(:disabled),
  .refund-detail-link:hover,
  .refund-empty a:hover {
    transform: none;
  }
}
</style>
