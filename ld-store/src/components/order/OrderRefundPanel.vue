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
/* 主卡片 - 温暖奶油色背景，柔和圆角 */
.refund-card {
  margin-bottom: 16px;
  padding: 24px;
  border: 1px solid #E7E1D7;
  border-radius: 16px;
  background: #FBF9F5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}

.refund-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

/* Eyebrow 标签 - terracotta 暖色 */
.refund-card__eyebrow {
  margin: 0 0 6px;
  padding: 4px 12px;
  display: inline-block;
  background: #F2E3D6;
  color: #A94E22;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
}

.refund-card h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #1F2421;
  font-size: 18px;
  font-weight: 600;
}

/* 状态徽章 - 全圆角胶囊 */
.refund-status {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.refund-status.is-warning { color: #b45309; background: rgba(245, 158, 11, 0.15); }
.refund-status.is-info { color: #0369a1; background: rgba(14, 165, 233, 0.15); }
.refund-status.is-success { color: #15803d; background: rgba(34, 197, 94, 0.15); }
.refund-status.is-danger { color: #C4612F; background: #F2E3D6; }

.refund-loading {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #5C635D;
}

.refund-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid #E7E1D7;
  border-top-color: #C4612F;
  border-radius: 50%;
  animation: refund-spin 800ms linear infinite;
}

.refund-error-state {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.refund-error-state p { margin: 4px 0 0; font-size: 13px; }
.refund-error-state button {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: inherit;
  font-weight: 600;
  transition: all 180ms ease;
}
.refund-error-state button:hover { background: rgba(239, 68, 68, 0.05); }

/* 进度条 - 更直观的视觉层次 */
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
  color: #5C635D;
  font-size: 11px;
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
  height: 3px;
  background: #E7E1D7;
  border-radius: 999px;
}

.refund-progress li:first-child::before { display: none; }
.refund-progress li.active::before { background: #C4612F; }

.refund-progress__dot {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 3px solid #E7E1D7;
  border-radius: 50%;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.refund-progress li.active { color: #1F2421; }
.refund-progress li.active .refund-progress__dot {
  border-color: #C4612F;
  color: #FFFFFF;
  background: #C4612F;
}

.refund-progress li.current .refund-progress__dot {
  box-shadow: 0 0 0 4px rgba(196, 97, 47, 0.2), 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 引导提示 - 柔和的信息色 */
.refund-guidance {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 14px;
  background: rgba(14, 165, 233, 0.06);
  color: #0369a1;
}

.refund-guidance svg { flex: 0 0 auto; }
.refund-guidance strong { color: #1F2421; }
.refund-guidance p { margin: 6px 0 0; color: #5C635D; font-size: 13px; line-height: 1.7; }

.refund-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.refund-actions--intro { justify-content: flex-end; margin-top: 16px; }

/* 按钮 - 全圆角胶囊设计，微妙 hover lift */
.refund-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 180ms ease;
}

.refund-btn--primary {
  color: #FFFFFF;
  background: #C4612F;
  box-shadow: 0 1px 2px rgba(196, 97, 47, 0.2);
}
.refund-btn--primary:hover:not(:disabled) {
  background: #A94E22;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(196, 97, 47, 0.25);
}

.refund-btn--secondary {
  color: #1F2421;
  border-color: #E7E1D7;
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.refund-btn--secondary:hover:not(:disabled) {
  border-color: #C4612F;
  background: #FBF9F5;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.refund-btn--danger {
  color: #FFFFFF;
  background: #dc2626;
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
}
.refund-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.25);
}

.refund-btn--outline-danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.3);
  background: #FFFFFF;
}
.refund-btn--outline-danger:hover:not(:disabled) {
  border-color: #dc2626;
  background: rgba(239, 68, 68, 0.05);
  transform: translateY(-1px);
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
  outline: 3px solid rgba(196, 97, 47, 0.3);
  outline-offset: 2px;
}

.refund-unavailable {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  color: #5C635D;
  font-size: 13px;
  line-height: 1.6;
}

/* 表单区域 - 增加视觉层次 */
.refund-form {
  display: grid;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed #E7E1D7;
}

.refund-form__errors {
  padding: 16px 18px;
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 14px;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}
.refund-form__errors ul { margin: 8px 0 0; padding-left: 20px; }
.refund-form__errors a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

/* 退款金额显示 - 突出视觉重心 */
.refund-amount {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 14px;
  padding: 18px;
  border-radius: 14px;
  background: #F2E3D6;
  border: 1px solid rgba(196, 97, 47, 0.15);
}
.refund-amount span { color: #5C635D; font-size: 13px; font-weight: 500; }
.refund-amount strong { color: #C4612F; font-size: 20px; font-weight: 700; }
.refund-amount small { grid-column: 1 / -1; color: #5C635D; font-size: 12px; line-height: 1.6; margin-top: 4px; }

.refund-field { display: grid; gap: 8px; }
.refund-field label { color: #1F2421; font-size: 14px; font-weight: 600; }
.refund-field__label-row { display: flex; align-items: center; justify-content: space-between; }
.refund-field__label-row span { color: #5C635D; font-size: 12px; font-weight: 500; }

.refund-field select,
.refund-field textarea {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid #E7E1D7;
  border-radius: 12px;
  color: #1F2421;
  background: #FFFFFF;
  font: inherit;
  transition: all 180ms ease;
}
.refund-field select:focus,
.refund-field textarea:focus {
  border-color: #C4612F;
  box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.1);
}
.refund-field textarea { min-height: 120px; resize: vertical; line-height: 1.7; }
.refund-field select[aria-invalid='true'],
.refund-field textarea[aria-invalid='true'] { border-color: #dc2626; }

.refund-field__help,
.refund-field__error { margin: 0; font-size: 12px; line-height: 1.6; }
.refund-field__help { color: #5C635D; }
.refund-field__error { color: #dc2626; font-weight: 500; }

.refund-checkbox {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  color: #1F2421;
  font-size: 14px;
  cursor: pointer;
  transition: background 180ms ease;
}
.refund-checkbox:hover { background: rgba(196, 97, 47, 0.04); }
.refund-checkbox input { width: 20px; height: 20px; accent-color: #C4612F; cursor: pointer; }

.refund-form__actions { display: flex; justify-content: flex-end; gap: 10px; }

/* 状态面板 - 更温暖的配色 */
.refund-status-panel { display: flex; gap: 14px; padding: 18px; border-radius: 14px; }
.refund-status-panel svg { flex: 0 0 auto; }
.refund-status-panel p { margin: 5px 0 0; color: #5C635D; font-size: 14px; line-height: 1.7; }
.refund-status-panel.is-warning { color: #b45309; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); }
.refund-status-panel.is-info { color: #0369a1; background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.15); }
.refund-status-panel.is-success { color: #15803d; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }
.refund-status-panel.is-danger { color: #C4612F; background: #F2E3D6; border: 1px solid rgba(196, 97, 47, 0.2); }

/* 详情列表 - 改进可读性 */
.refund-detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; margin: 20px 0 0; }
.refund-detail-list > div { min-width: 0; display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-bottom: 1px solid #E7E1D7; }
.refund-detail-list .wide { grid-column: 1 / -1; display: grid; }
.refund-detail-list dt { color: #5C635D; font-size: 13px; font-weight: 500; }
.refund-detail-list dd { margin: 0; color: #1F2421; font-size: 14px; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; font-weight: 500; }
.refund-detail-list .wide dd { margin-top: 6px; text-align: left; line-height: 1.7; font-weight: 400; }

.seller-response {
  padding: 16px !important;
  border: 1px solid rgba(196, 97, 47, 0.25) !important;
  border-radius: 14px;
  background: #F2E3D6;
}

.refund-seller-console { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #E7E1D7; }
.refund-seller-actions { justify-content: flex-end; }

.refund-seller-error {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 14px;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
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
@media (max-width: 520px) {
  .refund-card { padding: 18px; }
  .refund-card__header { align-items: center; flex-direction: column; gap: 12px; }
  .refund-progress li { font-size: 10px; }
  .refund-progress__dot { width: 28px; height: 28px; }
  .refund-detail-list { grid-template-columns: minmax(0, 1fr); }
  .refund-detail-list .wide { grid-column: auto; }
  .refund-actions, .refund-form__actions { flex-direction: column; }
  .refund-btn { width: 100%; box-sizing: border-box; }
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
