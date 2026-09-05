import { computed, onMounted, onUnmounted, ref } from 'vue'
import { beginTelegramBinding, changeTelegramChannel, fetchNotificationChannel, testTelegramChannel } from '@/services/shop/notificationChannelService'

export function useSellerNotifications() {
  const state = ref(null)
  const binding = ref(null)
  const loading = ref(true)
  const busy = ref(false)
  const error = ref('')
  const feedback = ref('')
  const now = ref(Date.now())
  let timer
  let disposed = false
  let generation = 0
  let lastPoll = 0
  const expiresAt = computed(() => binding.value?.expiresAt || state.value?.pendingExpiresAt)
  const waiting = computed(() => !!expiresAt.value && Date.parse(expiresAt.value) > now.value)
  const remainingMinutes = computed(() => Math.max(0, Math.ceil((Date.parse(expiresAt.value || '') - now.value) / 60000)))
  async function load() {
    if (busy.value) return
    const current = ++generation
    loading.value = !state.value
    const result = await fetchNotificationChannel()
    if (disposed || current !== generation) return
    loading.value = false
    if (!result.success) { error.value = result.error; return }
    error.value = ''
    const previouslyWaiting = !!binding.value
    state.value = result.data
    if (!result.data.pendingExpiresAt && binding.value) {
      binding.value = null
      if (previouslyWaiting && result.data.status === 'enabled') feedback.value = '已连接 Telegram，重要通知已开启。'
    }
  }
  async function run(action) {
    if (busy.value) return
    busy.value = true
    generation++
    error.value = ''
    feedback.value = ''
    try { await action() } catch { error.value = '操作失败，请稍后重试' }
    finally { busy.value = false; loading.value = false }
  }
  async function begin() {
    await run(async () => {
      const result = await beginTelegramBinding()
      if (disposed) return
      if (!result.success) { error.value = result.error; return }
      // Keep the link only in memory; never persist a binding credential.
      const url = new URL(result.data.url)
      if (url.origin !== 'https://t.me') { error.value = '绑定地址异常，请稍后重试'; return }
      binding.value = result.data
      now.value = Date.now()
      feedback.value = '链接已就绪。打开 Telegram 后，在机器人内确认即可完成绑定。'
    })
  }
  async function change(action) {
    await run(async () => {
      const result = await changeTelegramChannel(action)
      if (disposed) return
      if (!result.success) { error.value = result.error; return }
      state.value = result.data
      binding.value = null
      feedback.value = action === 'unbind' ? '已解除绑定' : action === 'pause' ? '已暂停重要通知' : '已开启重要通知'
    })
  }
  async function test() {
    await run(async () => {
      const result = await testTelegramChannel()
      if (disposed) return
      if (!result.success) { error.value = result.error; return }
      feedback.value = '测试通知已排队，请在 Telegram 中查看。'
    })
  }
  async function copy() {
    if (!binding.value || !waiting.value) return
    try { await navigator.clipboard.writeText(binding.value.url); feedback.value = '绑定链接已复制，请勿转发给他人。' }
    catch { error.value = '无法自动复制，请长按下方绑定链接复制。' }
  }
  function resume() {
    now.value = Date.now()
    if (document.visibilityState === 'visible' && !busy.value) void load()
  }
  onMounted(() => {
    void load()
    timer = window.setInterval(() => {
      now.value = Date.now()
      if (document.visibilityState !== 'visible' || busy.value || loading.value) return
      if (waiting.value && now.value - lastPoll >= 3000) { lastPoll = now.value; void load() }
    }, 1000)
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', resume)
  })
  onUnmounted(() => {
    disposed = true; generation++
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('focus', resume)
  })
  return { state, binding, loading, busy, error, feedback, waiting, remainingMinutes, load, begin, change, test, copy }
}
