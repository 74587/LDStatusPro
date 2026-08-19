export function buildUserDropdownMenuGroups({ messageUnread = 0, sellerPendingDeliveryCount = 0 } = {}) {
  const unread = Number(messageUnread || 0)
  const pending = Number(sellerPendingDeliveryCount || 0)
  const badge = value => value > 99 ? '99+' : String(value || '')
  const item = (path, icon, label, count = 0) => ({
    path,
    icon,
    label,
    withUnread: count > 0,
    badge: count > 0 ? badge(count) : ''
  })

  return [
    [
      item('/user/messages', '💬', '我的消息', unread),
      item('/user/favorites', '⭐', '收藏与拉黑')
    ],
    [
      item('/user/orders', '📋', '我的订单'),
      item('/user/coupons', '🎫', '我的优惠券'),
      item('/user/reports', '🚩', '我的举报'),
      item('/user/buy-requests', '🌱', '我的求购')
    ],
    [item('/ld-image', '🖼️', '士多图床')],
    [item('/seller', '🏪', '卖家后台', pending)]
  ]
}
