import { ref } from 'vue'
import { fetchAnnouncementsRequest } from '@/services/announcementService'

const ANNOUNCEMENT_CACHE_MS = 60_000

const items = ref([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')

let fetchPromise = null
let lastFetchedAt = 0

function normalizeItem(item = {}) {
  const now = Date.now()
  const startsAt = Number(item.startsAt || 0) || null
  const expiresAt = Number(item.expiresAt || 0) || null
  const enabled = item.enabled !== false
  const mode = ['banner', 'popup'].includes(item.mode) ? item.mode : 'banner'
  const contentType = ['text', 'markdown', 'html'].includes(item.contentType)
    ? item.contentType
    : 'text'
  const content = String(item.content || '').trim()
  const type = ['info', 'warning', 'success'].includes(item.type) ? item.type : 'info'
  const popupDismissKey = String(item.popupDismissKey || '').trim() || `popup-${Number(item.id || 0)}`
  const title = String(item.title || '').trim()

  return {
    id: Number(item.id || 0),
    title,
    content,
    type,
    mode,
    contentType,
    popupDismissKey,
    enabled,
    startsAt,
    expiresAt,
    isActive: enabled
      && !!content
      && (!startsAt || startsAt <= now)
      && (!expiresAt || expiresAt > now)
  }
}

function normalizeItems(list = []) {
  return Array.isArray(list)
    ? list.map(normalizeItem).filter((item) => item.isActive)
    : []
}

async function fetchAnnouncements(force = false) {
  const now = Date.now()
  if (!force && loaded.value && now - lastFetchedAt < ANNOUNCEMENT_CACHE_MS) {
    return items.value
  }
  if (fetchPromise) return fetchPromise

  loading.value = true
  error.value = ''
  fetchPromise = (async () => {
    const response = await fetchAnnouncementsRequest()
    if (!response?.success) {
      throw new Error(response?.error || '加载公告失败')
    }
    const nextItems = normalizeItems(response?.data?.items || [])
    items.value = nextItems
    loaded.value = true
    lastFetchedAt = Date.now()
    return nextItems
  })()

  try {
    return await fetchPromise
  } catch (err) {
    items.value = []
    error.value = err?.message || '加载公告失败'
    loaded.value = true
    lastFetchedAt = Date.now()
    return []
  } finally {
    loading.value = false
    fetchPromise = null
  }
}

export function useAnnouncement() {
  return {
    announcementItems: items,
    announcementLoading: loading,
    announcementLoaded: loaded,
    announcementError: error,
    fetchAnnouncements
  }
}
