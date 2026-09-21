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
    expect(shell).toMatch(/overflow-y:\s*hidden/)
    expect(shell).toMatch(/height:\s*100dvh/)
  })

  it('keeps seller workspace scrolling stable so page switches do not shift the topbar', () => {
    const source = readSource('../src/layouts/SellerLayout.vue')
    const workspace = cssDeclarations(source, '.seller-workspace')

    expect(workspace).toMatch(/min-height:\s*0/)
    expect(workspace).toMatch(/overflow-y:\s*auto/)
    expect(workspace).toMatch(/scrollbar-gutter:\s*stable/)
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

  it('keeps long publish form values inside the mobile grid track', () => {
    const source = readSource('../src/styles/seller.css')
    const formGrid = cssDeclarations(source, '.seller-shell .seller-product-form,\n.seller-shell .seller-edit-form')
    const formCards = cssDeclarations(source, '.seller-shell .seller-product-form > .form-card,\n.seller-shell .seller-edit-form > .form-card')
    const formInputs = cssDeclarations(
      source,
      '.seller-shell .seller-product-form .form-input,\n.seller-shell .seller-product-form .form-textarea,\n.seller-shell .seller-edit-form .form-input,\n.seller-shell .seller-edit-form .form-textarea'
    )

    expect(formGrid).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/)
    expect(formGrid).toMatch(/max-width:\s*100%/)
    expect(formGrid).toMatch(/min-width:\s*0/)
    expect(formCards).toMatch(/max-width:\s*100%/)
    expect(formCards).toMatch(/min-width:\s*0/)
    expect(formInputs).toMatch(/max-width:\s*100%/)
    expect(formInputs).toMatch(/min-width:\s*0/)
  })

  it('resets both scroll axes on ordinary route navigation', () => {
    const source = readSource('../src/router/index.js')

    expect(source).toContain("to.meta?.layout === 'seller'")
    expect(source).toContain('return { left: 0, top: 0 }')
  })
})
