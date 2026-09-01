import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse, compileTemplate } from '@vue/compiler-sfc'

const homeSource = readFileSync(new globalThis.URL('../src/views/Home.vue', import.meta.url), 'utf8')
const indexHtml = readFileSync(new globalThis.URL('../index.html', import.meta.url), 'utf8')
const { descriptor } = parse(homeSource)

describe('home marketplace accessibility', () => {
  it('keeps the Home template compilable', () => {
    expect(compileTemplate({
      source: descriptor.template.content,
      filename: 'Home.vue',
      id: 'home-accessibility'
    }).errors).toEqual([])
  })

  it('allows browser zoom and labels both price inputs', () => {
    const viewport = indexHtml.match(/<meta name="viewport" content="([^"]+)">/)?.[1] || ''
    expect(viewport).not.toContain('user-scalable=no')
    expect(viewport).not.toContain('maximum-scale')
    expect(homeSource).toContain('for="home-price-min"')
    expect(homeSource).toContain('for="home-price-max"')
  })

  it('uses native and stateful controls for stock and sort filters', () => {
    expect(homeSource).toContain('type="checkbox"')
    expect(homeSource).toContain(':checked="inStockOnly"')
    expect(homeSource).toContain(':aria-pressed="currentSort === tab.value"')
    expect(homeSource).not.toContain('class="stock-filter" @click')
  })

  it('uses a semantic link for each buy request card', () => {
    expect(homeSource).toContain(':to="`/buy-request/${item.id}`"')
    expect(homeSource).toContain(':aria-label="`查看求购：${item.title}`"')
    expect(homeSource).not.toContain('@click="goBuyRequestDetail(item.id)"')
  })

  it('retains mobile touch targets and visible keyboard focus', () => {
    expect(homeSource).toContain('min-height: 44px;')
    expect(homeSource).toContain('.buy-card-link:focus-visible')
    expect(homeSource).toContain('.stock-filter-input:focus-visible + .checkbox')
  })
})
