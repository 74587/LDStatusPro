import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/views/Publish.vue', import.meta.url), 'utf8')

function cssDeclarations(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  return match?.[1] ?? ''
}

describe('publish test mode confirmation modal', () => {
  it('uses a real icon instead of forcing the label into the icon box', () => {
    expect(source).toContain('<FlaskConical :size="28" />')
    expect(cssDeclarations('.test-icon')).not.toMatch(/font-size:\s*32px/)
  })

  it('keeps long tips readable and contained on narrow screens', () => {
    expect(source).toContain('<ul class="test-mode-tips">')
    expect(cssDeclarations('.tip-item')).toMatch(/grid-template-columns:\s*16px minmax\(0, 1fr\)/)
    expect(cssDeclarations('.tip-item')).toMatch(/overflow-wrap:\s*anywhere/)
    expect(cssDeclarations('.test-mode-modal')).toMatch(/max-height:\s*calc\(100dvh - 40px\)/)
    expect(cssDeclarations('.test-mode-modal')).toMatch(/overflow-y:\s*auto/)
  })

  it('exposes the confirmation copy as an accessible dialog', () => {
    expect(source).toContain('role="dialog"')
    expect(source).toContain('aria-labelledby="test-mode-modal-title"')
    expect(source).toContain('aria-describedby="test-mode-modal-description"')
  })
})
