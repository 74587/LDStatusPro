import { computed, ref } from 'vue'
import { fetchAnnouncementsRequest } from '@/services/announcementService'

const items = ref([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const now = ref(Date.now())
let serverOffset = 0
let fetchPromise = null
let lastFetchedAt = 0
let interval = null
let subscribers = 0

function normalizeItem(item) {
  return { ...item, id: Number(item.id), enabled: item.enabled !== false,
    title: String(item.title || ''), content: String(item.content || ''),
    mode: item.mode || 'banner', type: item.type || 'info', contentType: item.contentType || 'text',
    startsAt: Number(item.startsAt) || null, expiresAt: Number(item.expiresAt) || null,
    popupDismissKey: item.popupDismissKey || `popup-${item.id}` }
}
const activeItems = computed(() => items.value.filter(item => item.enabled && item.content
  && (!item.startsAt || item.startsAt <= now.value) && (!item.expiresAt || item.expiresAt > now.value)))

async function fetchAnnouncements(force = false) {
  if (!force && loaded.value && Date.now() - lastFetchedAt < 30_000) return activeItems.value
  if (fetchPromise) return fetchPromise
  loading.value = true
  fetchPromise = (async () => {
    try {
      const response = await fetchAnnouncementsRequest()
      if (!response?.success || !Array.isArray(response.data?.items)) throw new Error(response?.error?.message || '加载公告失败')
      serverOffset = response.data.timestamp - Date.now()
      now.value = Date.now() + serverOffset
      items.value = response.data.items.map(normalizeItem)
      lastFetchedAt = Date.now()
      error.value = ''
    } catch (err) {
      error.value = err.message || '加载公告失败'
    } finally {
      loaded.value = true
      loading.value = false
      fetchPromise = null
    }
    return activeItems.value
  })()
  return fetchPromise
}
function tick() {
  now.value = Date.now() + serverOffset
  if (document.visibilityState === 'hidden') return
  if (Date.now() - lastFetchedAt >= 30_000) {
    // Back off failed requests too; an unavailable API must not be retried every second.
    lastFetchedAt = Date.now()
    void fetchAnnouncements(true)
  }
}
function resume() {
  if (document.visibilityState !== 'hidden') {
    now.value = Date.now() + serverOffset
    void fetchAnnouncements(true)
  }
}
function startAnnouncements() {
  if (++subscribers !== 1) return
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('online', resume)
  interval = setInterval(tick, 1000)
  void fetchAnnouncements()
}
function stopAnnouncements() {
  subscribers = Math.max(0, subscribers - 1)
  if (subscribers) return
  clearInterval(interval)
  interval = null
  document.removeEventListener('visibilitychange', resume)
  window.removeEventListener('online', resume)
}
export function useAnnouncement() {
  return { announcementItems: activeItems, announcementLoading: loading,
    announcementLoaded: loaded, announcementError: error, fetchAnnouncements,
    startAnnouncements, stopAnnouncements }
}
