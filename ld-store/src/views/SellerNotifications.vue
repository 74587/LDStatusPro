<template>
  <div class="seller-notifications page-container">
    <header class="page-header">
      <p class="notification-eyebrow">卖家后台 / 设置</p>
      <h1 class="page-title">通知设置</h1>
      <p>不在网站时，也能及时收到重要经营提醒。</p>
    </header>
    <p v-if="loading" role="status">正在加载通知设置…</p>
    <div v-else-if="!state">
      <p>暂时无法加载通知设置，请重试。</p>
      <button type="button" :disabled="busy" @click="load">重新加载</button>
    </div>
    <template v-if="state">
      <section class="notification-card" aria-labelledby="telegram-title" :aria-busy="busy">
        <div class="notification-heading">
          <div class="notification-channel-icon"><Send :size="24" aria-hidden="true" /></div>
          <div><h2 id="telegram-title">Telegram</h2><p>通过 LD 士多官方通知机器人接收私聊提醒</p></div>
          <SellerStatusBadge :label="statusLabel" :tone="state.status === 'enabled' ? 'success' : state.status === 'unavailable' ? 'warning' : 'neutral'" />
        </div>
        <p v-if="!state.available" class="notification-hint">Telegram 通知暂未开放，现有站内通知仍然有效。</p>
        <p v-if="state.telegramUsername">已连接账号：@{{ state.telegramUsername }}</p>
        <p v-else-if="state.status !== 'unbound'">已连接 Telegram 私聊账号</p>
        <p v-if="state.status === 'unavailable'" class="notification-hint">无法向此账号发送通知。请先在 Telegram 取消屏蔽机器人，再重新开启并发送测试通知。</p>
        <div v-if="!binding" class="notification-actions">
          <button v-if="state.status === 'unbound'" type="button" class="notification-primary" :disabled="busy || !state.available" @click="begin">连接 Telegram</button>
          <template v-else>
            <button v-if="state.status === 'enabled'" type="button" :disabled="busy" @click="change('pause')">暂停通知</button>
            <button v-else type="button" class="notification-primary" :disabled="busy || !state.available" @click="change('enable')">开启通知</button>
            <button type="button" :disabled="busy || !state.available || state.status !== 'enabled'" @click="test">发送测试通知</button>
            <button type="button" :disabled="busy || !state.available" @click="begin">更换账号</button>
            <button type="button" :disabled="busy" @click="confirmUnbind = true">解除绑定</button>
          </template>
        </div>
        <div v-if="confirmUnbind" class="notification-confirm" role="group" aria-label="确认解除绑定">
          <p>解除后将停止向此 Telegram 账号发送通知。</p>
          <div class="notification-actions">
            <button type="button" :disabled="busy" @click="unbind">确认解除绑定</button>
            <button type="button" :disabled="busy" @click="confirmUnbind = false">保留绑定</button>
          </div>
        </div>
        <div v-if="binding" class="notification-binding">
          <template v-if="waiting">
            <h3>在 Telegram 内确认，即可完成连接</h3>
            <p>首次打开请点击 Start，再核对平台账号并点击「确认绑定并开启」。无需切回网页。</p>
            <div class="notification-actions">
              <a class="notification-primary" :href="binding.url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">打开 Telegram</a>
              <button type="button" @click="copy">复制绑定链接</button>
            </div>
            <div v-if="qr" class="notification-qr"><img :src="qr" alt="用手机扫描此二维码，在 Telegram 内确认绑定" width="200" height="200"><p>在电脑上操作？用手机扫码连接</p></div>
            <p role="status">等待 Telegram 确认，链接约 {{ remainingMinutes }} 分钟后失效。请勿转发。</p>
            <a class="notification-copy-link" :href="binding.url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">{{ binding.url }}</a>
          </template>
          <p v-else>绑定链接已失效，请重新生成。</p>
          <button type="button" :disabled="busy || !state.available" @click="begin">重新生成链接</button>
          <button type="button" :disabled="busy" @click="load">刷新绑定结果</button>
        </div>
        <p v-else-if="waiting">存在待确认的绑定请求。请在 Telegram 中确认；如已找不到链接，可重新生成。</p>
        <div v-if="state.lastDelivery" class="notification-last">
          最近通知：{{ deliveryLabel }} · {{ formatDate(state.lastDelivery.at) }}
          <p v-if="state.lastDelivery.status === 'accepted'">Telegram 已接受消息，不代表你已阅读。</p>
        </div>
      </section>
      <section class="notification-card" aria-labelledby="scope-title">
        <h2 id="scope-title">会收到哪些提醒</h2>
        <ul class="notification-scope">
          <li><strong>待发货订单</strong><span>支付后首次提醒，以及 24、48、70 小时精选节点。</span></li>
          <li><strong>退款处理</strong><span>新申请、截止前 3 小时，以及重要处理结果。</span></li>
          <li><strong>库存与经营状态</strong><span>零库存下架预警、实际下架，以及履约交易限制生效或解除。</span></li>
        </ul>
        <p class="notification-hint">消息类型由系统固定。站内通知继续保留；通知延迟或未读不会延长发货、退款处理期限。</p>
      </section>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { Send } from '@lucide/vue'
