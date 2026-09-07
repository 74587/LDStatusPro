import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSellerFulfillmentStore } from '@/stores/sellerFulfillment'

/** A confirmation belongs to one mounted publishing flow, account and policy version. */
export function useFulfillmentReminder(getOwner: () => string) {
  const fulfillmentStore = useSellerFulfillmentStore()
  const { policy, status: state, loading, acknowledging: busy } = storeToRefs(fulfillmentStore)
  const open = ref(false)
  const error = ref('')
  const confirmedVersion = ref('')
  const pending = ref(false)
  const confirmationCount = ref(0)
  let generation = 0
  let completion: Promise<boolean> | null = null
  let resolveCompletion: ((accepted: boolean) => void) | null = null
  let forceReminder = false

  function finish(accepted: boolean) {
    generation++
    open.value = false
    pending.value = false
    const resolve = resolveCompletion
    resolveCompletion = null
    completion = null
    resolve?.(accepted)
  }

  function reset() {
    finish(false)
    confirmedVersion.value = ''
    error.value = ''
  }

  async function load() {
    const current = ++generation
    error.value = ''
    const loaded = await fulfillmentStore.refresh({ force: true })
    if (current !== generation) return
    if (policy.value && !policy.value.enabled) {
      confirmedVersion.value = ''
      finish(true)
      return
    }
    if (!loaded || !policy.value || !state.value) {
      error.value = fulfillmentStore.error || '发货规则暂时无法加载'
      open.value = true
      return
    }
    if (state.value.policyVersion !== policy.value.version || !state.value.enabled) {
      error.value = '发货规则已更新，请重新加载后确认。'
      open.value = true
      return
    }
    if (!forceReminder && confirmedVersion.value === policy.value.version && state.value.accepted && !state.value.activeRestriction) {
      finish(true)
      return
    }
    open.value = true
  }

  function request(options: { refresh?: boolean; force?: boolean } = {}): Promise<boolean> {
    if (completion) return completion
    if (confirmedVersion.value && !options.refresh && !options.force) return Promise.resolve(true)
    forceReminder = !!options.force
    pending.value = true
    open.value = !confirmedVersion.value || forceReminder
    completion = new Promise(resolve => { resolveCompletion = resolve })
    const result = completion
    void load()
    return result
  }

  async function confirm() {
    if (loading.value || busy.value || error.value || !state.value || !policy.value || state.value.activeRestriction) return
    if (!state.value.accepted) {
      const current = generation
      const accepted = await fulfillmentStore.acknowledgeCurrent()
      if (current !== generation) return
      if (!accepted) {
        error.value = fulfillmentStore.error || '确认发货规则失败'
        return
      }
      if (!state.value?.accepted || state.value.policyVersion !== policy.value.version) {
        await load()
        return
      }
      if (state.value.activeRestriction) return
    }
    confirmedVersion.value = policy.value.version
    confirmationCount.value++
    finish(true)
  }

  watch(getOwner, reset, { flush: 'sync' })
  onBeforeUnmount(reset)
  return {
    pending,
    confirmationCount,
    request,
    confirm,
    cancel: () => finish(false),
    retry: () => { if (!loading.value && !busy.value) void load() },
    reset,
    dialogProps: computed(() => ({ open: open.value, loading: loading.value, busy: busy.value, error: error.value, state: state.value, policy: policy.value }))
  }
}
