<template>
  <section class="refund-card" aria-labelledby="refund-card-title">
    <header class="refund-card__header">
      <div>
        <p class="refund-card__eyebrow">订单保障</p>
        <h3 id="refund-card-title"><RotateCcw :size="18" aria-hidden="true" />退款与售后</h3>
      </div>
      <span v-if="refund" :class="['refund-status', `is-${statusMeta.tone}`]">
        {{ statusMeta.label }}
      </span>
    </header>

    <div v-if="loading" class="refund-loading" role="status">
      <span class="refund-spinner" aria-hidden="true"></span>
      正在加载售后状态…
    </div>

    <div v-else-if="loadError" class="refund-error-state" role="alert">
      <CircleAlert :size="19" aria-hidden="true" />
      <div><strong>售后状态加载失败</strong><p>{{ loadError }}</p></div>
      <button type="button" @click="loadRefund">重试</button>
    </div>

    <template v-else>
      <ol class="refund-progress" aria-label="退款处理进度">
        <li
          v-for="(step, index) in REFUND_PROGRESS_STEPS"
          :key="step"
          :class="{ active: index <= progressIndex, current: index === progressIndex }"
          :aria-current="index === progressIndex ? 'step' : undefined"
        >
          <span class="refund-progress__dot">
            <Check v-if="index < progressIndex" :size="13" aria-hidden="true" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span>{{ step }}</span>
        </li>
      </ol>

      <template v-if="!refund">
        <div class="refund-guidance">
          <MessageCircleMore :size="21" aria-hidden="true" />
          <div>
            <strong>{{ isBuyer ? '先私信卖家，通常处理得更快' : '当前没有退款申请' }}</strong>
            <p v-if="isBuyer">说明订单号和遇到的问题，并保留双方沟通记录。协商未解决时，再在这里申请全额退款。</p>
            <p v-else>买家提交申请后，你可以在这里查看理由并联系、同意或拒绝。</p>
          </div>
        </div>

        <div v-if="isBuyer" class="refund-actions refund-actions--intro">
          <a
            v-if="counterpartyMessageUrl"
            :href="counterpartyMessageUrl"
            target="_blank"
            rel="noopener"
            class="refund-btn refund-btn--secondary"
          >
            <MessageCircleMore :size="17" aria-hidden="true" />私信卖家
          </a>
          <button
            v-if="eligibility?.canApply"
            type="button"
            class="refund-btn refund-btn--primary"
            :aria-expanded="formOpen"
            @click="toggleForm"
          >
            <RotateCcw :size="17" aria-hidden="true" />申请退款
          </button>
        </div>
        <p v-if="isBuyer && eligibility && !eligibility.canApply" class="refund-unavailable">
          <Info :size="16" aria-hidden="true" />{{ eligibility.message }}
        </p>

        <form v-if="isBuyer && formOpen" class="refund-form" novalidate @submit.prevent="submitRefund">
          <div
            v-if="Object.keys(errors).length"
            ref="errorSummary"
            class="refund-form__errors"
            role="alert"
            tabindex="-1"
            aria-labelledby="refund-error-title"
          >
            <strong id="refund-error-title">请检查以下内容</strong>
            <ul>
              <li v-for="(message, field) in errors" :key="field">
                <a :href="`#refund-${field}`">{{ message }}</a>
              </li>
            </ul>
          </div>

          <div class="refund-amount">
            <span>原路退回</span>
            <strong>{{ refundAmount.toFixed(2) }} LDC</strong>
            <small>Credit 仅支持按原订单全额退回，金额不可修改。</small>
          </div>

          <div class="refund-field">
            <label for="refund-reasonCode">退款原因</label>
            <select
              id="refund-reasonCode"
              v-model="form.reasonCode"
              :aria-invalid="Boolean(errors.reasonCode)"
              :aria-describedby="errors.reasonCode ? 'refund-reason-error' : undefined"
              @blur="validateField('reasonCode')"
            >
              <option value="" disabled>请选择最接近的原因</option>
              <option v-for="option in REFUND_REASON_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p v-if="errors.reasonCode" id="refund-reason-error" class="refund-field__error">{{ errors.reasonCode }}</p>
          </div>

          <div class="refund-field">
            <div class="refund-field__label-row">
              <label for="refund-reasonDetail">问题说明</label>
              <span>{{ form.reasonDetail.length }}/500</span>
            </div>
            <textarea
              id="refund-reasonDetail"
              v-model.trim="form.reasonDetail"
              rows="5"
              maxlength="500"
              placeholder="请说明发生了什么、已经如何与卖家沟通，以及你希望怎样处理。"
              :aria-invalid="Boolean(errors.reasonDetail)"
              :aria-describedby="errors.reasonDetail ? 'refund-detail-error refund-detail-help' : 'refund-detail-help'"
              @blur="validateField('reasonDetail')"
            ></textarea>
            <p id="refund-detail-help" class="refund-field__help">不要填写登录密码、完整卡密、Client Key 或其他隐私信息。</p>
            <p v-if="errors.reasonDetail" id="refund-detail-error" class="refund-field__error">{{ errors.reasonDetail }}</p>
          </div>

          <label class="refund-checkbox">
            <input v-model="form.buyerContactedSeller" type="checkbox" />
            <span>我已经尝试通过 LINUX DO 联系卖家</span>
          </label>

          <div class="refund-form__actions">
            <button type="button" class="refund-btn refund-btn--secondary" :disabled="submitting" @click="closeForm">取消</button>
            <button type="submit" class="refund-btn refund-btn--danger" :disabled="submitting">
              <LoaderCircle v-if="submitting" class="refund-spin-icon" :size="17" aria-hidden="true" />
              <RotateCcw v-else :size="17" aria-hidden="true" />
              {{ submitting ? '提交中…' : '提交退款申请' }}
            </button>
          </div>
        </form>
      </template>

      <template v-else>
        <div :class="['refund-status-panel', `is-${statusMeta.tone}`]" role="status">
          <component :is="statusIcon" :size="22" aria-hidden="true" />
          <div><strong>{{ statusMeta.label }}</strong><p>{{ statusMeta.description }}</p></div>
        </div>

        <dl class="refund-detail-list">
          <div><dt>退款金额</dt><dd>{{ Number(refund.refundAmount || 0).toFixed(2) }} LDC</dd></div>
          <div><dt>退款原因</dt><dd>{{ getRefundReasonLabel(refund.reasonCode) }}</dd></div>
          <div><dt>申请时间</dt><dd>{{ formatRefundDate(refund.requestedAt) }}</dd></div>
          <div class="wide"><dt>问题说明</dt><dd>{{ refund.reasonDetail }}</dd></div>
          <div v-if="refund.sellerResponse" class="wide seller-response"><dt>卖家说明</dt><dd>{{ refund.sellerResponse }}</dd></div>
        </dl>

        <div v-if="!isBuyer && showSellerActions" class="refund-seller-console">
          <div v-if="refund.lastErrorMessage" class="refund-seller-error" role="alert">
            <TriangleAlert :size="19" aria-hidden="true" />
            <div><strong>{{ refund.status === 'unknown' ? '先核对 Credit，切勿直接重试' : '上次退款没有完成' }}</strong><p>{{ refund.lastErrorMessage }}</p></div>
          </div>

          <div class="refund-actions refund-seller-actions">
            <a
              v-if="counterpartyMessageUrl"
              :href="counterpartyMessageUrl"
              target="_blank"
              rel="noopener"
              class="refund-btn refund-btn--secondary"
            ><MessageCircleMore :size="17" aria-hidden="true" />私信买家</a>
            <button
              v-if="canSellerContact"
              type="button"
              class="refund-btn refund-btn--secondary"
              :aria-expanded="sellerActionMode === 'contact'"
              :disabled="sellerSubmitting"
              @click="openSellerAction('contact')"
            >标记协商中</button>
            <button
              v-if="canSellerDecide"
              type="button"
              class="refund-btn refund-btn--outline-danger"
              :aria-expanded="sellerActionMode === 'reject'"
              :disabled="sellerSubmitting"
              @click="openSellerAction('reject')"
            >拒绝申请</button>
            <button
              v-if="canSellerDecide"
              type="button"
              class="refund-btn refund-btn--primary"
              :disabled="sellerSubmitting"
              @click="approveRefund"
            >
              <LoaderCircle v-if="sellerSubmitting" class="refund-spin-icon" :size="17" aria-hidden="true" />
              <CircleCheckBig v-else :size="17" aria-hidden="true" />
              {{ refund.status === 'failed' ? '重试退款' : '同意并退款' }}
            </button>
          </div>

          <form v-if="sellerActionMode" class="refund-seller-form" @submit.prevent="submitSellerAction">
            <label for="refund-seller-message">
              {{ sellerActionMode === 'reject' ? '拒绝原因' : '协商备注（可选）' }}
            </label>
            <textarea
              id="refund-seller-message"
              v-model.trim="sellerMessage"
              rows="4"
              maxlength="500"
              :placeholder="sellerActionMode === 'reject' ? '请向买家明确说明未同意退款的原因（至少 5 个字）' : '可记录已经沟通的内容和下一步约定'"
              :aria-invalid="Boolean(sellerActionError)"
              :aria-describedby="sellerActionError ? 'refund-seller-action-error' : undefined"
            ></textarea>
            <p v-if="sellerActionError" id="refund-seller-action-error" class="refund-field__error" role="alert">{{ sellerActionError }}</p>
            <div class="refund-form__actions">
              <button type="button" class="refund-btn refund-btn--secondary" :disabled="sellerSubmitting" @click="closeSellerAction">取消</button>
              <button type="submit" :class="['refund-btn', sellerActionMode === 'reject' ? 'refund-btn--danger' : 'refund-btn--primary']" :disabled="sellerSubmitting">
                {{ sellerSubmitting ? '处理中…' : (sellerActionMode === 'reject' ? '确认拒绝' : '保存协商状态') }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="isBuyer && refund.status === 'rejected'" class="refund-dispute">
          <ShieldQuestion :size="22" aria-hidden="true" />
          <div>
            <strong>协商仍无法解决？</strong>
            <p>可前往 LINUX DO Credit 发起争议。请准备业务单号、Credit 编号、双方沟通记录和相关履约证据。</p>
            <div class="refund-actions">
              <a v-if="counterpartyMessageUrl" :href="counterpartyMessageUrl" target="_blank" rel="noopener" class="refund-btn refund-btn--secondary">再次私信卖家</a>
              <a :href="disputeGuideUrl" target="_blank" rel="noopener" class="refund-btn refund-btn--primary">查看 Credit 争议指引<ExternalLink :size="15" aria-hidden="true" /></a>
            </div>
          </div>
        </div>

        <div v-if="refund.events?.length" class="refund-timeline">
          <h4>售后进度</h4>
          <ol>
            <li v-for="event in [...refund.events].reverse()" :key="event.id">
              <span class="refund-timeline__marker" aria-hidden="true"></span>
              <div><strong>{{ getEventLabel(event.action) }}</strong><p v-if="event.message">{{ event.message }}</p><time>{{ formatRefundDate(event.createdAt) }}</time></div>
            </li>
          </ol>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  Check,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  ExternalLink,
  Info,
  LoaderCircle,
  MessageCircleMore,
  RotateCcw,
  ShieldQuestion,
  TriangleAlert
} from '@lucide/vue'
import { useDialog } from '@/composables/useDialog'
import { useToast } from '@/composables/useToast'
import { useNotificationSummaryStore } from '@/stores/notificationSummary'
import {
  approveRefundRequest,
  contactRefundBuyerRequest,
  createRefundRequest,
  fetchOrderRefundRequest,
  rejectRefundRequest
} from '@/services/shop/refundService'
import {
  REFUND_PROGRESS_STEPS,
  REFUND_REASON_OPTIONS,
  buildLinuxDoMessageUrl,
  formatRefundDate,
  getRefundErrorMessage,
  getRefundProgressIndex,
  getRefundReasonLabel,
  getRefundStatusMeta,
  validateRefundForm
} from '@/utils/refund'

