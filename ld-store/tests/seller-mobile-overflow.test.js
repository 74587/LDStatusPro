import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function cssDeclarations(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  return match?.[1] ?? ''
}

describe('seller mobile horizontal overflow containment', () => {
  it('clips page-level overflow at the seller shell', () => {
    const source = readSource('../src/layouts/SellerLayout.vue')
    const shell = cssDeclarations(source, '.seller-shell')

    expect(shell).toMatch(/max-width:\s*100%/)
    expect(shell).toMatch(/min-width:\s*0/)
    expect(shell).toMatch(/overflow-x:\s*clip/)
  })

  it('keeps the recent transaction table scroll inside its card', () => {
    const source = readSource('../src/views/seller/SellerDashboard.vue')
    const cards = cssDeclarations(source, '.dashboard-card, .opening-checklist')
    const tableWrap = cssDeclarations(source, '.recent-table-wrap')

    expect(cards).toMatch(/min-width:\s*0/)
    expect(tableWrap).toMatch(/position:\s*relative/)
    expect(tableWrap).toMatch(/max-width:\s*100%/)
    expect(tableWrap).toMatch(/min-width:\s*0/)
    expect(tableWrap).toMatch(/overflow-x:\s*auto/)
  })

  it('resets both scroll axes on ordinary route navigation', () => {
    const source = readSource('../src/router/index.js')

    expect(source).toContain('return { left: 0, top: 0 }')
  })
})