import QRCode from 'qrcode'
import SellerStatusBadge from '@/components/seller/SellerStatusBadge.vue'
import { useSellerNotifications } from '@/composables/useSellerNotifications'
const { state, binding, loading, busy, waiting, remainingMinutes, load, begin, change, test, copy } = useSellerNotifications()
const qr = ref('')
const confirmUnbind = ref(false)
const statusLabel = computed(() => waiting.value ? '等待确认' : ({ unbound: '未绑定', enabled: '已开启', paused: '已暂停', unavailable: '渠道异常' })[state.value?.status] || '未绑定')
const deliveryLabel = computed(() => ({ pending: '等待发送', sending: '正在发送', accepted: 'Telegram 已接受', failed: '发送失败', unknown: '发送结果待核对', skipped: '已取消或无需提醒' })[state.value?.lastDelivery?.status] || '')
const formatDate = value => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）'
async function unbind() { await change('unbind'); confirmUnbind.value = false }
watch(() => binding.value?.url, async (url, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  qr.value = ''
  if (!url) return
  try { const data = await QRCode.toDataURL(url, { width: 200, margin: 2 }); if (!cancelled) qr.value = data }
  catch { /* The direct link remains usable if QR rendering fails. */ }
})
</script>
<style scoped>
.seller-notifications { max-width: 900px; }
.page-title { margin: 4px 0 8px; font-size: 28px; font-weight: 650; }
.notification-card h2 { font-size: 18px; font-weight: 650; }
.notification-card h3 { font-size: 16px; font-weight: 600; }
.notification-eyebrow, .notification-hint, .notification-last { color: var(--seller-muted); }
.notification-card { padding: 24px; margin-top: 20px; background: var(--seller-surface); border: 1px solid var(--seller-border); border-radius: 16px; }
.notification-heading { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.notification-heading > div:nth-child(2) { flex: 1; min-width: 180px; }
.notification-heading h2 { margin: 0; }
.notification-heading p { color: var(--seller-muted); margin: 6px 0; }
.notification-channel-icon { color: var(--seller-jade-strong); }
.notification-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
button, .notification-primary { min-height: 44px; padding: 10px 16px; border: 1px solid var(--seller-border); border-radius: 10px; background: var(--seller-surface-soft); color: var(--seller-ink); font: inherit; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
.notification-primary { background: var(--seller-jade-soft); color: var(--seller-jade-strong); }
button:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--seller-jade-strong); outline-offset: 3px; }
.notification-binding, .notification-confirm { border-top: 1px solid var(--seller-border); margin-top: 20px; padding-top: 16px; }
.notification-binding > button { margin: 8px 8px 0 0; }
.notification-copy-link { display: block; overflow-wrap: anywhere; color: var(--seller-jade-strong); font-size: 13px; margin: 12px 0; }
.notification-qr { margin: 16px 0; }
.notification-qr img { display: block; border-radius: 8px; }
.notification-scope { padding: 0; list-style: none; }
.notification-scope li { display: grid; gap: 6px; padding: 12px 0; border-bottom: 1px solid var(--seller-border); }
.notification-scope span { color: var(--seller-muted); }
p { line-height: 1.7; }
@media (max-width: 640px) { .notification-card { padding: 18px; } .notification-qr { display: none; } .notification-actions > * { flex: 1 1 auto; } }
</style>
