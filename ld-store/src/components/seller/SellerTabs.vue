<template>
  <div
    ref="tabsContainer"
    class="seller-tabs"
    :class="[`seller-tabs--${size}`, `seller-tabs--${layout}`]"
    :role="mode === 'tabs' ? 'tablist' : 'group'"
    :aria-label="ariaLabel"
    :aria-disabled="disabled || undefined"
    @focusout="handleFocusOut"
  >
    <button
      v-for="tab in tabs"
      :id="tabId(tab)"
      :key="tab.value"
      :ref="el => setTabRef(el, tab.value)"
      type="button"
      :class="['seller-tab', { active: modelValue === tab.value, 'has-description': tab.description }]"
      :disabled="isDisabled(tab)"
      :role="mode === 'tabs' ? 'tab' : undefined"
      :aria-selected="mode === 'tabs' ? modelValue === tab.value : undefined"
      :aria-pressed="mode === 'select' ? modelValue === tab.value : undefined"
      :aria-controls="mode === 'tabs' ? tab.panelId : undefined"
      :aria-describedby="tab.description ? `${tabId(tab)}-description` : undefined"
      :tabindex="mode === 'tabs' ? (tab.value === focusEntryValue ? 0 : -1) : undefined"
      @click="activateTab(tab)"
      @keydown="handleKeydown($event, tab)"
      @focus="handleFocus(tab)"
    >
      <span v-if="tab.iconComponent || tab.icon" class="tab-icon" aria-hidden="true">
        <component :is="tab.iconComponent" v-if="tab.iconComponent" :size="16" :stroke-width="2" />
        <template v-else>{{ tab.icon }}</template>
      </span>
      <span class="tab-copy">
        <span class="tab-text">{{ tab.label }}</span>
        <span v-if="tab.description" :id="`${tabId(tab)}-description`" class="tab-description">{{ tab.description }}</span>
      </span>
      <span v-if="tab.badge !== undefined && tab.badge !== null" class="tab-badge">{{ tab.badge }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: [String, Number], required: true },
  mode: { type: String, default: 'select', validator: value => ['select', 'tabs'].includes(value) },
  activation: { type: String, default: 'manual', validator: value => ['manual', 'automatic'].includes(value) },
  size: { type: String, default: 'md', validator: value => ['sm', 'md'].includes(value) },
  layout: { type: String, default: 'content', validator: value => ['content', 'equal'].includes(value) },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '选项切换' }
})
const emit = defineEmits(['update:modelValue', 'activate'])
const instanceId = `seller-tabs-${getCurrentInstance().uid}`
const tabsContainer = ref(null)
const tabRefs = new Map()
const focusedValue = ref(undefined)
let resizeObserver = null
let frameId = null
let observing = false
let revealPending = false

const enabledTabs = computed(() => props.tabs.filter(tab => !isDisabled(tab)))
const focusEntryValue = computed(() => {
  const enabled = enabledTabs.value
  if (enabled.some(tab => tab.value === focusedValue.value)) return focusedValue.value
  if (enabled.some(tab => tab.value === props.modelValue)) return props.modelValue
  return enabled[0]?.value
})

function tabId(tab) {
  return tab.id || `${instanceId}-${typeof tab.value}-${encodeURIComponent(tab.value)}`
}

function isDisabled(tab) {
  return props.disabled || Boolean(tab.disabled)
}

function setTabRef(element, value) {
  const previous = tabRefs.get(value)
  if (previous === element) return
  if (previous) resizeObserver?.unobserve(previous)
  if (element) {
    tabRefs.set(value, element)
    resizeObserver?.observe(element)
  } else {
    tabRefs.delete(value)
  }
  scheduleMeasure()
}

