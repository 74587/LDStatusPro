<template>
  <div class="seller-notifications page-container">
    <header class="page-header">
      <p class="notification-eyebrow">重要经营提醒</p>
      <h1 class="page-title">通知设置</h1>
      <p class="notification-intro">连接 Telegram，让待发货、退款等重要待办及时找到你。</p>
    </header>
    <div v-if="loading" class="notification-empty" role="status">正在加载通知设置…</div>
    <div v-else-if="!state" class="notification-empty">
      <p>暂时无法加载通知设置，请重试。</p>
      <button type="button" class="notification-button" :disabled="busy" @click="load"><RefreshCw :size="16" aria-hidden="true" />重新加载</button>
    </div>
    <div v-if="state" class="notification-layout">
      <section class="notification-card notification-channel" aria-labelledby="telegram-title" :aria-busy="busy">
        <div class="notification-heading">
          <div class="notification-channel-icon"><Send :size="24" aria-hidden="true" /></div>
          <div class="notification-channel-title"><h2 id="telegram-title">Telegram</h2><p>官方机器人 · 私聊通知</p></div>
          <SellerStatusBadge :label="statusLabel" :tone="statusTone" />
        </div>

        <div class="notification-account">
          <span class="notification-caption">接收账号</span>
          <strong v-if="state.telegramUsername" class="notification-username">@{{ state.telegramUsername }}</strong>
          <strong v-else>{{ state.status === 'unbound' ? '尚未连接 Telegram' : '已连接 Telegram 私聊账号' }}</strong>
          <p>{{ channelDescription }}</p>
        </div>
        <p v-if="!state.available" class="notification-notice"><CircleAlert :size="17" aria-hidden="true" />Telegram 通知暂未开放，现有站内通知仍然有效。</p>

        <div v-if="!binding" class="notification-actions notification-main-actions">
          <button v-if="state.status === 'unbound'" ref="connectButton" type="button" class="notification-button notification-primary" :disabled="busy || !state.available" @click="begin"><Link2 :size="16" aria-hidden="true" />连接 Telegram</button>
          <template v-else>
            <button v-if="state.status !== 'enabled'" type="button" class="notification-button notification-primary" :disabled="busy || !state.available || confirmUnbind" @click="change('enable')"><Play :size="16" aria-hidden="true" />开启通知</button>
            <button type="button" class="notification-button" :class="{ 'notification-primary': state.status === 'enabled' }" :disabled="busy || !state.available || state.status !== 'enabled' || confirmUnbind" @click="test"><Send :size="16" aria-hidden="true" />发送测试通知</button>
            <button v-if="state.status === 'enabled'" type="button" class="notification-button notification-warning" :disabled="busy || confirmUnbind" @click="change('pause')"><Pause :size="16" aria-hidden="true" />暂停通知</button>
          </template>
        </div>
        <p v-if="state.status === 'unbound' && !binding" class="notification-hint">在机器人内确认即可完成连接，无需填写手机号或 Chat ID。</p>

        <div v-if="binding" class="notification-binding">
          <template v-if="waiting">
            <h3 ref="bindingHeading" tabindex="-1">在 Telegram 内确认连接</h3>
            <p v-if="state.status !== 'unbound'" class="notification-hint">新账号确认前，当前绑定和通知状态保持不变。</p>
            <div class="notification-binding-grid">
              <div>
                <ol class="notification-steps">
                  <li>打开机器人，首次使用请点击 <strong>Start</strong>。</li>
                  <li>核对平台账号，点击「确认绑定并开启」。<strong>无需切回网页。</strong></li>
                </ol>
                <div class="notification-actions">
                  <a class="notification-button notification-primary" :href="binding.url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><ExternalLink :size="16" aria-hidden="true" />打开 Telegram</a>
                  <button type="button" class="notification-button" @click="copy"><Copy :size="16" aria-hidden="true" />复制绑定链接</button>
                </div>
              </div>
              <figure v-if="qr" class="notification-qr"><img :src="qr" alt="用手机扫描此二维码，在 Telegram 内确认绑定" width="160" height="160"><figcaption>用手机扫码连接</figcaption></figure>
            </div>
            <p class="notification-waiting" role="status"><Clock3 :size="16" aria-hidden="true" />等待确认 · 链接约 {{ remainingMinutes }} 分钟后失效，请勿转发。</p>
            <details class="notification-link-help">
              <summary>无法自动打开？查看绑定链接</summary>
              <a class="notification-copy-link" :href="binding.url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">{{ binding.url }}</a>
            </details>
          </template>
          <p v-else class="notification-notice"><CircleAlert :size="17" aria-hidden="true" />绑定链接已失效，请重新生成。</p>
          <div class="notification-actions notification-binding-tools">
            <button type="button" class="notification-button" :disabled="busy || !state.available" @click="begin"><RefreshCw :size="16" aria-hidden="true" />重新生成链接</button>
            <button type="button" class="notification-button" :disabled="busy" @click="load">刷新绑定结果</button>
          </div>
        </div>
        <p v-else-if="waiting" class="notification-notice"><Clock3 :size="17" aria-hidden="true" />存在待确认的绑定请求。请在 Telegram 中确认；如已找不到链接，可重新生成。</p>

        <div v-if="state.lastDelivery" class="notification-last">
          <div class="notification-last-heading"><h3>最近发送</h3><SellerStatusBadge :label="deliveryLabel" :tone="deliveryTone" /></div>
          <time :datetime="state.lastDelivery.at">{{ formatDate(state.lastDelivery.at) }} <span>北京时间</span></time>
          <p>{{ deliveryDescription }}</p>
        </div>

        <div v-if="state.status !== 'unbound'" class="notification-management">
          <div class="notification-management-heading"><h3>账号管理</h3><p>更换接收账号，或停止使用此渠道。</p></div>
          <div v-if="!confirmUnbind" class="notification-actions">
            <button type="button" class="notification-button" :disabled="busy || !state.available" @click="begin"><RefreshCw :size="16" aria-hidden="true" />更换账号</button>
            <button ref="unbindButton" type="button" class="notification-button notification-danger" :disabled="busy" aria-controls="notification-unbind-confirm" :aria-expanded="confirmUnbind" @click="openUnbind"><Unlink :size="16" aria-hidden="true" />解除绑定</button>
          </div>
          <div v-else id="notification-unbind-confirm" class="notification-confirm" role="group" aria-labelledby="notification-unbind-title" @keydown.esc.stop.prevent="cancelUnbind">
            <h4 id="notification-unbind-title"><Unlink :size="17" aria-hidden="true" />解除 Telegram 绑定？</h4>
            <p>解除后将停止向此账号发送通知，再次接收需要重新连接。若只想临时停收，可以使用「暂停通知」。</p>
            <div class="notification-actions">
              <button ref="keepBindingButton" type="button" class="notification-button" :disabled="busy" @click="cancelUnbind">保留绑定</button>
              <button type="button" class="notification-button notification-danger" :disabled="busy" @click="unbind">{{ busy ? '正在解除…' : '确认解除绑定' }}</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="notification-card notification-scope-card" aria-labelledby="scope-title">
        <div class="notification-scope-heading"><p class="notification-eyebrow">仅发送关键节点</p><h2 id="scope-title">会收到哪些提醒</h2><p>精选重要经营通知，日常消息仍可在站内查看。</p></div>
        <ul class="notification-scope">
          <li><Package :size="19" aria-hidden="true" /><div><h3>待发货订单</h3><p>支付后首次提醒，以及 24、48、70 小时精选节点。</p></div></li>
          <li><RotateCcw :size="19" aria-hidden="true" /><div><h3>退款处理</h3><p>新申请、截止前 3 小时，以及重要处理结果。</p></div></li>
          <li><Store :size="19" aria-hidden="true" /><div><h3>库存与经营状态</h3><p>零库存下架预警、实际下架，以及履约交易限制生效或解除。</p></div></li>
        </ul>
        <div class="notification-scope-footer"><p>消息类型由系统固定，当前无需逐项设置。</p><p>站内通知继续保留；通知延迟或未读不会延长发货、退款处理期限。</p></div>
      </aside>
    </div>
  </div>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Send, Link2, Unlink, Play, Pause, ExternalLink, Copy, RefreshCw, Clock3, CircleAlert, Package, RotateCcw, Store } from '@lucide/vue'