const props = defineProps({
  order: { type: Object, required: true },
  role: { type: String, default: 'buyer' }
})
const emit = defineEmits(['updated'])
const dialog = useDialog()
const toast = useToast()
const notificationSummaryStore = useNotificationSummaryStore()
const loading = ref(true)
const loadError = ref('')
const refundState = ref(null)
const formOpen = ref(false)
const submitting = ref(false)
const errors = ref({})
const errorSummary = ref(null)
const sellerActionMode = ref('')
const sellerMessage = ref('')
const sellerActionError = ref('')
const sellerSubmitting = ref(false)
const form = reactive({ reasonCode: '', reasonDetail: '', buyerContactedSeller: false })

const orderNo = computed(() => props.order?.order_no || props.order?.orderNo || '')
const isBuyer = computed(() => props.role === 'buyer')
const refund = computed(() => refundState.value?.refund || null)
const eligibility = computed(() => refundState.value?.eligibility || null)
const disputeGuideUrl = computed(() => refundState.value?.disputeGuideUrl || 'https://credit.linux.do/docs/how-to-use#争议处理')
const statusMeta = computed(() => getRefundStatusMeta(refund.value?.status))
const progressIndex = computed(() => getRefundProgressIndex(refund.value?.status, Boolean(refund.value)))
const refundAmount = computed(() => Number(props.order?.paid_amount ?? props.order?.paidAmount ?? props.order?.amount ?? 0))
const counterpartyUsername = computed(() => isBuyer.value
  ? (props.order?.seller_username || props.order?.sellerUsername || props.order?.seller?.username)
  : (props.order?.buyer_username || props.order?.buyerUsername || props.order?.buyer?.username))
