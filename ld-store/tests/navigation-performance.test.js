import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MAINTENANCE_MODES } from '../src/config/maintenance'
import { useUiStore } from '../src/stores/ui'
import {
  resolveMaintenanceRedirect,
  startBackgroundMaintenanceRefresh
} from '../src/utils/maintenanceNavigation'

describe('路由维护状态判定', () => {
  it('根据已有状态同步决定是否重定向', () => {
    expect(resolveMaintenanceRedirect('SellerPublish', MAINTENANCE_MODES.FULL)).toEqual({
      name: 'Maintenance',
      replace: true
    })
    expect(resolveMaintenanceRedirect('Orders', MAINTENANCE_MODES.LDC_RESTRICTED)).toBeNull()
    expect(resolveMaintenanceRedirect('SellerPublish', MAINTENANCE_MODES.LDC_RESTRICTED)).toEqual({
      name: 'Home',
      replace: true
    })
    expect(resolveMaintenanceRedirect('Maintenance', MAINTENANCE_MODES.NORMAL)).toEqual({
      name: 'Home',
      replace: true
    })
  })

  it('后台刷新不会把未完成的网络 Promise 返回给导航守卫', async () => {
    let resolveRefresh
    const refreshPromise = new Promise(resolve => {
      resolveRefresh = resolve
    })
    const onLoaded = vi.fn()

    const result = startBackgroundMaintenanceRefresh(() => refreshPromise, onLoaded)

    expect(result).toBeUndefined()
    expect(onLoaded).not.toHaveBeenCalled()

    resolveRefresh()
    await refreshPromise
    await Promise.resolve()
    expect(onLoaded).toHaveBeenCalledOnce()
  })
})

describe('路由加载反馈', () => {
  it('并发导航结束前保持加载状态', () => {
    setActivePinia(createPinia())
    const uiStore = useUiStore()

    uiStore.startRouteLoading()
    uiStore.startRouteLoading()
    expect(uiStore.routeLoading).toBe(true)

    uiStore.finishRouteLoading()
    expect(uiStore.routeLoading).toBe(true)

    uiStore.finishRouteLoading()
    expect(uiStore.routeLoading).toBe(false)
  })
})
