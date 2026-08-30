// Keep the human-facing nickname separate from the account handle.
export function buildUserIdentity({ name, username, trustLevel } = {}) {
  const clean = value => typeof value === 'string' ? value.trim() : ''
  const account = clean(username).replace(/^@+/, '')
  const level = trustLevel === null || trustLevel === undefined || trustLevel === ''
    ? null
    : Number(trustLevel)
  return {
    displayName: clean(name) || account || '用户',
    handle: account ? `@${account}` : '',
    trustLabel: Number.isInteger(level) && level >= 0 ? `TL${level}` : ''
  }
}
