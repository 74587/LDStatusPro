// @vitest-environment jsdom
/* global window, document */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import LiquidTabs from '../src/components/common/LiquidTabs.vue'
import CategoryFilter from '../src/components/product/CategoryFilter.vue'

const tabs = [
  { value: 'a', label: '活动管理', id: 'tab-a', panelId: 'panel-a' },
  { value: 'b', label: '创建优惠券', id: 'tab-b', panelId: 'panel-b' },
  { value: 'c', label: '活动记录', id: 'tab-c', panelId: 'panel-c' }
]
let wrappers
let observers
let frames
let nextFrame

function render(props = {}) {
  const wrapper = mount(LiquidTabs, { attachTo: document.body, props: { tabs, modelValue: 'a', ...props } })
  wrappers.push(wrapper)
  return wrapper
}

function geometry(element, values) {
  for (const [name, value] of Object.entries(values)) Object.defineProperty(element, name, { configurable: true, value })
}

async function flushFrame() {
  await nextTick()
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach(callback => callback())
  await nextTick()
}

function layout(wrapper) {
  geometry(wrapper.element, { clientWidth: 180, scrollWidth: 340 })
  wrapper.element.scrollTo = vi.fn()
  wrapper.findAll('button').forEach((button, index) => {
    geometry(button.element, { offsetLeft: 5 + index * 110, offsetTop: 5, offsetWidth: 108, offsetHeight: 44 })
  })
}

