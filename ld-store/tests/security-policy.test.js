import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(new globalThis.URL('../index.html', import.meta.url), 'utf8')
const headers = readFileSync(new globalThis.URL('../public/_headers', import.meta.url), 'utf8')
const themeBootstrap = readFileSync(new globalThis.URL('../public/theme-bootstrap.js', import.meta.url), 'utf8')

describe('storefront script policy', () => {
  it('keeps executable scripts in same-origin or explicit external files', () => {
    const scriptTags = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    expect(scriptTags.length).toBeGreaterThan(0)
    expect(scriptTags.every(([, attributes, body]) => attributes.includes('src=') && body.trim() === '')).toBe(true)
    expect(indexHtml).not.toMatch(/\son[a-z]+\s*=/i)
    expect(indexHtml).toContain('src="/theme-bootstrap.js"')
  })

  it('does not permit inline scripts or eval in CSP', () => {
    const csp = headers.split('\n').find(line => line.includes('Content-Security-Policy:')) || ''
    const scriptDirective = csp.match(/script-src\s+([^;]+)/)?.[1] || ''
    expect(scriptDirective).not.toContain("'unsafe-inline'")
    expect(scriptDirective).not.toContain("'unsafe-eval'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('keeps the first-paint theme bootstrap self-contained and eval-free', () => {
    expect(themeBootstrap).toContain("localStorage.getItem('ld-store-theme')")
    expect(themeBootstrap).toContain("prefers-color-scheme: dark")
    expect(themeBootstrap).not.toMatch(/\beval\s*\(/)
    expect(themeBootstrap).not.toMatch(/new\s+Function\b/)
  })
})
