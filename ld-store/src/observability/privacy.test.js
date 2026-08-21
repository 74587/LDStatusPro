import { describe, expect, it } from 'vitest'
import { redactText, sanitizeError, sanitizeTelemetryItem, sanitizeUrl } from './privacy'

describe('frontend telemetry privacy filters', () => {
  it('removes query strings, fragments and business identifiers from URLs', () => {
    expect(sanitizeUrl('https://store.example/order/550e8400-e29b-41d4-a716-446655440000?token=secret#cdk'))
      .toBe('https://store.example/order/:id')
  })

  it('redacts credentials and personal identifiers from text', () => {
    const value = redactText('Bearer abc.def.ghi user@example.com token=top-secret')
    expect(value).not.toContain('abc.def.ghi')
    expect(value).not.toContain('user@example.com')
    expect(value).not.toContain('top-secret')
  })

  it('redacts sensitive fields recursively before transport', () => {
    const item = sanitizeTelemetryItem({
      meta: { page: { url: 'https://store.example/product/123456?code=oauth' } },
      payload: { authorization: 'Bearer secret', nested: { apiKey: 'secret' } }
    })
    expect(item.meta.page.url).toBe('https://store.example/product/:id')
    expect(item.payload.authorization).toBe('[REDACTED]')
    expect(item.payload.nested.apiKey).toBe('[REDACTED]')
  })

  it('sanitizes error messages and stacks', () => {
    const source = new Error('request failed for https://api.example.test/orders/123456?token=secret')
    const safe = sanitizeError(source)
    expect(safe.message).toContain('/orders/:id')
    expect(safe.message).not.toContain('secret')
    expect(safe.stack).not.toContain('?token=')
  })
})
