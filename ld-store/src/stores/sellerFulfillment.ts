import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { FulfillmentPolicy, SellerFulfillment } from '@/contracts/fulfillment'
import { useSessionScope } from '@/composables/useSessionScope'
import {
  acknowledgeFulfillment,
  fetchFulfillmentPolicy,
  fetchSellerFulfillment
} from '@/services/shop/fulfillmentService'

const REFRESH_TTL_MS = 15_000

export const useSellerFulfillmentStore = defineStore('seller-fulfillment', () => {
  const policy = ref<FulfillmentPolicy | null>(null)
  const status = ref<SellerFulfillment | null>(null)
  const loading = ref(false)
  const acknowledging = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const refreshedAt = ref(0)
  let pendingRequest: Promise<boolean> | null = null
  let requestId = 0
  const session = useSessionScope(reset)

  const versionsAligned = computed(() => Boolean(
    policy.value
    && status.value
    && (!policy.value.enabled || policy.value.version === status.value.policyVersion)
  ))
  const needsAcknowledgement = computed(() => Boolean(
    policy.value?.enabled
    && status.value?.enabled
    && (!versionsAligned.value || !status.value.accepted)
  ))

  async function refresh({ force = false } = {}) {
    if (!force && loaded.value && Date.now() - refreshedAt.value < REFRESH_TTL_MS) return true
    if (pendingRequest) return pendingRequest

    const currentRequestId = ++requestId
    loading.value = true
    error.value = ''
    pendingRequest = (async () => {
      const [rulesResult, statusResult] = await Promise.all([
        session.run(fetchFulfillmentPolicy),
        session.run(fetchSellerFulfillment)
      ])
      if (session.isStale(rulesResult) || session.isStale(statusResult)) return false
      if (!rulesResult.success) {
        error.value = rulesResult.error || '加载发货规则失败'
        return false
      }
      policy.value = rulesResult.data
      if (!statusResult.success) {
        error.value = statusResult.error || '加载履约记录失败'
        return false
      }

      status.value = statusResult.data
      loaded.value = true
      refreshedAt.value = Date.now()
      if (rulesResult.data.enabled && rulesResult.data.version !== statusResult.data.policyVersion) {
        error.value = '发货规则已更新，请重新加载后确认。'
        return false
      }
      return true
    })()

    try {
      return await pendingRequest
    } finally {
      if (currentRequestId === requestId) {
        pendingRequest = null
        loading.value = false
      }
    }
  }

  async function acknowledgeCurrent() {
    if (acknowledging.value) return false
    if (!loaded.value || !policy.value || !status.value) {
      if (!await refresh({ force: true })) return false
    }
    if (!policy.value?.enabled) return true
    if (!versionsAligned.value) {
      error.value = '发货规则已更新，请重新加载后确认。'
      return false
    }

    const currentRequestId = requestId
    acknowledging.value = true
    error.value = ''
    try {
      const result = await session.run(() => acknowledgeFulfillment(policy.value!.version))
      if (session.isStale(result) || currentRequestId !== requestId) return false
      if (!result.success) {
        if (result.errorCode === 'POLICY_VERSION_MISMATCH') {
          await refresh({ force: true })
          error.value = '发货规则已更新，请重新阅读并确认当前版本。'
        } else {
          error.value = result.error || '确认发货规则失败'
        }
        return false
      }
      status.value = result.data
      refreshedAt.value = Date.now()
      if (!result.data.accepted || result.data.policyVersion !== policy.value.version) {
        await refresh({ force: true })
        error.value = '确认状态尚未生效，请重新核对当前规则。'
        return false
      }
      return true
    } finally {
      acknowledging.value = false
    }
  }

  function reset() {
    requestId++
    policy.value = null
    status.value = null
    loading.value = false
    acknowledging.value = false
    loaded.value = false
    error.value = ''
    refreshedAt.value = 0
    pendingRequest = null
  }

  return {
    policy,
    status,
    loading,
    acknowledging,
    loaded,
    error,
    versionsAligned,
    needsAcknowledgement,
    refresh,
    acknowledgeCurrent,
    reset
  }
})