beforeEach(() => {
  wrappers = []
  observers = []
  frames = new Map()
  nextFrame = 0
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame })
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id))
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) {
      this.callback = callback
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
      observers.push(this)
    }
  })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('LiquidTabs public behavior', () => {
  it('defaults to a labelled filter group, with native buttons and parent-controlled selection', async () => {
    const wrapper = render({ ariaLabel: '状态筛选' })
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('状态筛选')
    const button = wrapper.get('#tab-b')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('role')).toBeUndefined()
    await button.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
    expect(wrapper.emitted('activate')).toEqual([['b']])
    expect(wrapper.get('#tab-a').attributes('aria-pressed')).toBe('true')
    await wrapper.setProps({ modelValue: 'b' })
    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('emits activate on repeat clicks but does not duplicate model updates', async () => {
    const wrapper = render()
    await wrapper.get('#tab-a').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('activate')).toEqual([['a']])
  })

  it('supports numeric values, a zero badge, descriptions, and both icon formats', () => {
    const wrapper = render({ modelValue: 7, tabs: [
      { value: 7, label: '待处理', badge: 0, description: '需要响应', icon: '📦' },
      { value: '7', label: '其他', iconComponent: defineComponent({ render: () => h('svg', { 'data-test-icon': true }) }) }
    ] })
    expect(wrapper.get('.tab-badge').text()).toBe('0')
    const first = wrapper.findAll('button')[0]
    expect(first.attributes('aria-pressed')).toBe('true')
    expect(document.getElementById(first.attributes('aria-describedby')).textContent).toBe('需要响应')
    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('.tab-icon[aria-hidden="true"]')).toHaveLength(2)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('blocks per-item and whole-group disabled activation', async () => {
    const wrapper = render({ tabs: tabs.map(tab => ({ ...tab, disabled: tab.value === 'b' })) })
    await wrapper.get('#tab-b').trigger('click')
    expect(wrapper.emitted('activate')).toBeUndefined()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.findAll('button:disabled')).toHaveLength(3)
    await wrapper.get('#tab-c').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('links content tabs to panels without pressed semantics', () => {
    const wrapper = render({ mode: 'tabs' })
    expect(wrapper.attributes('role')).toBe('tablist')
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3)
    expect(wrapper.get('#tab-a').attributes()).toMatchObject({ 'aria-controls': 'panel-a', 'aria-selected': 'true', tabindex: '0' })
    expect(wrapper.get('#tab-b').attributes('tabindex')).toBe('-1')
    expect(wrapper.get('#tab-a').attributes('aria-pressed')).toBeUndefined()
  })

  it('supports manual arrows, wrapping, Home/End and skips disabled tabs without changing selection', async () => {
    const wrapper = render({ mode: 'tabs', tabs: tabs.map(tab => ({ ...tab, disabled: tab.value === 'b' })) })
    wrapper.get('#tab-a').element.focus()
    await wrapper.get('#tab-a').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement.id).toBe('tab-c')
    expect(wrapper.emitted('activate')).toBeUndefined()
    expect(wrapper.get('#tab-a').attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('button[tabindex="0"]')).toHaveLength(1)
    await wrapper.get('#tab-c').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement.id).toBe('tab-a')
    await wrapper.get('#tab-a').trigger('keydown', { key: 'End' })
    expect(document.activeElement.id).toBe('tab-c')
    await wrapper.get('#tab-c').trigger('keydown', { key: 'Home' })
    await wrapper.get('#tab-a').trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement.id).toBe('tab-c')
    await wrapper.get('#tab-c').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['c']])
  })

  it.each(['Enter', ' '])('confirms manual selection with %j and suppresses duplicate native activation', async key => {
    const wrapper = render({ mode: 'tabs' })
    wrapper.get('#tab-a').element.focus()
    await wrapper.get('#tab-a').trigger('keydown', { key: 'ArrowRight' })
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    wrapper.get('#tab-b').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
    expect(wrapper.emitted('activate')).toEqual([['b']])
    await wrapper.get('#tab-b').trigger('keydown', { key, repeat: true })
    expect(wrapper.emitted('activate')).toHaveLength(1)
    await wrapper.setProps({ modelValue: 'b' })
    await wrapper.get('#tab-b').trigger('keydown', { key })
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('activate')).toHaveLength(2)
  })

  it('activates only once with automatic keyboard navigation and resets the entry point on exit', async () => {
    const wrapper = render({ mode: 'tabs', activation: 'automatic' })
    wrapper.get('#tab-a').element.focus()
    await wrapper.get('#tab-a').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
    expect(wrapper.emitted('activate')).toEqual([['b']])
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    await nextTick()
    // Parent declined the update: returning enters at its authoritative value.
    expect(wrapper.get('#tab-a').attributes('tabindex')).toBe('0')
  })

  it('keeps filter arrow keys native and never selects a fallback for invalid or empty input', async () => {
    const wrapper = render({ modelValue: 'missing' })
    await wrapper.get('#tab-a').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('activate')).toBeUndefined()
    await wrapper.setProps({ mode: 'tabs' })
    expect(wrapper.get('#tab-a').attributes('tabindex')).toBe('0')
    await wrapper.setProps({ tabs: [] })
    await flushFrame()
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.get('.liquid-indicator').element.style.opacity).toBe('0')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('indicator lifecycle and scroll boundaries', () => {
  it('measures local geometry, observes every item and scrolls only its own container', async () => {
    const wrapper = render({ modelValue: 'c' })
    layout(wrapper)
    const windowScroll = vi.spyOn(window, 'scrollTo')
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style).toMatchObject({ transform: 'translate(225px, 5px)', width: '108px', height: '44px', opacity: '1' })
    expect(observers[0].observe).toHaveBeenCalledTimes(4)
    expect(wrapper.element.scrollTo).toHaveBeenCalledWith({ left: 158, behavior: 'smooth' })
    expect(windowScroll).not.toHaveBeenCalled()
  })

  it('batches rapid parent updates and honors reduced-motion scrolling', async () => {
    const wrapper = render()
    layout(wrapper)
    await flushFrame()
    window.matchMedia.mockReturnValue({ matches: true })
    await wrapper.setProps({ modelValue: 'b' })
    await wrapper.setProps({ modelValue: 'c' })
    expect(frames.size).toBe(1)
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style.transform).toBe('translate(225px, 5px)')
    expect(wrapper.element.scrollTo).toHaveBeenLastCalledWith({ left: 158, behavior: 'auto' })
  })

  it('re-measures badge/font changes and recovers from hidden zero-size geometry', async () => {
    const wrapper = render()
    layout(wrapper)
    await flushFrame()
    geometry(wrapper.get('#tab-a').element, { offsetWidth: 135 })
    observers[0].callback()
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style.width).toBe('135px')
    geometry(wrapper.element, { clientWidth: 0 })
    observers[0].callback()
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style.opacity).toBe('0')
    geometry(wrapper.element, { clientWidth: 180 })
    observers[0].callback()
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style.opacity).toBe('1')
  })

  it('clears removed refs, survives reordering and removes observers on unmount', async () => {
    const wrapper = render({ modelValue: 'b' })
    layout(wrapper)
    await flushFrame()
    const oldButton = wrapper.get('#tab-b').element
    await wrapper.setProps({ tabs: [tabs[2], tabs[0]] })
    await flushFrame()
    expect(observers[0].unobserve).toHaveBeenCalledWith(oldButton)
    expect(wrapper.get('.liquid-indicator').element.style.opacity).toBe('0')
    await wrapper.setProps({ modelValue: 'a' })
    geometry(wrapper.get('#tab-a').element, { offsetLeft: 115 })
    await flushFrame()
    expect(wrapper.get('.liquid-indicator').element.style.transform).toBe('translate(115px, 5px)')
    wrapper.unmount()
    wrappers = []
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    expect(frames.size).toBe(0)
  })

  it('restarts measurement when a KeepAlive page is restored', async () => {
    const visible = ref(true)
    const Page = defineComponent({ render: () => h(LiquidTabs, { tabs, modelValue: 'a' }) })
    const wrapper = mount(defineComponent({ render: () => h(KeepAlive, null, { default: () => visible.value ? h(Page) : null }) }))
    wrappers.push(wrapper)
    await flushFrame()
    visible.value = false
    await nextTick()
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    visible.value = true
    await nextTick()
    expect(observers).toHaveLength(2)
    expect(frames.size).toBe(1)
  })
})

describe('CategoryFilter compatibility adapter', () => {
  it('normalizes ID comparisons but emits original IDs and repeated selection once', async () => {
    const wrapper = mount(CategoryFilter, { props: { categories: [{ id: 7, name: 'AI' }, { id: '8', name: '存储' }], currentCategory: '7' } })
    wrappers.push(wrapper)
    const buttons = wrapper.findAll('button')
    expect(buttons[1].attributes('aria-pressed')).toBe('true')
    await buttons[1].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([[7], [7], ['8'], ['']])
  })
})
