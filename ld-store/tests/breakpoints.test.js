import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTRACT_LAYOUT_FILES } from '../scripts/check-style-tokens.mjs'
import { BP, catalogColumns, isMobileNav } from '../src/config/breakpoints.js'

const tokens = readFileSync(resolve(import.meta.dirname, '../src/styles/tokens.css'), 'utf8')
const footer = readFileSync(resolve(import.meta.dirname, '../src/components/layout/AppFooter.vue'), 'utf8')

describe('storefront breakpoint contract', () => {
  it('keeps catalog columns aligned with 768 / 1024', () => {
    expect(catalogColumns(375)).toBe(2)
    expect(catalogColumns(BP.lg - 1)).toBe(2)
    expect(catalogColumns(BP.lg)).toBe(3)
    expect(catalogColumns(BP.xl - 1)).toBe(3)
    expect(catalogColumns(BP.xl)).toBe(4)
    expect(catalogColumns(BP.xxl)).toBe(4)
  })

  it('treats widths below 768 as mobile navigation', () => {
    expect(isMobileNav(BP.lg - 1)).toBe(true)
    expect(isMobileNav(BP.lg)).toBe(false)
  })

  it('documents the same pixel values in density tokens', () => {
    expect(tokens).toContain(`--bp-lg: ${BP.lg}px`)
    expect(tokens).toContain(`--bp-xl: ${BP.xl}px`)
    expect(tokens).toContain(`--bp-2xl: ${BP.xxl}px`)
    expect(tokens).toContain(`(min-width: ${BP.lg}px)`)
    expect(tokens).toContain(`(min-width: ${BP.xxl}px)`)
    expect(tokens).toContain(`(max-height: ${BP.shortHeight}px)`)
    expect(tokens).toContain('--ui-density: compact')
    expect(tokens).toContain('--ui-density: standard')
  })

  it('hides the storefront footer below 768, not at 768', () => {
    expect(footer).toContain(`max-width: ${BP.lg - 1}px`)
    expect(footer).not.toContain('max-width: 768px')
  })

  it('keeps the layout contract file list on disk', () => {
    expect(CONTRACT_LAYOUT_FILES.length).toBeGreaterThan(20)
    for (const file of CONTRACT_LAYOUT_FILES) {
      expect(readFileSync(resolve(import.meta.dirname, `../${file}`), 'utf8').length).toBeGreaterThan(0)
    }
  })
})
