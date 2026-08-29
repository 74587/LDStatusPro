<template>
  <Transition name="seller-drawer">
    <div v-if="open" class="seller-drawer-overlay" @mousedown.self="requestClose">
      <section
        ref="panel"
        class="seller-drawer-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="seller-drawer-header">
          <div>
            <p v-if="eyebrow">{{ eyebrow }}</p>
            <h2 :id="titleId">{{ title }}</h2>
          </div>
          <button type="button" aria-label="关闭详情" @click="requestClose">
            <X :size="20" aria-hidden="true" />
          </button>
        </header>
        <div class="seller-drawer-body"><slot /></div>
        <footer v-if="$slots.footer" class="seller-drawer-footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '详情' },
  eyebrow: { type: String, default: '' }
})
const emit = defineEmits(['close'])
const panel = ref(null)
const titleId = `seller-drawer-title-${Math.random().toString(36).slice(2, 9)}`
let previousFocus = null
let previousBodyOverflow = ''

function focusableElements() {
  if (!panel.value) return []
  return [...panel.value.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length > 0 && !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!elements.includes(document.activeElement)) {
    event.preventDefault()
    const target = event.shiftKey ? last : first
    target.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function requestClose() {
  emit('close')
}

watch(() => props.open, async open => {
  if (open) {
    previousFocus = document.activeElement
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeydown)
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  } else {
    document.body.style.overflow = previousBodyOverflow
    document.removeEventListener('keydown', handleKeydown)
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
    previousFocus = null
  }
})

onUnmounted(() => {
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.seller-drawer-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; justify-content: flex-end; background: color-mix(in srgb, var(--seller-navy) 42%, transparent); backdrop-filter: blur(3px); }
.seller-drawer-panel { width: min(720px, calc(100vw - 32px)); height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; outline: 0; border-left: 1px solid var(--seller-border); background: var(--seller-surface); box-shadow: -18px 0 48px color-mix(in srgb, var(--seller-navy) 22%, transparent); }
.seller-drawer-header { min-height: 78px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 22px; border-bottom: 1px solid var(--seller-border); }
.seller-drawer-header p { margin: 0 0 4px; color: var(--seller-jade-strong); font-size: 11px; font-weight: 750; letter-spacing: .14em; }
.seller-drawer-header h2 { margin: 0; color: var(--seller-ink); font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, serif; font-size: 21px; line-height: 1.35; }
.seller-drawer-header button { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid var(--seller-border); border-radius: 10px; color: var(--seller-muted); background: var(--seller-surface-strong); }
.seller-drawer-header button:hover { color: var(--seller-ink); border-color: var(--seller-border-strong); }
.seller-drawer-body { min-width: 0; overflow-y: auto; overscroll-behavior: contain; padding: 22px; }
.seller-drawer-footer { display: flex; justify-content: flex-end; gap: 9px; padding: 14px 22px calc(14px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--seller-border); background: var(--seller-surface); }
.seller-drawer-enter-active, .seller-drawer-leave-active { transition: opacity .2s ease; }
.seller-drawer-enter-active .seller-drawer-panel, .seller-drawer-leave-active .seller-drawer-panel { transition: transform .24s cubic-bezier(.22, 1, .36, 1); }
.seller-drawer-enter-from, .seller-drawer-leave-to { opacity: 0; }
.seller-drawer-enter-from .seller-drawer-panel, .seller-drawer-leave-to .seller-drawer-panel { transform: translateX(100%); }
@media (max-width: 640px) {
  .seller-drawer-panel { width: 100%; max-width: none; }
  .seller-drawer-header { min-height: 68px; padding: 12px 16px; }
  .seller-drawer-body { padding: 18px 16px; }
  .seller-drawer-footer { padding-inline: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .seller-drawer-enter-active, .seller-drawer-leave-active, .seller-drawer-enter-active .seller-drawer-panel, .seller-drawer-leave-active .seller-drawer-panel { transition: none; }
}
</style>
