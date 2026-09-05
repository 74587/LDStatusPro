import { boolean, nullable, object, picklist, string, literal, type InferOutput } from 'valibot'
import { api } from '@/utils/api'
import { validateServiceResult, withServiceFailure } from '@/services/serviceContract'

export const NotificationChannelSchema = object({
  available: boolean(),
  status: picklist(['unbound', 'enabled', 'paused', 'unavailable']),
  telegramUsername: nullable(string()),
  pendingExpiresAt: nullable(string()),
  lastDelivery: nullable(object({ status: picklist(['pending', 'sending', 'accepted', 'failed', 'unknown', 'skipped']), error: nullable(string()), at: string() }))
})
export type NotificationChannelState = InferOutput<typeof NotificationChannelSchema>
const BindingSchema = object({ url: string(), expiresAt: string() })
const endpoint = '/api/shop/merchant/notification-channels'
export function fetchNotificationChannel() {
  return withServiceFailure(async () => validateServiceResult(await api.get(endpoint), NotificationChannelSchema, endpoint, 'NotificationChannel'), '加载通知设置失败')
}
export function beginTelegramBinding() {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/bind`), BindingSchema, endpoint, 'TelegramBinding'), '生成绑定链接失败')
}
export function changeTelegramChannel(action: 'enable' | 'pause' | 'unbind') {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/state`, { action }), NotificationChannelSchema, endpoint, 'NotificationChannel'), '更新通知设置失败')
}
export function testTelegramChannel() {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/test`), object({ success: literal(true) }), endpoint, 'TelegramTest'), '发送测试通知失败')
}