function revealTab(value) {
  const container = tabsContainer.value
  const tab = tabRefs.get(value)
  if (!container || !tab || !container.clientWidth || !tab.offsetWidth) return
  const margin = 5
  const start = tab.offsetLeft - margin
  const end = tab.offsetLeft + tab.offsetWidth + margin
  let left = container.scrollLeft
  if (start < left) left = start
  else if (end > left + container.clientWidth) left = end - container.clientWidth
  left = Math.max(0, Math.min(left, container.scrollWidth - container.clientWidth))
  if (Math.abs(left - container.scrollLeft) < 1) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  container.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function scheduleMeasure(reveal = false) {
  if (!observing) return
  revealPending ||= reveal
  if (frameId !== null) return
  frameId = window.requestAnimationFrame(() => {
    frameId = null
    if (revealPending) revealTab(focusedValue.value ?? props.modelValue)
    revealPending = false
  })
}

function activateTab(tab) {
  if (isDisabled(tab)) return
  if (tab.value !== props.modelValue) emit('update:modelValue', tab.value)
  emit('activate', tab.value)
}

function handleFocus(tab) {
  focusedValue.value = tab.value
  scheduleMeasure(true)
}

function handleFocusOut(event) {
  if (!tabsContainer.value?.contains(event.relatedTarget)) focusedValue.value = undefined
}

function handleKeydown(event, tab) {
  if (props.mode !== 'tabs' || isDisabled(tab) || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!event.repeat) activateTab(tab)
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const enabled = enabledTabs.value
  const index = enabled.findIndex(item => item.value === tab.value)
  const step = event.key === 'ArrowLeft' ? -1 : 1
  const targetIndex = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + step + enabled.length) % enabled.length
  const target = enabled[targetIndex]
  if (!target) return
  tabRefs.get(target.value)?.focus({ preventScroll: true })
  if (props.activation === 'automatic') activateTab(target)
}

function handleResize() {
  scheduleMeasure(true)
}

function startObserving() {
  if (observing) return
  observing = true
  if (window.ResizeObserver) {
    resizeObserver = new window.ResizeObserver(handleResize)
    if (tabsContainer.value) resizeObserver.observe(tabsContainer.value)
    tabRefs.forEach(element => resizeObserver.observe(element))
  }
  window.addEventListener('resize', handleResize)
  scheduleMeasure(true)
}

function stopObserving() {
  observing = false
  resizeObserver?.disconnect()
  resizeObserver = null
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  frameId = null
  revealPending = false
  focusedValue.value = undefined
  window.removeEventListener('resize', handleResize)
}

watch(() => [props.modelValue, props.tabs, props.disabled, props.layout, props.size], () => {
  if (!enabledTabs.value.some(tab => tab.value === focusedValue.value)) focusedValue.value = undefined
  scheduleMeasure(true)
}, { deep: true, flush: 'post' })

onMounted(startObserving)
onActivated(startObserving)
onDeactivated(stopObserving)
onUnmounted(stopObserving)
</script>

<style scoped>
.seller-tabs {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  background: var(--seller-surface-soft);
  border: 1px solid var(--seller-border);
  border-radius: 12px;
}
.seller-tabs::-webkit-scrollbar { display: none; }
.seller-tabs--equal { display: flex; width: 100%; }
.seller-tabs--equal .seller-tab { flex: 1 0 0; min-width: max-content; }

.seller-tab {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--seller-muted);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.seller-tab:hover:not(:disabled) { color: var(--seller-ink); background: color-mix(in srgb, var(--seller-surface-strong) 70%, transparent); }
.seller-tab.active {
  color: var(--seller-ink);
  font-weight: 600;
  background: var(--seller-surface-strong);
  border-color: var(--seller-border);
  box-shadow: var(--seller-shadow-sm);
}
.seller-tab:disabled { opacity: .5; cursor: not-allowed; }
.seller-tabs .seller-tab:focus-visible { outline: 2px solid var(--seller-jade-strong); outline-offset: -2px; }
.tab-icon { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; }
.tab-copy { display: grid; gap: 3px; min-width: 0; }
.tab-description { color: var(--seller-muted); font-size: 12px; font-weight: 400; white-space: normal; }
.has-description { text-align: left; gap: 10px; }
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  min-height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--seller-surface);
  color: var(--seller-muted);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.active .tab-badge { background: var(--seller-jade-soft); color: var(--seller-ink); }
.seller-tabs--sm .seller-tab { min-height: 40px; padding: 6px 12px; font-size: 13px; }

@media (max-width: 767px) {
  .seller-tabs .seller-tab { min-height: 44px; padding: 10px 14px; font-size: 13px; }
  .seller-tabs--equal .has-description { flex-direction: column; gap: 4px; text-align: center; }
  .seller-tabs--equal .tab-description { display: none; }
}
</style>
