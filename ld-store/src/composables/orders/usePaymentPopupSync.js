import { onScopeDispose, ref } from 'vue'
import { hasOpenPaymentPopup, subscribePaymentPopup } from '@/utils/paymentReturn'

const POLL_MS = 3000

export function usePaymentPopupSync({ orderNo, canQueryPayment, reload, refreshPayment }) {
  const paymentPopupOpen = ref(false)
  let stopSubscribe = () => {}
  let pollTimer = null
  let running = false
  let queued = false

  async function syncFromPaymentWindow() {
    if (running) {
      queued = true
      return
    }
    running = true
    try {
      do {
        queued = false
        if (canQueryPayment()) await refreshPayment()
        else await reload()
        paymentPopupOpen.value = hasOpenPaymentPopup(orderNo())
      } while (queued)
    } finally {
      running = false
    }
  }

  function pollOpenPaymentPopup() {
    const open = hasOpenPaymentPopup(orderNo())
    paymentPopupOpen.value = open
    if (!open) {
      clearPoll()
      return
    }
    if (canQueryPayment()) void reload()
  }

  function start() {
    stop()
    const id = orderNo()
    paymentPopupOpen.value = hasOpenPaymentPopup(id)
    if (!id) return
    stopSubscribe = subscribePaymentPopup(id, () => {
      void syncFromPaymentWindow()
    })
    if (paymentPopupOpen.value) pollTimer = setInterval(pollOpenPaymentPopup, POLL_MS)
  }

  function clearPoll() {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  function stop() {
    stopSubscribe()
    stopSubscribe = () => {}
    clearPoll()
    paymentPopupOpen.value = false
  }

  onScopeDispose(stop)

  return { paymentPopupOpen, start, stop }
}
