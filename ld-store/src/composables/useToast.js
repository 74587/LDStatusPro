import { useUiStore } from '@/stores/ui'

/**
 * Toast 消息提示组合式函数
 */
export function useToast() {
  const uiStore = useUiStore()

  // 显示普通消息
  function show(message, duration = 4000) {
    return uiStore.showToast(message, 'info', duration)
  }

  function info(message, duration = 4000) {
    return show(message, duration)
  }

  // 显示成功消息
  function success(message, duration = 3000) {
    return uiStore.showToast(message, 'success', duration)
  }

  // 显示错误消息
  function error(message, duration = 5000) {
    return uiStore.showToast(message, 'error', duration)
  }

  // 显示警告消息
  function warning(message, duration = 5000) {
    return uiStore.showToast(message, 'warning', duration)
  }

  // 显示加载消息（不自动关闭）
  function loading(message = '加载中...') {
    return uiStore.showToast(message, 'loading', 0)
  }

  // 关闭指定的 toast
  function close(id) {
    uiStore.removeToast(id)
  }

  // 原位更新指定 Toast；目标已被移除时会创建新的结果提醒
  function update(id, options) {
    return uiStore.updateToast(id, options)
  }

  return {
    show,
    info,
    success,
    error,
    warning,
    loading,
    update,
    close
  }
}
