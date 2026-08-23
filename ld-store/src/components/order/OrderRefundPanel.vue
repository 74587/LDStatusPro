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
import { createRefundRequest, fetchOrderRefundRequest } from '@/services/shop/refundService'
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
const loading = ref(true)
const loadError = ref('')
const refundState = ref(null)
const formOpen = ref(false)
const submitting = ref(false)
const errors = ref({})
const errorSummary = ref(null)
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

watch(orderNo, (next, previous) => {
  if (next && next !== previous) loadRefund()
})
onMounted(loadRefund)
</script>

<style scoped>
.refund-card { margin-bottom: 16px; padding: 20px; border: 1px solid var(--border-light); border-radius: 18px; background: var(--bg-card); box-shadow: var(--shadow-sm); }
.refund-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.refund-card__eyebrow { margin: 0 0 4px; color: var(--color-primary); font-size: 11px; font-weight: 750; letter-spacing: .14em; }
.refund-card h3 { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--text-primary); font-size: 17px; }
.refund-status { min-height: 28px; display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.refund-status.is-warning { color: var(--color-warning); background: var(--color-warning-bg); }
.refund-status.is-info { color: var(--color-info); background: var(--color-info-bg); }
.refund-status.is-success { color: var(--color-success); background: var(--color-success-bg); }
.refund-status.is-danger { color: var(--color-danger); background: var(--color-danger-bg); }
.refund-loading { min-height: 96px; display: flex; align-items: center; justify-content: center; gap: 9px; color: var(--text-secondary); }
.refund-spinner { width: 18px; height: 18px; border: 2px solid var(--border-medium); border-top-color: var(--color-primary); border-radius: 50%; animation: refund-spin 800ms linear infinite; }
.refund-error-state { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; color: var(--color-danger); background: var(--color-danger-bg); }
.refund-error-state p { margin: 3px 0 0; font-size: 13px; }
.refund-error-state button { min-height: 44px; padding: 0 14px; border: 1px solid currentColor; border-radius: 10px; color: inherit; }
.refund-progress { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 0 20px; padding: 0; list-style: none; }
.refund-progress li { position: relative; display: grid; justify-items: center; gap: 7px; color: var(--text-tertiary); font-size: 11px; font-weight: 650; text-align: center; }
.refund-progress li::before { content: ''; position: absolute; z-index: 0; top: 14px; right: 50%; width: 100%; height: 2px; background: var(--border-medium); }
.refund-progress li:first-child::before { display: none; }
.refund-progress li.active::before { background: var(--color-primary); }
.refund-progress__dot { position: relative; z-index: 1; width: 28px; height: 28px; display: grid; place-items: center; border: 2px solid var(--border-medium); border-radius: 50%; background: var(--bg-card); font-size: 11px; }
.refund-progress li.active { color: var(--text-primary); }
.refund-progress li.active .refund-progress__dot { border-color: var(--color-primary); color: var(--bg-card); background: var(--color-primary); }
.refund-progress li.current .refund-progress__dot { box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 16%, transparent); }
.refund-guidance { display: flex; gap: 12px; padding: 15px; border: 1px solid color-mix(in srgb, var(--color-info) 28%, var(--border-light)); border-radius: 13px; background: var(--color-info-bg); color: var(--color-info); }
.refund-guidance svg { flex: 0 0 auto; }
.refund-guidance strong { color: var(--text-primary); }
.refund-guidance p { margin: 5px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.refund-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.refund-actions--intro { justify-content: flex-end; margin-top: 14px; }
.refund-btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 15px; border: 1px solid transparent; border-radius: 11px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; transition: border-color 180ms ease, background 180ms ease, color 180ms ease, opacity 180ms ease; }
.refund-btn--primary { color: #fff; background: var(--color-primary-hover); }
.refund-btn--secondary { color: var(--text-primary); border-color: var(--border-medium); background: var(--bg-card); }
.refund-btn--danger { color: #fff; background: var(--color-danger); }
.refund-btn:disabled { cursor: not-allowed; opacity: .52; }
.refund-btn:focus-visible, .refund-field select:focus-visible, .refund-field textarea:focus-visible, .refund-checkbox:focus-within { outline: 3px solid color-mix(in srgb, var(--color-primary) 42%, transparent); outline-offset: 2px; }
.refund-unavailable { display: flex; align-items: center; gap: 7px; margin: 13px 0 0; color: var(--text-secondary); font-size: 13px; }
.refund-form { display: grid; gap: 17px; margin-top: 18px; padding-top: 18px; border-top: 1px dashed var(--border-medium); }
.refund-form__errors { padding: 13px 15px; border: 1px solid color-mix(in srgb, var(--color-danger) 38%, var(--border-light)); border-radius: 11px; color: var(--color-danger); background: var(--color-danger-bg); }
.refund-form__errors ul { margin: 7px 0 0; padding-left: 20px; }
.refund-form__errors a { color: inherit; text-decoration: underline; }
.refund-amount { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 14px; border-radius: 12px; background: var(--bg-secondary); }
.refund-amount span { color: var(--text-secondary); font-size: 13px; }
.refund-amount strong { color: var(--text-primary); font-size: 17px; }
.refund-amount small { grid-column: 1 / -1; color: var(--text-tertiary); line-height: 1.5; }
.refund-field { display: grid; gap: 7px; }
.refund-field label { color: var(--text-primary); font-size: 13px; font-weight: 700; }
.refund-field__label-row { display: flex; align-items: center; justify-content: space-between; }
.refund-field__label-row span { color: var(--text-tertiary); font-size: 12px; }
.refund-field select, .refund-field textarea { width: 100%; min-height: 44px; box-sizing: border-box; padding: 11px 12px; border: 1px solid var(--border-medium); border-radius: 10px; color: var(--text-primary); background: var(--bg-card); font: inherit; }
.refund-field textarea { min-height: 116px; resize: vertical; line-height: 1.6; }
.refund-field select[aria-invalid='true'], .refund-field textarea[aria-invalid='true'] { border-color: var(--color-danger); }
.refund-field__help, .refund-field__error { margin: 0; font-size: 12px; line-height: 1.5; }
.refund-field__help { color: var(--text-tertiary); }
.refund-field__error { color: var(--color-danger); }
.refund-checkbox { min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; color: var(--text-secondary); font-size: 13px; cursor: pointer; }
.refund-checkbox input { width: 18px; height: 18px; accent-color: var(--color-primary); }
.refund-form__actions { display: flex; justify-content: flex-end; gap: 10px; }
.refund-status-panel { display: flex; gap: 11px; padding: 15px; border-radius: 13px; }
.refund-status-panel svg { flex: 0 0 auto; }
.refund-status-panel p { margin: 4px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.refund-status-panel.is-warning { color: var(--color-warning); background: var(--color-warning-bg); }
.refund-status-panel.is-info { color: var(--color-info); background: var(--color-info-bg); }
.refund-status-panel.is-success { color: var(--color-success); background: var(--color-success-bg); }
.refund-status-panel.is-danger { color: var(--color-danger); background: var(--color-danger-bg); }
.refund-detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; margin: 17px 0 0; }
.refund-detail-list > div { min-width: 0; display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border-light); }
.refund-detail-list .wide { grid-column: 1 / -1; display: grid; }
.refund-detail-list dt { color: var(--text-tertiary); font-size: 12px; }
.refund-detail-list dd { margin: 0; color: var(--text-primary); font-size: 13px; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; }
.refund-detail-list .wide dd { margin-top: 5px; text-align: left; line-height: 1.65; }
.seller-response { padding: 13px !important; border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--border-light)) !important; border-radius: 11px; background: var(--color-primary-light); }
.refund-dispute { display: flex; gap: 12px; margin-top: 16px; padding: 16px; border: 1px solid color-mix(in srgb, var(--color-warning) 36%, var(--border-light)); border-radius: 13px; color: var(--color-warning); background: var(--color-warning-bg); }
.refund-dispute p { margin: 5px 0 12px; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.refund-timeline { margin-top: 18px; }
.refund-timeline h4 { margin: 0 0 12px; color: var(--text-primary); font-size: 13px; }
.refund-timeline ol { margin: 0; padding: 0; list-style: none; }
.refund-timeline li { position: relative; display: grid; grid-template-columns: 16px 1fr; gap: 9px; padding: 0 0 15px; }
.refund-timeline li:not(:last-child)::before { content: ''; position: absolute; top: 10px; bottom: -1px; left: 5px; width: 1px; background: var(--border-medium); }
.refund-timeline__marker { position: relative; z-index: 1; width: 11px; height: 11px; margin-top: 4px; border: 2px solid var(--bg-card); border-radius: 50%; background: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
.refund-timeline strong { color: var(--text-primary); font-size: 13px; }
.refund-timeline p { margin: 4px 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
.refund-timeline time { color: var(--text-tertiary); font-size: 11px; }
.refund-spin-icon { animation: refund-spin 800ms linear infinite; }
@keyframes refund-spin { to { transform: rotate(360deg); } }
@media (max-width: 520px) {
  .refund-card { padding: 16px; }
  .refund-card__header { align-items: center; }
  .refund-progress li { font-size: 10px; }
  .refund-progress__dot { width: 26px; height: 26px; }
  .refund-detail-list { grid-template-columns: minmax(0, 1fr); }
  .refund-detail-list .wide { grid-column: auto; }
  .refund-actions, .refund-form__actions { flex-direction: column; }
  .refund-btn { width: 100%; box-sizing: border-box; }
}
@media (prefers-reduced-motion: reduce) {
  .refund-spinner, .refund-spin-icon { animation: none; }
  .refund-btn { transition: none; }
}
</style>
