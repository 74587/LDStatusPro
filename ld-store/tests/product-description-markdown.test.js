import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../src/utils/sanitizeHtml', () => ({
  sanitizeHtml: vi.fn((value) => value)
}))

let renderProductDescription
let sanitizeHtml

beforeAll(async () => {
  ;({ renderProductDescription } = await import('../src/utils/renderProductDescription'))
  ;({ sanitizeHtml } = await import('../src/utils/sanitizeHtml'))
})

describe('物品描述 Markdown 图片', () => {
  it('把带说明文字的图片语法渲染为新窗口链接', () => {
    const html = renderProductDescription('![物品实拍](https://img.example.com/product.png "查看原图")')

    expect(html).not.toContain('<img')
    expect(html).toContain('class="markdown-image-link"')
    expect(html).toContain('href="https://img.example.com/product.png"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
    expect(html).toContain('title="查看原图"')
    expect(html).toContain('>物品实拍</a>')
  })

  it('图片没有说明文字时直接显示图片地址', () => {
    const html = renderProductDescription('![](https://img.example.com/product.png)')

    expect(html).toContain('>https://img.example.com/product.png</a>')
  })

  it('保留普通链接，并要求净化器禁用原始 HTML 图片', () => {
    const html = renderProductDescription('[查看说明](https://example.com/docs) <img src="https://img.example.com/raw.png">')

    expect(html).toContain('href="https://example.com/docs"')
    expect(sanitizeHtml).toHaveBeenLastCalledWith(expect.any(String), { FORBID_TAGS: ['img'] })
  })
})
