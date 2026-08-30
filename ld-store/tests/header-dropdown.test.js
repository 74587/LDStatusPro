import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { useDropdownMenu } from '../src/composables/useDropdownMenu'

function createMenu() {
  const menu = useDropdownMenu()
  const items = Array.from({ length: 4 }, () => ({ focus: vi.fn() }))
  const trigger = { focus: vi.fn() }
  menu.triggerRef.value = trigger
  menu.menuRef.value = { querySelectorAll: () => items }
  menu.rootRef.value = { contains: node => node === trigger || items.includes(node) }
  const key = (value, target = trigger) => ({
    key: value, target, preventDefault: vi.fn(), stopPropagation: vi.fn()
  })
  return { menu, items, trigger, key }
}

describe('个人导航菜单交互', () => {
  it('快速切换始终以最后一次操作为准', () => {
    const { menu } = createMenu()
    for (let i = 0; i < 9; i += 1) menu.toggle()
    expect(menu.isOpen.value).toBe(true)
    menu.toggle()
    expect(menu.isOpen.value).toBe(false)
  })

  it.each([['ArrowDown', 0], ['ArrowUp', 3]])('胶囊上的 %s 展开并聚焦正确入口', async (value, index) => {
    const { menu, items, key } = createMenu()
    const event = key(value)
    await menu.handleKeydown(event)
    expect(menu.isOpen.value).toBe(true)
    expect(items[index].focus).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it.each([
    ['ArrowDown', 0, 1], ['ArrowDown', 3, 0], ['ArrowUp', 0, 3],
    ['Home', 2, 0], ['End', 1, 3]
  ])('%s 按可见顺序移动焦点并支持首尾', async (value, from, to) => {
    const { menu, items, key } = createMenu()
    menu.toggle()
    await menu.handleKeydown(key(value, items[from]))
    expect(items[to].focus).toHaveBeenCalledOnce()
  })

  it('Escape 关闭菜单并将焦点还给胶囊', async () => {
    const { menu, trigger, items, key } = createMenu()
    menu.toggle()
    const event = key('Escape', items[1])
    await menu.handleKeydown(event)
    expect(menu.isOpen.value).toBe(false)
    expect(trigger.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('不拦截 Tab、Enter 或关闭时的 Escape/Home/End', async () => {
    const { menu, key } = createMenu()
    for (const value of ['Tab', 'Enter', 'Escape', 'Home', 'End']) {
      const event = key(value)
      await menu.handleKeydown(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
    menu.toggle()
    const tab = key('Tab')
    await menu.handleKeydown(tab)
    expect(tab.preventDefault).not.toHaveBeenCalled()
    expect(menu.isOpen.value).toBe(true)
  })

  it('焦点在菜单内移动不收起，移出后收起且不抢焦点', () => {
    const { menu, items, trigger } = createMenu()
    menu.toggle()
    menu.handleFocusOut({ relatedTarget: items[1] })
    expect(menu.isOpen.value).toBe(true)
    menu.handleFocusOut({ relatedTarget: {} })
    expect(menu.isOpen.value).toBe(false)
    expect(trigger.focus).not.toHaveBeenCalled()
  })

  it('保留浏览器组合快捷键', async () => {
    const { menu, key } = createMenu()
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
      const event = { ...key('ArrowDown'), [modifier]: true }
      await menu.handleKeydown(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
    expect(menu.isOpen.value).toBe(false)
  })

  it('关闭发生在下一帧之前时不会聚焦已经隐藏的入口', async () => {
    const { menu, items, key } = createMenu()
    const pending = menu.handleKeydown(key('ArrowDown'))
    menu.close()
    await pending
    expect(items.every(item => item.focus.mock.calls.length === 0)).toBe(true)
  })

  it('卸载前菜单引用缺失时不抛错', async () => {
    const menu = useDropdownMenu()
    await expect(menu.handleKeydown({ key: 'ArrowDown', preventDefault() {} })).resolves.toBeUndefined()
    expect(() => menu.close({ restoreFocus: true })).not.toThrow()
  })
})

describe('个人菜单动效和无障碍接线', () => {
  const source = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')

  it('使用可中断的 Vue 过渡，并让退出中的入口立即停止交互', () => {
    expect(source).toContain('<Transition name="user-menu">')
    expect(source).toContain('v-show="showDropdown"')
    expect(source).toContain(':inert="!showDropdown"')
    expect(source).toContain('aria-controls="header-user-menu"')
    expect(source).toContain('@keydown="handleDropdownKeydown"')
    expect(source).toContain('@focusout="handleDropdownFocusOut"')
    expect(source).toContain('watch(() => route.fullPath, () => closeDropdown())')
  })

  it('为减少动态效果提供纯淡入淡出，并限制各尺寸下的菜单高度', () => {
    const reducedMotion = source.slice(source.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotion).toContain('transition: opacity 80ms linear')
    expect(reducedMotion).toContain('transform: none')
    expect(reducedMotion).toContain('transition: none')
    expect(source).toContain('100dvh - var(--user-menu-viewport-offset)')
    expect(source).toContain('overscroll-behavior: contain')
    expect(source).toContain('.dropdown-item:focus-visible')
  })
})