const counterpartyMessageUrl = computed(() => buildLinuxDoMessageUrl(
  counterpartyUsername.value,
  orderNo.value,
  isBuyer.value ? 'buyer' : 'seller'
))
const statusIcon = computed(() => {
  if (refund.value?.status === 'refunded') return CircleCheckBig
  if (['failed', 'unknown', 'rejected'].includes(refund.value?.status)) return TriangleAlert
  if (refund.value?.status === 'processing') return LoaderCircle
  return Clock3
})
const canSellerDecide = computed(() => !isBuyer.value && ['requested', 'negotiating', 'failed'].includes(refund.value?.status))
const canSellerContact = computed(() => !isBuyer.value && ['requested', 'negotiating', 'failed', 'unknown'].includes(refund.value?.status))
const showSellerActions = computed(() => canSellerDecide.value || canSellerContact.value)

const eventLabels = Object.freeze({
  requested: '买家提交退款申请',
  contacted: '卖家联系买家协商',
  approved: '卖家同意全额退款',
  rejected: '卖家拒绝退款申请',
  refund_succeeded: 'LDC 积分退款成功',
  refund_failed: '退款执行失败',
  refund_unknown: '退款结果等待核对'
})

function getEventLabel(action) {
  return eventLabels[action] || '售后状态更新'
}

