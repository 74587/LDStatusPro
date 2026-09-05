// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { dismissAnnouncement, isAnnouncementDismissed, markPopupShown, sessionHasPopup } from './announcementPreferences'
beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
it('separates accounts and reminder versions, and caps one popup per tab', () => {
  const item = { id: 7, reminderVersion: 1 }
  dismissAnnouncement('a', item, 'forever')
  expect(isAnnouncementDismissed('a', item)).toBe(true)
  expect(isAnnouncementDismissed('b', item)).toBe(false)
  expect(isAnnouncementDismissed('a', { ...item, reminderVersion: 2 })).toBe(false)
  markPopupShown('a')
  expect(sessionHasPopup('a')).toBe(true)
  expect(sessionHasPopup('b')).toBe(false)
})