import QRCode from 'qrcode'
import SellerStatusBadge from '@/components/seller/SellerStatusBadge.vue'
import { useSellerNotifications } from '@/composables/useSellerNotifications'
const { state, binding, loading, busy, waiting, remainingMinutes, load, begin, change, test, copy } = useSellerNotifications()
const qr = ref('')
const confirmUnbind = ref(false)
const unbindButton = ref(null)
const keepBindingButton = ref(null)
const connectButton = ref(null)
const bindingHeading = ref(null)
const statusLabel = computed(() => state.value?.status === 'unbound' && waiting.value ? '等待确认' : ({ unbound: '未绑定', enabled: '已开启', paused: '已暂停', unavailable: '渠道异常' })[state.value?.status] || '未绑定')
const statusTone = computed(() => state.value?.status === 'enabled' ? 'success' : waiting.value || ['paused', 'unavailable'].includes(state.value?.status) ? 'warning' : 'neutral')
const channelDescription = computed(() => ({
  unbound: '连接后，重要经营通知会发送到你的 Telegram 私聊。',
  enabled: '重要通知已开启。可发送一条测试通知，确认接收正常。',
  paused: '通知已暂停，账号绑定仍保留。开启后接收新的重要通知。',
  unavailable: '无法向此账号发送通知。请先在 Telegram 取消屏蔽机器人，再开启通知并测试。'
})[state.value?.status] || '')
const deliveryLabel = computed(() => ({ pending: '等待发送', sending: '正在发送', accepted: 'Telegram 已接受', failed: '发送失败', unknown: '发送结果待核对', skipped: '已取消或无需提醒' })[state.value?.lastDelivery?.status] || '')
const deliveryTone = computed(() => ({ accepted: 'success', failed: 'danger', unknown: 'warning' })[state.value?.lastDelivery?.status] || 'neutral')
const deliveryDescription = computed(() => ({
  pending: '消息已排队，发送结果会自动更新。', sending: '正在提交至 Telegram，请稍候。',
  accepted: 'Telegram 已接受消息，不代表你已阅读。', failed: '请检查渠道状态，稍后可发送测试通知确认。',
  unknown: '暂时无法确认发送结果，请先检查 Telegram 是否已收到。', skipped: '因渠道或业务状态变化，此条通知已取消或无需发送。'
})[state.value?.lastDelivery?.status] || '')
const formatDate = value => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
async function openUnbind() { confirmUnbind.value = true; await nextTick(); keepBindingButton.value?.focus() }
async function cancelUnbind() { if (busy.value) return; confirmUnbind.value = false; await nextTick(); unbindButton.value?.focus() }
async function unbind() {
  await change('unbind')
  if (state.value?.status === 'unbound') { confirmUnbind.value = false; await nextTick(); connectButton.value?.focus() }
}
watch(() => binding.value?.url, async (url, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  qr.value = ''
  if (!url) return
  await nextTick()
  if (cancelled) return
  bindingHeading.value?.focus({ preventScroll: true })
  try { const data = await QRCode.toDataURL(url, { width: 200, margin: 2 }); if (!cancelled) qr.value = data }
  catch { /* The direct link remains usable if QR rendering fails. */ }
})
</script>
<style scoped>
.seller-notifications {
  --notification-warning-ink: color-mix(in srgb, var(--seller-warning) 70%, var(--seller-ink));
  --notification-success-ink: color-mix(in srgb, var(--seller-jade-strong) 80%, var(--seller-ink));
  --notification-danger-ink: color-mix(in srgb, var(--seller-danger) 85%, var(--seller-ink));
  color: var(--seller-ink);
  font-family: var(--font-sans);
  padding-bottom: 24px;
}
.notification-eyebrow { margin: 0 0 6px; color: var(--seller-muted); font-size: 12px; font-weight: 600; letter-spacing: .08em; }
.page-title { margin: 0 0 10px; font-family: var(--font-serif); font-size: clamp(26px, 3vw, 30px); line-height: 1.35; font-weight: 600; }
.notification-intro { color: var(--seller-muted); font-size: 14px; line-height: 1.75; }
.notification-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); align-items: start; gap: 22px; }
.notification-card { min-width: 0; padding: 26px; background: var(--seller-surface); border: 1px solid var(--seller-border); border-radius: 16px; box-shadow: var(--seller-shadow-sm); }
.notification-card h2 { margin: 0; font-size: 19px; font-weight: 650; line-height: 1.4; }
.notification-card h3 { margin: 0; font-size: 14px; font-weight: 650; line-height: 1.5; }
.notification-card p { margin: 0; line-height: 1.75; }
.notification-heading { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.notification-channel :deep(.tone-success) { color: var(--notification-success-ink); }
.notification-channel :deep(.tone-warning) { color: var(--notification-warning-ink); }
.notification-channel :deep(.tone-danger) { color: var(--notification-danger-ink); }
.notification-channel-title { flex: 1; min-width: 140px; }
.notification-channel-title p { margin-top: 4px; font-size: 12px; color: var(--seller-muted); }
.notification-channel-icon { width: 46px; height: 46px; display: grid; place-items: center; flex-shrink: 0; border-radius: 13px; background: var(--seller-jade-soft); color: var(--seller-jade-strong); }
.notification-account { display: grid; gap: 6px; margin-top: 24px; }
.notification-caption { font-size: 12px; color: var(--seller-muted); }
.notification-account strong { font-size: 17px; line-height: 1.5; font-weight: 600; overflow-wrap: anywhere; }
.notification-account p, .notification-hint { color: var(--seller-muted); font-size: 13px; }
.notification-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.notification-main-actions { margin-top: 20px; margin-bottom: 12px; }
.notification-button {
  --notification-button-color: var(--seller-ink);
  --notification-button-bg: var(--seller-surface);
  --notification-button-border: var(--seller-border-strong);
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 44px; max-width: 100%; padding: 10px 15px;
  border: 1px solid var(--notification-button-border); border-radius: 10px;
  background: var(--notification-button-bg); color: var(--notification-button-color);
  font: inherit; font-size: 13px; font-weight: 600; line-height: 1.5; text-decoration: none; cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}
.notification-button svg { flex-shrink: 0; }
.notification-primary { --notification-button-color: var(--notification-success-ink); --notification-button-bg: var(--seller-jade-soft); --notification-button-border: color-mix(in srgb, var(--seller-jade) 50%, var(--seller-border)); }
.notification-warning { --notification-button-color: var(--notification-warning-ink); --notification-button-bg: color-mix(in srgb, var(--seller-warning) 10%, var(--seller-surface)); --notification-button-border: color-mix(in srgb, var(--seller-warning) 42%, var(--seller-border)); }
.notification-danger { --notification-button-color: var(--notification-danger-ink); --notification-button-bg: color-mix(in srgb, var(--seller-danger) 8%, var(--seller-surface)); --notification-button-border: color-mix(in srgb, var(--seller-danger) 40%, var(--seller-border)); }
@media (hover: hover) { .notification-button:hover:not(:disabled) { background: color-mix(in srgb, var(--notification-button-color) 7%, var(--notification-button-bg)); border-color: var(--notification-button-color); } }
.notification-button:active:not(:disabled) { box-shadow: inset 0 0 0 1px var(--notification-button-color); }
.notification-button:disabled { opacity: .5; cursor: not-allowed; }
.notification-button:focus-visible, .notification-copy-link:focus-visible, summary:focus-visible { outline: 3px solid var(--seller-jade); outline-offset: 3px; }
.notification-warning:focus-visible { outline-color: var(--notification-warning-ink); }
.notification-danger:focus-visible { outline-color: var(--seller-danger); }
.notification-card .notification-notice { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; padding: 12px; border-radius: 10px; background: color-mix(in srgb, var(--seller-warning) 8%, var(--seller-surface)); color: var(--notification-warning-ink); font-size: 13px; }
.notification-notice svg { flex-shrink: 0; margin-top: 3px; }
.notification-binding, .notification-last, .notification-management { border-top: 1px solid var(--seller-border); margin-top: 24px; padding-top: 20px; }
.notification-binding-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: start; margin-top: 14px; }
.notification-steps { list-style: decimal; padding-left: 20px; margin: 0; color: var(--seller-muted); font-size: 13px; line-height: 1.8; }
.notification-steps li + li { margin-top: 8px; }
.notification-steps strong { color: var(--seller-ink); font-weight: 500; }
.notification-qr { margin: 0; }
.notification-qr img { display: block; border-radius: 10px; border: 1px solid var(--seller-border); }
.notification-qr figcaption { margin-top: 8px; color: var(--seller-muted); font-size: 12px; text-align: center; }
.notification-card .notification-waiting { display: flex; align-items: flex-start; gap: 7px; margin-top: 18px; color: var(--notification-warning-ink); font-size: 12px; }
.notification-waiting svg { flex-shrink: 0; margin-top: 2px; }
.notification-link-help { margin-top: 8px; color: var(--seller-muted); font-size: 12px; }
.notification-link-help summary { width: fit-content; min-height: 44px; padding: 12px 0; cursor: pointer; }
.notification-copy-link { display: block; overflow-wrap: anywhere; padding: 12px; border-radius: 8px; background: var(--seller-surface-soft); color: var(--notification-success-ink); line-height: 1.7; }
.notification-binding-tools { margin-top: 8px; }
.notification-last-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.notification-last time { display: block; margin-top: 12px; font-size: 13px; font-variant-numeric: tabular-nums; }
.notification-last time span { margin-left: 6px; color: var(--seller-muted); font-size: 12px; }
.notification-last p { margin-top: 5px; color: var(--seller-muted); font-size: 12px; }
.notification-management-heading p { margin-top: 4px; color: var(--seller-muted); font-size: 12px; }
.notification-confirm { margin-top: 14px; padding: 16px; border: 1px solid color-mix(in srgb, var(--seller-danger) 35%, var(--seller-border)); border-radius: 12px; background: color-mix(in srgb, var(--seller-danger) 4%, var(--seller-surface)); }
.notification-confirm h4 { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; color: var(--notification-danger-ink); font-size: 14px; font-weight: 600; }
.notification-confirm p { color: var(--seller-muted); font-size: 13px; }
.notification-scope-card { background: color-mix(in srgb, var(--seller-surface) 65%, var(--seller-surface-soft)); }
.notification-scope-heading h2 { font-family: var(--font-serif); font-size: 18px; font-weight: 600; }
.notification-scope-heading > p:last-child { margin-top: 10px; color: var(--seller-muted); font-size: 13px; }
.notification-scope { margin: 6px 0 0; padding: 0; list-style: none; }
.notification-scope li { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px; padding: 20px 0; border-bottom: 1px solid var(--seller-border); }
.notification-scope svg { margin-top: 2px; color: var(--seller-jade-strong); }
.notification-scope p { margin-top: 6px; color: var(--seller-muted); font-size: 13px; }
.notification-scope-footer { padding-top: 18px; color: var(--seller-muted); font-size: 12px; }
.notification-scope-footer p + p { margin-top: 8px; }
.notification-empty { padding: 24px; border: 1px solid var(--seller-border); border-radius: 14px; color: var(--seller-muted); font-size: 14px; background: var(--seller-surface); }
.notification-empty .notification-button { margin-top: 16px; }
@media (max-width: 1100px) { .notification-layout { grid-template-columns: minmax(0, 1fr); } .notification-scope { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } .notification-scope li { border: 0; } .notification-scope-footer { border-top: 1px solid var(--seller-border); } }
@media (max-width: 640px) {
  .notification-layout { gap: 16px; }
  .notification-card { padding: 20px; border-radius: 14px; }
  .notification-channel-title { min-width: 120px; }
  .notification-heading { gap: 10px; }
  .notification-account { margin-top: 20px; }
  .notification-actions > * { flex: 1 1 auto; }
  .notification-scope { display: block; }
  .notification-scope li { padding: 18px 0; border-bottom: 1px solid var(--seller-border); }
  .notification-scope-footer { border-top: 0; }
  .notification-binding-grid { grid-template-columns: minmax(0, 1fr); }
  .notification-qr { display: none; }
}
@media (prefers-reduced-motion: reduce) { .notification-button { transition: none; } }
</style>
