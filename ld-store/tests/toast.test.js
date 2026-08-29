import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  MAX_ACTIVE_TOASTS,
  TOAST_DURATIONS,
  useUiStore
} from '../src/stores/ui'

const toastSource = readFileSync(new URL('../src/components/common/Toast.vue', import.meta.url), 'utf8')

describe('Toast 状态与计时', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-29T00:00:00Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('按消息类型使用默认展示时长', () => {
    const uiStore = useUiStore()
    const successId = uiStore.showToast('保存成功', 'success')

    expect(uiStore.toasts[0]).toMatchObject({
      id: successId,
      duration: TOAST_DURATIONS.success
    })

    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(uiStore.toasts).toHaveLength(0)
  })

  it('加载态持续显示并可原位更新为结果态', () => {
    const uiStore = useUiStore()
    const id = uiStore.showToast('正在保存...', 'loading')

    vi.advanceTimersByTime(60_000)
    expect(uiStore.toasts).toHaveLength(1)

    expect(uiStore.updateToast(id, { type: 'success', message: '保存成功' })).toBe(id)
    expect(uiStore.toasts[0]).toMatchObject({
      id,
      type: 'success',
      message: '保存成功',
      duration: TOAST_DURATIONS.success
    })

    vi.advanceTimersByTime(TOAST_DURATIONS.success)
    expect(uiStore.toasts).toHaveLength(0)
  })

  it('目标已被容量策略移除时，更新会补发结果提醒', () => {
    const uiStore = useUiStore()
    const loadingId = uiStore.showToast('任务一', 'loading')
    uiStore.showToast('任务二', 'loading')
    uiStore.showToast('任务三', 'loading')
    uiStore.showToast('任务四', 'loading')

    expect(uiStore.toasts).toHaveLength(MAX_ACTIVE_TOASTS)
    expect(uiStore.toasts.some(toast => toast.id === loadingId)).toBe(false)

    const resultId = uiStore.updateToast(loadingId, { type: 'success', message: '任务一完成' })
    expect(resultId).not.toBe(loadingId)
    expect(uiStore.toasts.at(-1)).toMatchObject({ id: resultId, message: '任务一完成' })
  })

  it('合并相同提醒并从最近一次触发重新计时', () => {
    const uiStore = useUiStore()
    const firstId = uiStore.showToast('网络暂时不可用', 'error')

    vi.advanceTimersByTime(2000)
    const duplicateId = uiStore.showToast('网络暂时不可用', 'error')

    expect(duplicateId).toBe(firstId)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DURATIONS.error - 1)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(uiStore.toasts).toHaveLength(0)
  })

  it('超过容量时移除最早提醒并保留最新三条', () => {
    const uiStore = useUiStore()
    uiStore.showToast('第一条', 'info')
    uiStore.showToast('第二条', 'info')
    uiStore.showToast('第三条', 'info')
    uiStore.showToast('第四条', 'info')

    expect(uiStore.toasts.map(toast => toast.message)).toEqual(['第二条', '第三条', '第四条'])
  })

  it('暂停期间保留剩余时长，恢复后继续计时', () => {
    const uiStore = useUiStore()
    const id = uiStore.showToast('请阅读此提醒', 'info')

    vi.advanceTimersByTime(1500)
    uiStore.pauseToast(id)
    vi.advanceTimersByTime(10_000)
    expect(uiStore.toasts).toHaveLength(1)

    uiStore.resumeToast(id)
    vi.advanceTimersByTime(TOAST_DURATIONS.info - 1501)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(uiStore.toasts).toHaveLength(0)
  })

  it('主动清空时同步取消全部计时器', () => {
    const uiStore = useUiStore()
    uiStore.showToast('消息一', 'info')
    uiStore.showToast('消息二', 'warning')

    expect(vi.getTimerCount()).toBe(2)
    uiStore.clearToasts()
    expect(uiStore.toasts).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Toast 组件语义与视觉约束', () => {
  it('使用统一 Lucide 状态图标且不再使用 emoji 图标', () => {
    expect(toastSource).toContain('CircleCheck')
    expect(toastSource).toContain('CircleX')
    expect(toastSource).toContain('TriangleAlert')
    expect(toastSource).toContain('LoaderCircle')
    for (const emoji of ['✅', '❌', '⚠️', 'ℹ️']) {
      expect(toastSource).not.toContain(emoji)
    }
  })

  it('提供状态播报、忙碌语义和显式关闭按钮', () => {
    expect(toastSource).toContain("toast.type === 'error' ? 'alert' : 'status'")
    expect(toastSource).toContain(':aria-busy=')
    expect(toastSource).toContain('aria-label="关闭提醒"')
    expect(toastSource).toContain('aria-hidden="true"')
  })

  it('包含导航偏移、安全区、移动端触控尺寸和减弱动效规则', () => {
    expect(toastSource).toContain('toast-container--below-header')
    expect(toastSource).toContain('env(safe-area-inset-top')
    expect(toastSource).toMatch(/\.toast-close\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s)
    expect(toastSource).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
