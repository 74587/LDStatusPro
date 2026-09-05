/* global window, URL */
const scenario = new URL(window.location.href).searchParams.get('scenario') || 'unbound'
const state = { available: true, status: scenario === 'accepted' ? 'enabled' : scenario, telegramUsername: scenario === 'unbound' ? null : 'preview_seller', pendingExpiresAt: null,
  lastDelivery: scenario === 'accepted' ? { status: 'accepted', at: new Date().toISOString(), error: null } : null }
const ok = data => ({ success: true, data: { ...data } })
export async function fetchNotificationChannel() { return ok(state) }
export async function beginTelegramBinding() {
  state.pendingExpiresAt = new Date(Date.now() + 600000).toISOString()
  return ok({ url: 'https://t.me/example_notify_bot?start=preview_not_a_real_credential_000000000000000', expiresAt: state.pendingExpiresAt })
}
export async function changeTelegramChannel(action) { state.status = ({ pause: 'paused', enable: 'enabled', unbind: 'unbound' })[action]; state.pendingExpiresAt = null; return ok(state) }
export async function testTelegramChannel() { state.lastDelivery = { status: 'accepted', at: new Date().toISOString(), error: null }; return { success: true } }