async function loadRefund() {
  if (!orderNo.value) return
  loading.value = true
  loadError.value = ''
  const result = await fetchOrderRefundRequest(orderNo.value)
  if (result?.success) {
    refundState.value = result.data || result
  } else {
    loadError.value = getRefundErrorMessage(result, '加载退款状态失败，请稍后重试')
  }
  loading.value = false
}

function toggleForm() {
  formOpen.value = !formOpen.value
  errors.value = {}
}

function closeForm() {
  formOpen.value = false
  errors.value = {}
}

function validateField(field) {
  const nextErrors = validateRefundForm(form)
  errors.value = { ...errors.value, [field]: nextErrors[field] }
  if (!nextErrors[field]) delete errors.value[field]
}

async function submitRefund() {
  errors.value = validateRefundForm(form)
  if (Object.keys(errors.value).length) {
    await nextTick()
    errorSummary.value?.focus()
    return
  }
  const confirmed = await dialog.confirm(
    `将为订单 ${orderNo.value} 申请全额退回 ${refundAmount.value.toFixed(2)} LDC。提交后请等待卖家处理。`,
    { title: '确认提交退款申请', confirmText: '提交退款申请', cancelText: '返回检查' }
  )
  if (!confirmed) return

  submitting.value = true
  const result = await createRefundRequest(orderNo.value, {
    reasonCode: form.reasonCode,
    reasonDetail: form.reasonDetail,
    buyerContactedSeller: form.buyerContactedSeller
  })
  submitting.value = false
  if (!result?.success) {
    toast.error(getRefundErrorMessage(result, '提交退款申请失败，请稍后重试'))
    return
  }
  refundState.value = result.data || result
  formOpen.value = false
  toast.success('退款申请已提交')
  emit('updated')
}

function openSellerAction(mode) {
  sellerActionMode.value = sellerActionMode.value === mode ? '' : mode
  sellerMessage.value = mode === 'contact' ? (refund.value?.sellerResponse || '') : ''
  sellerActionError.value = ''
}

function closeSellerAction() {
  sellerActionMode.value = ''
  sellerMessage.value = ''
  sellerActionError.value = ''
}

async function applySellerResult(result, successMessage) {
  if (!result?.success) {
    const message = getRefundErrorMessage(result, '处理退款申请失败，请稍后重试')
    sellerActionError.value = message
    toast.error(message)
    await loadRefund()
    return false
  }
  refundState.value = result.data || result
  closeSellerAction()
  toast.success(successMessage)
  emit('updated')
  if (!isBuyer.value) notificationSummaryStore.refresh({ force: true })
  return true
}

async function submitSellerAction() {
  if (!sellerActionMode.value || sellerSubmitting.value) return
  if (sellerActionMode.value === 'reject' && sellerMessage.value.trim().length < 5) {
    sellerActionError.value = '请至少填写 5 个字，向买家说明拒绝原因'
    return
  }

  if (sellerActionMode.value === 'reject') {
    const confirmed = await dialog.confirm(
      '拒绝后，买家将在订单页看到你的说明，并可前往 LINUX DO Credit 发起争议。',
      { title: '确认拒绝退款申请', confirmText: '确认拒绝', cancelText: '继续协商' }
    )
    if (!confirmed) return
  }

  sellerSubmitting.value = true
  const result = sellerActionMode.value === 'reject'
    ? await rejectRefundRequest(orderNo.value, sellerMessage.value)
    : await contactRefundBuyerRequest(orderNo.value, sellerMessage.value)
  sellerSubmitting.value = false
  await applySellerResult(result, sellerActionMode.value === 'reject' ? '已拒绝退款申请' : '已更新为协商中')
}

