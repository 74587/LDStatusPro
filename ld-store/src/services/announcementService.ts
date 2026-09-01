import { api } from '@/utils/api'
import { AnnouncementResponseSchema } from '@/contracts/commerce'
import { validateServiceResult, withServiceFailure } from '@/services/serviceContract'

export async function fetchAnnouncementsRequest(signal?: AbortSignal) {
  return withServiceFailure(async () => validateServiceResult(
    await api.get('/api/shop/announcements', { signal }),
    AnnouncementResponseSchema,
    '/api/shop/announcements',
    'AnnouncementResponse'
  ), '加载公告失败')
}
