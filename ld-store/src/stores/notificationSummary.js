import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/utils/api'
import { consumeSseStream } from '@/utils/sse'

const STREAM_PATH = '/api/shop/notifications/stream'
const FALLBACK_INTERVAL_MS = 60_000
const HIDDEN_DISCONNECT_MS = 60_000
const CONNECT_TIMEOUT_MS = 15_000
const STREAM_STALE_MS = 70_000
const STREAM_WATCHDOG_INTERVAL_MS = 15_000
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000]

function normalizeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0
}

export function normalizeNotificationSummary(data = {}) {
  return {
    totalUnread: normalizeCount(data.totalUnread),
    systemUnread: normalizeCount(data.systemUnread),
    buyChatUnread: normalizeCount(data.buyChatUnread),
    sellerPendingDeliveryCount: normalizeCount(data.sellerPendingDeliveryCount),
    sellerRefundPendingCount: normalizeCount(data.sellerRefundPendingCount),
    sessionsWithUnread: normalizeCount(data.sessionsWithUnread),
    totalSessions: normalizeCount(data.totalSessions),
    generatedAt: normalizeCount(data.generatedAt)
  }
}

export const useNotificationSummaryStore = defineStore('notification-summary', () => {
  const totalUnread = ref(0)
  const systemUnread = ref(0)
  const buyChatUnread = ref(0)
  const sellerPendingDeliveryCount = ref(0)
  const sellerRefundPendingCount = ref(0)
  const sessionsWithUnread = ref(0)
  const totalSessions = ref(0)
  const connectionState = ref('idle')
  const lastSuccessfulSyncAt = ref(0)
  const isRealtimeConnected = computed(() => connectionState.value === 'open')

  let activeRequest = null
  let latestRequestId = 0
  let streamController = null
  let streamGeneration = 0
  let reconnectAttempt = 0
  let reconnectTimer = null
  let fallbackTimer = null
  let hiddenTimer = null
  let connectTimer = null
  let streamWatchdogTimer = null
  let lastStreamActivityAt = 0
  let started = false
  let listenersAttached = false
  const eventSubscribers = new Set()

  function commitSummary(data, { trackSync = true } = {}) {
    const summary = normalizeNotificationSummary(data)
    totalUnread.value = summary.totalUnread
    systemUnread.value = summary.systemUnread
    buyChatUnread.value = summary.buyChatUnread
    sellerPendingDeliveryCount.value = summary.sellerPendingDeliveryCount
    sellerRefundPendingCount.value = summary.sellerRefundPendingCount
    sessionsWithUnread.value = summary.sessionsWithUnread
    totalSessions.value = summary.totalSessions
    if (trackSync) lastSuccessfulSyncAt.value = summary.generatedAt || Date.now()
  }

  function applyServerSummary(data) {
    latestRequestId += 1
    commitSummary(data)
  }

  function setSystemUnread(value) {
    latestRequestId += 1
    systemUnread.value = normalizeCount(value)
    totalUnread.value = systemUnread.value + buyChatUnread.value
  }

  function setBuyChatSummary(data = {}) {
    latestRequestId += 1
    buyChatUnread.value = normalizeCount(data.totalUnread ?? data.buyChatUnread)
    sessionsWithUnread.value = normalizeCount(data.sessionsWithUnread)
    if (data.totalSessions !== undefined) totalSessions.value = normalizeCount(data.totalSessions)
    totalUnread.value = systemUnread.value + buyChatUnread.value
  }

  function markSystemRead(count = 1) {
    latestRequestId += 1
    systemUnread.value = Math.max(0, systemUnread.value - normalizeCount(count))
    totalUnread.value = systemUnread.value + buyChatUnread.value
  }

  function markAllSystemRead() {
    latestRequestId += 1
    systemUnread.value = 0
    totalUnread.value = buyChatUnread.value
  }

  function markBuyChatRead(count = 0) {
    latestRequestId += 1
    buyChatUnread.value = Math.max(0, buyChatUnread.value - normalizeCount(count))
    if (count > 0) sessionsWithUnread.value = Math.max(0, sessionsWithUnread.value - 1)
    totalUnread.value = systemUnread.value + buyChatUnread.value
  }

  async function refresh({ force = false } = {}) {
    if (!force && activeRequest) return activeRequest
    const requestId = ++latestRequestId
    const request = api.get('/api/shop/messages/unread-summary')
      .then(result => {
        if (result?.success && requestId === latestRequestId) commitSummary(result.data)
        return result
      })
      .catch(() => null)
    activeRequest = request
    try {
      return await request
    } finally {
      if (activeRequest === request) activeRequest = null
    }
  }

  function emitDomainEvent(event) {
    for (const subscriber of [...eventSubscribers]) {
      try {
        subscriber(event)
      } catch {
        // 页面订阅者异常不得中断全局消息流。
      }
    }
  }

  function handleSseEvent(frame) {
    let data = {}
    try {
      data = frame.data ? JSON.parse(frame.data) : {}
    } catch {
      return
    }
    if (frame.event === 'summary.updated') {
      applyServerSummary(data)
      return
    }
    if (frame.event === 'ready') {
      reconnectAttempt = 0
      return
    }
    if (['system-message.changed', 'buy-message.created', 'seller-task.changed'].includes(frame.event)) {
      emitDomainEvent({ type: frame.event, data })
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function clearFallbackTimer() {
    if (fallbackTimer) window.clearInterval(fallbackTimer)
    fallbackTimer = null
  }

  function clearStreamTimers() {
    if (connectTimer) window.clearTimeout(connectTimer)
    if (streamWatchdogTimer) window.clearInterval(streamWatchdogTimer)
    connectTimer = null
    streamWatchdogTimer = null
    lastStreamActivityAt = 0
  }

  function startStreamWatchdog(controller) {
    clearStreamTimers()
    lastStreamActivityAt = Date.now()
    streamWatchdogTimer = window.setInterval(() => {
      if (streamController !== controller || controller.signal.aborted) return
      if (Date.now() - lastStreamActivityAt > STREAM_STALE_MS) controller.abort()
    }, STREAM_WATCHDOG_INTERVAL_MS)
  }

  function startFallbackPolling() {
    if (fallbackTimer || typeof window === 'undefined') return
    fallbackTimer = window.setInterval(() => {
      if (!started || connectionState.value === 'open' || document.visibilityState === 'hidden' || !navigator.onLine) return
      refresh({ force: true })
    }, FALLBACK_INTERVAL_MS)
  }

  function scheduleReconnect() {
    if (!started || typeof window === 'undefined' || document.visibilityState === 'hidden' || !navigator.onLine) return
    clearReconnectTimer()
    const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    reconnectAttempt += 1
    connectionState.value = 'retrying'
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connectStream()
    }, delay)
  }

  function abortStream(nextState = 'idle') {
    streamGeneration += 1
    clearStreamTimers()
    const controller = streamController
    streamController = null
    if (controller && !controller.signal.aborted) controller.abort()
    connectionState.value = nextState
  }

  async function connectStream() {
    if (!started || streamController || typeof window === 'undefined') return
    if (document.visibilityState === 'hidden' || !navigator.onLine) return

    clearReconnectTimer()
    const generation = ++streamGeneration
    const controller = new AbortController()
    streamController = controller
    connectionState.value = 'connecting'

    connectTimer = window.setTimeout(() => {
      if (streamController === controller && !controller.signal.aborted) controller.abort()
    }, CONNECT_TIMEOUT_MS)

    const result = await api.openEventStream(STREAM_PATH, { signal: controller.signal })
    if (connectTimer) window.clearTimeout(connectTimer)
    connectTimer = null
    if (generation !== streamGeneration) return
    if (controller.signal.aborted) {
      streamController = null
      if (started && document.visibilityState !== 'hidden' && navigator.onLine) {
        startFallbackPolling()
        void refresh({ force: true })
        scheduleReconnect()
      }
      return
    }
    if (!result?.success) {
      streamController = null
      if (result?.status === 401) {
        connectionState.value = 'idle'
        return
      }
      startFallbackPolling()
      void refresh({ force: true })
      scheduleReconnect()
      return
    }

    connectionState.value = 'open'
    clearFallbackTimer()
    startStreamWatchdog(controller)
    try {
      await consumeSseStream(result.response.body, {
        signal: controller.signal,
        onEvent: handleSseEvent,
        onActivity: () => { lastStreamActivityAt = Date.now() }
      })
    } catch {
      // 连接中断统一在 finally 中进入低频兜底与重连。
    } finally {
      clearStreamTimers()
      if (generation === streamGeneration) {
        streamController = null
        if (started && document.visibilityState !== 'hidden' && navigator.onLine) {
          startFallbackPolling()
          void refresh({ force: true })
          scheduleReconnect()
        }
      }
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (hiddenTimer) window.clearTimeout(hiddenTimer)
      hiddenTimer = window.setTimeout(() => {
        hiddenTimer = null
        if (document.visibilityState === 'hidden') abortStream('paused')
      }, HIDDEN_DISCONNECT_MS)
      return
    }
    if (hiddenTimer) window.clearTimeout(hiddenTimer)
    hiddenTimer = null
    void refresh({ force: true })
    connectStream()
  }

  function handleOnline() {
    void refresh({ force: true })
    connectStream()
  }

  function handleOffline() {
    abortStream('offline')
    startFallbackPolling()
  }

  function attachLifecycleListeners() {
    if (listenersAttached || typeof window === 'undefined') return
    listenersAttached = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  function detachLifecycleListeners() {
    if (!listenersAttached || typeof window === 'undefined') return
    listenersAttached = false
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  function startRealtime() {
    if (started || typeof window === 'undefined') return
    started = true
    attachLifecycleListeners()
    startFallbackPolling()
    void refresh({ force: true })
    connectStream()
  }

  function stopRealtime({ clear = true } = {}) {
    started = false
    clearReconnectTimer()
    clearFallbackTimer()
    if (hiddenTimer) window.clearTimeout(hiddenTimer)
    hiddenTimer = null
    detachLifecycleListeners()
    abortStream('idle')
    reconnectAttempt = 0
    if (clear) reset()
  }

  function subscribeEvents(handler) {
    if (typeof handler !== 'function') return () => {}
    eventSubscribers.add(handler)
    return () => eventSubscribers.delete(handler)
  }

  function reset() {
    latestRequestId += 1
    activeRequest = null
    commitSummary({}, { trackSync: false })
    lastSuccessfulSyncAt.value = 0
  }

  return {
    totalUnread,
    systemUnread,
    buyChatUnread,
    sellerPendingDeliveryCount,
    sellerRefundPendingCount,
    sessionsWithUnread,
    totalSessions,
    connectionState,
    isRealtimeConnected,
    lastSuccessfulSyncAt,
    refresh,
    reset,
    startRealtime,
    stopRealtime,
    subscribeEvents,
    setSystemUnread,
    setBuyChatSummary,
    markSystemRead,
    markAllSystemRead,
    markBuyChatRead
  }
})