async function approveRefund() {
  if (!canSellerDecide.value || sellerSubmitting.value) return
  const amount = Number(refund.value?.refundAmount || 0).toFixed(2)
  const retrying = refund.value?.status === 'failed'
  const confirmed = await dialog.confirm(
    `将通过 LINUX DO Credit 为订单 ${orderNo.value} 全额退回 ${amount} LDC。该操作成功后不可撤销，卡密、库存、优惠券和限购额度不会恢复。`,
    { title: retrying ? '确认重试退款' : '确认同意并退款', confirmText: retrying ? '确认重试' : '同意并退款', cancelText: '返回检查' }
  )
  if (!confirmed) return

  sellerSubmitting.value = true
  const result = await approveRefundRequest(orderNo.value)
  sellerSubmitting.value = false
  await applySellerResult(result, '退款已完成')
}

watch(orderNo, (next, previous) => {
  if (next && next !== previous) loadRefund()
})
onMounted(loadRefund)
</script>

<style scoped>
/* 主卡片 - 清晰的层次和对比度 */
.refund-card {
  margin-bottom: 20px;
  padding: 24px;
  border: 1px solid var(--border-medium);
  border-radius: 12px;
  background: var(--bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.refund-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

/* Eyebrow 标签 - 醒目的小标签 */
.refund-card__eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.refund-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 700;
}

/* 状态徽章 - 清晰的色彩和对比度 */
.refund-status {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}

.refund-status.is-warning {
  color: #92400e;
  background: var(--color-warning-bg);
  border-color: var(--color-warning-light);
}
.refund-status.is-info {
  color: #0c4a6e;
  background: var(--color-info-bg);
  border-color: #bae6fd;
}
.refund-status.is-success {
  color: #14532d;
  background: var(--color-success-bg);
  border-color: var(--color-success-light);
}
.refund-status.is-danger {
  color: #991b1b;
  background: var(--color-danger-bg);
  border-color: var(--color-danger-light);
}

.refund-loading {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 14px;
}

.refund-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: refund-spin 800ms linear infinite;
}

.refund-error-state {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  color: #991b1b;
  background: var(--color-danger-bg);
  border: 2px solid var(--color-danger-light);
}

.refund-error-state p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #7f1d1d;
  line-height: 1.5;
}
.refund-error-state button {
  min-height: 40px;
  padding: 0 18px;
  border: 2px solid #991b1b;
  border-radius: 8px;
  color: #991b1b;
  background: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.refund-error-state button:hover {
  background: #991b1b;
  color: white;
}

/* 进度条 - 清晰的视觉引导 */
.refund-progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}

.refund-progress li {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.refund-progress li::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 16px;
  right: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-medium);
}

.refund-progress li:first-child::before { display: none; }
.refund-progress li.active::before {
  background: var(--color-primary);
}

.refund-progress__dot {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 2px solid var(--border-medium);
  border-radius: 50%;
  background: white;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
}

.refund-progress li.active {
  color: var(--text-primary);
}
.refund-progress li.active .refund-progress__dot {
  border-color: var(--color-primary);
  color: white;
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(181, 168, 152, 0.15);
}

.refund-progress li.current .refund-progress__dot {
  box-shadow: 0 0 0 4px rgba(181, 168, 152, 0.2);
  animation: refund-pulse 2s ease-in-out infinite;
}

@keyframes refund-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(181, 168, 152, 0.2); }
  50% { box-shadow: 0 0 0 8px rgba(181, 168, 152, 0.1); }
}

/* 引导提示 - 清晰的信息框 */
.refund-guidance {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 2px solid #bae6fd;
  border-radius: 12px;
  background: var(--color-info-bg);
  color: #0c4a6e;
}

.refund-guidance svg {
  flex: 0 0 auto;
  color: #0369a1;
}
.refund-guidance strong {
  display: block;
  margin-bottom: 4px;
  color: #0c4a6e;
  font-size: 14px;
  font-weight: 700;
}
.refund-guidance p {
  margin: 0;
  color: #075985;
  font-size: 13px;
  line-height: 1.6;
}

.refund-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.refund-actions--intro { justify-content: flex-end; margin-top: 16px; }

/* 按钮 - 清晰的层次和状态 */
.refund-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.refund-btn--primary {
  color: white;
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.refund-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(181, 168, 152, 0.2);
}

.refund-btn--secondary {
  color: var(--text-primary);
  border-color: var(--border-heavy);
  background: white;
}
.refund-btn--secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.refund-btn--danger {
  color: white;
  background: var(--color-danger);
  border-color: var(--color-danger);
}
.refund-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.refund-btn--outline-danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: white;
}
.refund-btn--outline-danger:hover:not(:disabled) {
  border-color: #b91c1c;
  background: var(--color-danger-bg);
}
.refund-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none !important;
  box-shadow: none !important;
}

