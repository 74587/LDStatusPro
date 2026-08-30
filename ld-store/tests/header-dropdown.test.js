import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { useDropdownMenu } from '../src/composables/useDropdownMenu'
import { buildUserIdentity } from '../src/utils/userIdentity'

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
    expect(reducedMotion).toContain('.user-info.is-open .user-avatar-motion')
    expect(source).toContain('100dvh - var(--user-menu-viewport-offset)')
    expect(source).toContain('overscroll-behavior: contain')
    expect(source).toContain('.dropdown-item:focus-visible')
  })

  it('桌面普通控件为 38px、胶囊为 40px，手机统一保留 44px 触摸尺寸', () => {
    expect(source).toContain('--header-control-size: 38px')
    expect(source).toContain('--header-profile-size: 40px')
    for (const selector of ['.search-input', '.search-btn', '.github-btn', '.action-btn', '.login-btn', '.header-theme :deep(.theme-btn)']) {
      const block = source.slice(source.indexOf(`${selector} {`)).split('}')[0]
      expect(block, selector).toContain('height: var(--header-control-size)')
      expect(block, selector).not.toContain('transition: all')
    }
    const capsule = source.slice(source.indexOf('.user-info {')).split('}')[0]
    expect(capsule).toContain('height: var(--header-profile-size)')
    expect(capsule).toContain('padding: 4px 12px 4px 8px')
    expect(capsule).not.toContain('transition: all')
    const mobile = source.slice(source.indexOf('@media (max-width: 767px)'))
    expect(mobile).toContain('--header-control-size: 44px')
    expect(mobile).toContain('--header-profile-size: 44px')
    for (const selector of ['.header-content', '.header-center', '.header-actions']) {
      const block = source.slice(source.indexOf(`${selector} {`)).split('}')[0]
      expect(block, selector).toContain('align-items: center')
    }
    expect(source).toContain('v-if="!isMobile" class="user-identity"')
  })

  it('头像轻转和回弹只使用可中断的 transform，不移动布局或延迟菜单操作', () => {
    expect(source).toContain('transform: rotate(30deg)')
    expect(source).toContain('transform: scale(0.965)')
    expect(source).toContain('transform 380ms var(--user-menu-spring)')
    expect(source).toContain('transform 320ms var(--user-menu-spring)')
    expect(source).not.toContain('animation: user')
  })

  it('胶囊只显示昵称和账号，信任等级保留在菜单内且可被读屏获取', () => {
    expect(source.match(/userIdentity.displayName }}/g)).toHaveLength(2)
    expect(source.match(/userIdentity.handle }}/g)).toHaveLength(2)
    expect(source.match(/userIdentity.trustLabel }}/g)).toHaveLength(1)
    const capsule = source.slice(source.indexOf('<span v-if="!isMobile" class="user-identity">'), source.indexOf('<ChevronDown'))
    expect(capsule).not.toContain('trustLabel')
    expect(capsule).toContain('class="user-handle user-account"')
    expect(source).toContain(':aria-label="userProfileLabel"')
    const profileLabel = source.slice(source.indexOf('const userProfileLabel'), source.indexOf('const dropdownMenuGroups'))
    expect(profileLabel).toContain('信任等级 ${userIdentity.value.trustLabel}')
    expect(source).toContain('class="dropdown-alert-summary"')
    expect(source).toContain(':title="userButtonLabel"')
  })

  it('长昵称和账号不能撑宽胶囊，展开菜单可完整换行阅读', () => {
    const capsule = source.slice(source.indexOf('.user-info {')).split('}')[0]
    expect(capsule).toContain('width: 180px')
    const identity = source.slice(source.indexOf('.user-identity {')).split('}')[0]
    expect(identity).toContain('min-width: 0')
    for (const selector of ['.user-name', '.user-handle']) {
      const block = source.slice(source.indexOf(`${selector} {`)).split('}')[0]
      expect(block, selector).toContain('min-width: 0')
      expect(block, selector).toContain('text-overflow: ellipsis')
      expect(block, selector).toContain('white-space: nowrap')
    }
    for (const selector of ['.dropdown-username', '.dropdown-meta .user-handle']) {
      const block = source.slice(source.indexOf(`${selector} {`)).split('}')[0]
      expect(block, selector).toContain('overflow-wrap: anywhere')
      expect(block, selector).not.toContain('line-clamp')
    }
  })
})

describe('个人身份展示字段', () => {
  it('优先展示昵称，同时单独保留账号和信任等级', () => {
    expect(buildUserIdentity({ name: ' 林间杂货铺 ', username: 'forest_shop', trustLevel: 3 })).toEqual({
      displayName: '林间杂货铺', handle: '@forest_shop', trustLabel: 'TL3'
    })
  })

  it('昵称缺失时回退到账号，正确保留 TL0', () => {
    expect(buildUserIdentity({ name: ' ', username: ' @forest_shop ', trustLevel: 0 })).toEqual({
      displayName: 'forest_shop', handle: '@forest_shop', trustLabel: 'TL0'
    })
  })

  it.each([null, undefined, '', 'unknown', -1, 1.5])('不伪造未知或无效等级 %s', trustLevel => {
    expect(buildUserIdentity({ trustLevel }).trustLabel).toBe('')
  })

  it('兼容数字字符串等级，长昵称不在数据层截断', () => {
    const name = '这是一个需要在窄屏省略但仍应保留完整信息的昵称'
    expect(buildUserIdentity({ name, username: 'very_long_username_for_preview', trustLevel: '2' })).toEqual({
      displayName: name, handle: '@very_long_username_for_preview', trustLabel: 'TL2'
    })
    expect(buildUserIdentity()).toEqual({ displayName: '用户', handle: '', trustLabel: '' })
  })
})
