const PARTY_FIELDS = {
  buyer: {
    username: ['buyer_username', 'buyerUsername'],
    nickname: ['buyer_nickname', 'buyerNickname', 'buyer_name', 'buyerName']
  },
  seller: {
    username: ['seller_username', 'sellerUsername'],
    nickname: ['seller_nickname', 'sellerNickname', 'seller_name', 'sellerName']
  },
  counterparty: {
    username: ['counterparty_username', 'counterpartyUsername'],
    nickname: ['counterparty_nickname', 'counterpartyNickname', 'counterparty_name', 'counterpartyName']
  }
}

function firstText(source, keys) {
  for (const key of keys) {
    const value = String(source?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function comparableUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLocaleLowerCase()
}

export function resolveOrderPartyIdentity(order, role) {
  const fields = PARTY_FIELDS[role] || PARTY_FIELDS.buyer
  const username = firstText(order, fields.username).replace(/^@+/, '')
  const rawNickname = firstText(order, fields.nickname)
  const nickname = rawNickname && comparableUsername(rawNickname) !== comparableUsername(username)
    ? rawNickname
    : ''

  return {
    nickname,
    username,
    profileUrl: username ? `https://linux.do/u/${encodeURIComponent(username)}` : ''
  }
}
