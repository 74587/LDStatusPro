import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/views/MyBuyChats.vue', import.meta.url), 'utf8')

function cssDeclarations(cssSource, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = cssSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  return match?.[1] || ''
}

describe('消息页移动端布局', () => {
  it('消息状态与时间组成不可拆分的紧凑元信息组', () => {
    const statusPill = cssDeclarations(source, '.status-pill')
    const systemTime = cssDeclarations(source, '.system-time')
    const headingMeta = cssDeclarations(source, '.system-heading-meta')

    expect(statusPill).toMatch(/flex:\s*0 0 auto/)
    expect(statusPill).toMatch(/white-space:\s*nowrap/)
    expect(systemTime).toMatch(/flex:\s*0 0 auto/)
    expect(systemTime).toMatch(/white-space:\s*nowrap/)
    expect(headingMeta).toMatch(/display:\s*flex/)
    expect(headingMeta).toMatch(/flex:\s*0 0 auto/)
  })

  it('手机端显示精简相对时间并保留完整时间语义', () => {
    const mobileSource = source.slice(source.indexOf('@media (max-width: 640px)'))
    const exactTime = cssDeclarations(mobileSource, '.system-time-exact')

    expect(source).toContain('class="system-time-relative">{{ formatRelativeTime(item.createdAt) }}')
    expect(source).toContain(':aria-label="formatMessageTime(item.createdAt)"')
    expect(exactTime).toMatch(/display:\s*none/)
  })

  it('手机端底部将消息类型与操作按钮固定在同一行两端', () => {
    const mobileSource = source.slice(source.indexOf('@media (max-width: 640px)'))
    const systemBottom = cssDeclarations(mobileSource, '.system-bottom')
    const systemMeta = cssDeclarations(mobileSource, '.system-meta')
    const systemActions = cssDeclarations(mobileSource, '.system-actions')

    expect(systemBottom).toMatch(/flex-direction:\s*row/)
    expect(systemBottom).toMatch(/align-items:\s*center/)
    expect(systemMeta).toMatch(/white-space:\s*nowrap/)
    expect(systemActions).toMatch(/margin-left:\s*auto/)
    expect(systemActions).toMatch(/flex:\s*0 0 auto/)
  })

  it('极窄屏幕允许筛选工具栏换行', () => {
    const narrowSource = source.slice(source.indexOf('@media (max-width: 360px)'))
    const toolbar = cssDeclarations(narrowSource, '.toolbar')
    const toolbarSearch = cssDeclarations(narrowSource, '.toolbar-search')

    expect(toolbar).toMatch(/flex-wrap:\s*wrap/)
    expect(toolbarSearch).toMatch(/flex:\s*1 0 100%/)
  })
})