.refund-btn:focus-visible,
.refund-field select:focus-visible,
.refund-field textarea:focus-visible,
.refund-checkbox:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.refund-unavailable {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

/* 表单区域 - 清晰的分隔 */
.refund-form {
  display: grid;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid var(--border-light);
}

.refund-form__errors {
  padding: 14px 16px;
  border: 2px solid var(--color-danger-light);
  border-radius: 10px;
  color: #991b1b;
  background: var(--color-danger-bg);
  font-size: 14px;
  font-weight: 600;
}
.refund-form__errors ul { margin: 8px 0 0; padding-left: 20px; }
.refund-form__errors a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

/* 退款金额显示 - 醒目突出 */
.refund-amount {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 16px;
  padding: 18px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-medium);
}
.refund-amount span { color: var(--text-secondary); font-size: 14px; font-weight: 600; }
.refund-amount strong { color: var(--color-primary); font-size: 26px; font-weight: 800; }
.refund-amount small { grid-column: 1 / -1; color: var(--text-tertiary); font-size: 13px; line-height: 1.5; margin-top: 4px; }

.refund-field { display: grid; gap: 8px; }
.refund-field label { color: var(--text-primary); font-size: 14px; font-weight: 700; }
.refund-field__label-row { display: flex; align-items: center; justify-content: space-between; }
.refund-field__label-row span { color: var(--text-tertiary); font-size: 12px; font-weight: 600; }

