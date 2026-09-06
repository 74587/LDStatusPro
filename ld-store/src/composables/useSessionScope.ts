import { watch } from 'vue'
import { useUserStore } from '@/stores/user'
import type { ApiFailure, ApiResult } from '@/utils/api'

/** Store-owned lifetime: clear synchronously and discard responses from an old session. */
export function useSessionScope(reset: () => void) {
  const user = useUserStore()
  let generation = 0
  watch(() => user.sessionKey, () => { generation++; reset() }, { flush: 'sync' })
  function stale(): ApiFailure {
    return { success: false, status: 0, error: '', errorCode: 'SESSION_CHANGED', kind: 'abort', aborted: true, abortReason: 'caller' }
  }
  async function run<T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    const started = generation
    try {
      const result = await operation()
      return started === generation ? result : stale()
    } catch (error) {
      if (started !== generation) return stale()
      throw error
    }
  }
  function isStale(result: ApiResult<unknown>) {
    return !result.success && result.errorCode === 'SESSION_CHANGED'
  }
  return { run, isStale }
}
