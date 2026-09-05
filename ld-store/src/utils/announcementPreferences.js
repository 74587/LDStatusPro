import { ref } from 'vue'
export const announcementPreferenceRevision = ref(0)
const memory = new Map()
export function announcementIdentity(store) {
  const user = store.currentUser
  return store.isLoggedIn && user ? `${user.site || 'linux.do'}:${user.userId || user.id}` : 'guest'
}
function read(storage, key) {
  try { return JSON.parse(storage.getItem(key) || 'null') } catch { return memory.get(key) || null }
}
function write(storage, key, value) {
  memory.set(key, value)
  try { storage.setItem(key, JSON.stringify(value)) } catch { /* The in-memory record still suppresses this visit. */ }
  announcementPreferenceRevision.value++
}
export function preferenceKey(identity, item) { return `ld-announcement:${identity}:${item.id}:${item.reminderVersion || 1}` }
export function sessionHasPopup(identity) { return Boolean(read(sessionStorage, `ld-announcement-session:${identity}`)) }
export function markPopupShown(identity) { write(sessionStorage, `ld-announcement-session:${identity}`, true) }
export function isAnnouncementDismissed(identity, item) {
  const record = read(localStorage, preferenceKey(identity, item))
  if (record?.forever || record?.dismissedUntil > Date.now()) return true
  // Old unscoped records remain device-only; never upload them as account state.
  if ((item.reminderVersion || 1) === 1) {
    try {
      const raw = localStorage.getItem(`ld-shop-popup-read:${item.popupDismissKey || `popup-${item.id}`}`)
      if (raw === 'permanent' || /^\d+$/.test(raw || '')) return true
      const old = raw && JSON.parse(raw)
      if (old?.mode === 'forever' || old?.expiresAt > Date.now()) return true
    } catch { /* Malformed legacy records are ignored. */ }
  }
  return false
}
export function dismissAnnouncement(identity, item, mode) {
  if (mode === 'session') return
  const now = Date.now()
  const end = Math.floor((now + 8 * 3600000) / 86400000) * 86400000 + 86400000 - 8 * 3600000
  write(localStorage, preferenceKey(identity, item), { forever: mode === 'forever', dismissedUntil: mode === 'today' ? end : null })
}