.refund-field select,
.refund-field textarea {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 2px solid var(--border-medium);
  border-radius: 10px;
  color: var(--text-primary);
  background: white;
  font: inherit;
  font-size: 14px;
  transition: all 0.2s;
}
.refund-field select:focus,
.refund-field textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(181, 168, 152, 0.15);
  outline: none;
}
.refund-field textarea { min-height: 120px; resize: vertical; line-height: 1.6; }
.refund-field select[aria-invalid='true'],
.refund-field textarea[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.refund-field select[aria-invalid='true']:focus,
.refund-field textarea[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.refund-field__help,
.refund-field__error { margin: 0; font-size: 13px; line-height: 1.5; }
.refund-field__help { color: var(--text-tertiary); }
.refund-field__error { color: var(--color-danger); font-weight: 700; }

.refund-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.refund-checkbox input { width: 18px; height: 18px; accent-color: var(--color-primary); cursor: pointer; }

.refund-form__actions { display: flex; justify-content: flex-end; gap: 12px; }

/* 状态面板 - 清晰配色 */
.refund-status-panel { display: flex; gap: 14px; padding: 16px; border-radius: 12px; border: 2px solid transparent; }
.refund-status-panel svg { flex: 0 0 auto; }
.refund-status-panel p { margin: 4px 0 0; font-size: 14px; line-height: 1.6; }
.refund-status-panel.is-warning { color: #92400e; background: var(--color-warning-bg); border-color: var(--color-warning-light); }
.refund-status-panel.is-info { color: #0c4a6e; background: var(--color-info-bg); border-color: #bae6fd; }
.refund-status-panel.is-success { color: #14532d; background: var(--color-success-bg); border-color: var(--color-success-light); }
.refund-status-panel.is-danger { color: #991b1b; background: var(--color-danger-bg); border-color: var(--color-danger-light); }

/* 详情列表 - 清晰的信息展示 */
.refund-detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; margin: 20px 0 0; }
.refund-detail-list > div { min-width: 0; display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.refund-detail-list .wide { grid-column: 1 / -1; display: grid; }
.refund-detail-list dt { color: var(--text-secondary); font-size: 13px; font-weight: 700; }
.refund-detail-list dd { margin: 0; color: var(--text-primary); font-size: 14px; font-weight: 500; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; }
.refund-detail-list .wide dd { margin-top: 6px; text-align: left; line-height: 1.6; }

.seller-response {
  padding: 14px !important;
  border: 2px solid var(--border-medium) !important;
  border-radius: 10px;
  background: var(--bg-secondary);
}

.refund-seller-console { margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-light); }
.refund-seller-actions { justify-content: flex-end; }

.refund-seller-error {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;
  border: 2px solid var(--color-danger-light);
  border-radius: 12px;
  color: #991b1b;
  background: var(--color-danger-bg);
}
.refund-seller-error svg { flex: 0 0 auto; }
.refund-seller-error p { margin: 4px 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.6; }

.refund-seller-form {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding: 16px;
  border: 2px solid var(--border-medium);
  border-radius: 12px;
  background: var(--bg-secondary);
}
.refund-seller-form label { color: var(--text-primary); font-size: 14px; font-weight: 700; }
.refund-seller-form textarea {
  width: 100%;
  min-height: 110px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 2px solid var(--border-medium);
  border-radius: 10px;
  color: var(--text-primary);
  background: white;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
}
.refund-seller-form textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(181, 168, 152, 0.15);
  outline: none;
}

/* 争议引导 - 清晰醒目 */
.refund-dispute-guidance {
  margin-top: 18px;
  padding: 16px;
  border: 2px solid var(--color-warning-light);
  border-radius: 12px;
  background: var(--color-warning-bg);
  color: #92400e;
}
.refund-dispute-guidance strong { display: block; margin-bottom: 8px; color: #92400e; font-size: 15px; font-weight: 700; }
.refund-dispute-guidance p { margin: 0 0 12px; color: #78350f; font-size: 14px; line-height: 1.6; }
.refund-dispute-guidance ol { margin: 0; padding-left: 22px; color: #78350f; font-size: 14px; line-height: 1.8; }
.refund-dispute-guidance a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  color: var(--color-primary);
  font-weight: 700;
  text-decoration: none;
}
.refund-dispute-guidance a:hover { text-decoration: underline; }

/* 时间轴 - 清晰的事件流 */
.refund-timeline {
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}
.refund-timeline li {
  position: relative;
  padding: 0 0 16px 28px;
  border-left: 2px solid var(--border-medium);
}
.refund-timeline li:last-child { border-left-color: transparent; padding-bottom: 0; }
.refund-timeline li::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px white, 0 0 0 5px var(--border-medium);
}
.refund-timeline strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}
.refund-timeline time {
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* 响应式 */
@media (max-width: 767px) {
  .refund-card { padding: 18px; }
  .refund-card__header { flex-direction: column; align-items: flex-start; }
  .refund-progress { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .refund-progress li:nth-child(2)::before,
  .refund-progress li:nth-child(4)::before { display: none; }
  .refund-detail-list { grid-template-columns: 1fr; gap: 0; }
  .refund-detail-list > div { flex-direction: column; align-items: flex-start; }
  .refund-detail-list dd { text-align: left; }
  .refund-actions { width: 100%; }
  .refund-btn { flex: 1; justify-content: center; }
}

/* 深色模式适配 */
html.dark .refund-card {
  background: #1a1a1a;
  border-color: #333;
}
html.dark .refund-error-state {
  color: #fca5a5;
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.3);
}
html.dark .refund-guidance {
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.3);
}

/* 动画 */
@keyframes refund-spin {
  to { transform: rotate(360deg); }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .refund-btn,
  .refund-field select,
  .refund-field textarea,
  .refund-seller-form textarea,
  .refund-spinner,
  .refund-progress li.current .refund-progress__dot {
    transition: none;
    animation: none;
  }
  .refund-btn--primary:hover,
  .refund-btn--danger:hover {
    transform: none;
  }
  .refund-loading::after { animation: none; }
}

.refund-seller-error svg { flex: 0 0 auto; }
.refund-seller-error p { margin: 5px 0 0; color: #5C635D; font-size: 13px; line-height: 1.7; }

.refund-seller-form {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 18px;
  border: 1px solid #E7E1D7;
  border-radius: 14px;
  background: #FBF9F5;
}
.refund-seller-form label { color: #1F2421; font-size: 14px; font-weight: 600; }
.refund-seller-form textarea {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid #E7E1D7;
  border-radius: 12px;
  color: #1F2421;
  background: #FFFFFF;
  font: inherit;
  line-height: 1.7;
  resize: vertical;
  transition: all 180ms ease;
}
.refund-seller-form textarea:focus {
  border-color: #C4612F;
  box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.1);
}
.refund-seller-form textarea[aria-invalid='true'] { border-color: #dc2626; }

.refund-dispute {
  display: flex;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 14px;
  color: #b45309;
  background: rgba(245, 158, 11, 0.08);
}
.refund-dispute svg { flex: 0 0 auto; }
.refund-dispute strong { color: #1F2421; }
.refund-dispute p { margin: 6px 0 14px; color: #5C635D; font-size: 14px; line-height: 1.7; }

/* 时间线 - 更优雅的设计 */
.refund-timeline { margin-top: 20px; }
.refund-timeline h4 { margin: 0 0 16px; color: #1F2421; font-size: 14px; font-weight: 600; }
.refund-timeline ol { margin: 0; padding: 0; list-style: none; }
.refund-timeline li { position: relative; display: grid; grid-template-columns: 18px 1fr; gap: 12px; padding: 0 0 18px; }
.refund-timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: -2px;
  left: 6px;
  width: 2px;
  background: #E7E1D7;
  border-radius: 999px;
}
.refund-timeline__marker {
  position: relative;
  z-index: 1;
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border: 3px solid #FFFFFF;
  border-radius: 50%;
  background: #C4612F;
  box-shadow: 0 0 0 1px #C4612F;
}
.refund-timeline strong { color: #1F2421; font-size: 14px; font-weight: 600; }
.refund-timeline p { margin: 5px 0; color: #5C635D; font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
.refund-timeline time { color: #5C635D; font-size: 12px; opacity: 0.8; }

.refund-spin-icon { animation: refund-spin 800ms linear infinite; }
@keyframes refund-spin { to { transform: rotate(360deg); } }

/* 响应式优化 */
@media (max-width: 640px) {
  .refund-card { padding: 16px; }
  .refund-card__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .refund-card__eyebrow {
    font-size: 11px;
    padding: 4px 10px;
  }
  .refund-card h3 { font-size: 18px; }

  /* 进度条移动端优化 - 紧凑布局 */
  .refund-progress {
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin: 0 -8px 20px;
  }
  .refund-progress li {
    font-size: 11px;
    gap: 6px;
    padding: 0 4px;
  }
  .refund-progress__dot {
    width: 24px;
    height: 24px;
  }
  .refund-progress li::before {
    top: 12px;
  }

  /* 详情列表单列 */
  .refund-detail-list {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .refund-detail-list .wide {
    grid-column: auto;
  }

  /* 按钮组优化 - 保持横向排列，自动换行 */
  .refund-actions {
    gap: 10px;
  }
  .refund-actions--intro {
    flex-direction: row;
    justify-content: flex-start;
  }
  .refund-btn {
    flex: 1 1 auto;
    min-width: calc(50% - 5px);
    padding: 0 16px;
    font-size: 13px;
  }
  /* 单个按钮占满宽 */
  .refund-actions--intro .refund-btn:only-child,
  .refund-form__actions .refund-btn:only-child {
    flex: 1 1 100%;
    min-width: 100%;
  }

  /* 表单按钮组 */
  .refund-form__actions {
    gap: 10px;
  }

  /* 金额展示 */
  .refund-amount {
    padding: 14px;
    font-size: 15px;
  }
  .refund-amount strong {
    font-size: 22px;
  }

  /* 表单字段 */
  .refund-field label {
    font-size: 13px;
  }
  .refund-field select,
  .refund-field textarea {
    font-size: 14px;
    padding: 10px 12px;
  }

  /* 引导提示 */
  .refund-guidance {
    padding: 14px;
    gap: 10px;
  }
  .refund-guidance strong {
    font-size: 13px;
  }
  .refund-guidance p {
    font-size: 12px;
  }

  /* 状态徽章 */
  .refund-status {
    font-size: 12px;
    padding: 6px 12px;
  }

  /* 时间线优化 */
  .refund-timeline li {
    grid-template-columns: 14px 1fr;
    gap: 10px;
  }
  .refund-timeline__marker {
    width: 10px;
    height: 10px;
    margin-top: 4px;
  }
  .refund-timeline li:not(:last-child)::before {
    left: 5px;
    width: 2px;
  }
  .refund-timeline strong {
    font-size: 13px;
  }
  .refund-timeline p {
    font-size: 12px;
  }

  /* 卖家表单 */
  .refund-seller-form {
    padding: 14px;
    gap: 8px;
  }
  .refund-seller-form label {
    font-size: 13px;
  }
  .refund-seller-form textarea {
    min-height: 80px;
    font-size: 14px;
    padding: 10px 12px;
  }

  /* 错误状态 */
  .refund-error-state {
    grid-template-columns: auto 1fr;
    gap: 10px;
    padding: 14px;
  }
  .refund-error-state button {
    grid-column: 1 / -1;
    width: 100%;
  }

  /* 争议提示 */
  .refund-dispute {
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .refund-spinner, .refund-spin-icon { animation: none; }
  .refund-btn { transition: none; }
  .refund-btn:hover { transform: none; }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .refund-card { background: #2a2622; border-color: #3d3935; }
  .refund-card__eyebrow { background: rgba(196, 97, 47, 0.2); color: #e8a676; }
  .refund-card h3 { color: #f5f1ed; }
  .refund-progress__dot { background: #2a2622; border-color: #3d3935; }
  .refund-progress li.active .refund-progress__dot { background: #C4612F; }
  .refund-guidance { background: rgba(14, 165, 233, 0.12); border-color: rgba(14, 165, 233, 0.25); }
  .refund-guidance strong { color: #f5f1ed; }
  .refund-btn--primary { background: #C4612F; }
  .refund-btn--secondary { background: #2a2622; border-color: #3d3935; color: #f5f1ed; }
  .refund-btn--secondary:hover:not(:disabled) { background: #3d3935; }
  .refund-amount { background: rgba(196, 97, 47, 0.15); border-color: rgba(196, 97, 47, 0.25); }
  .refund-field select,
  .refund-field textarea { background: #2a2622; border-color: #3d3935; color: #f5f1ed; }
  .refund-status-panel.is-danger { background: rgba(196, 97, 47, 0.15); }
  .seller-response { background: rgba(196, 97, 47, 0.15); }
  .refund-seller-form { background: #2a2622; border-color: #3d3935; }
  .refund-seller-form textarea { background: #1a1815; border-color: #3d3935; color: #f5f1ed; }
  .refund-timeline__marker { border-color: #2a2622; }
}
</style>
