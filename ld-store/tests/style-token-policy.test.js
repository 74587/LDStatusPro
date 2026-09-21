import { describe, expect, it } from 'vitest'
import { CONTRACT_LAYOUT_FILES, validateStylePolicy } from '../scripts/check-style-tokens.mjs'

describe('semantic style token policy', () => {
  it('keeps component styles free of raw colors, broad transitions, and off-contract layout queries', () => {
    const result = validateStylePolicy()

    expect(result.files).toBeGreaterThan(70)
    expect(CONTRACT_LAYOUT_FILES).toContain('src/styles/tokens.css')
    expect(CONTRACT_LAYOUT_FILES).toContain('src/views/OrderConfirm.vue')
    expect(result.violations).toEqual([])
  })
})
