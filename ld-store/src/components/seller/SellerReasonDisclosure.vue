<template>
  <span class="seller-reason-wrap">
    <button
      ref="triggerRef"
      type="button"
      class="seller-reason-trigger"
      :aria-describedby="visible ? tooltipId : undefined"
      :aria-expanded="visible"
      @mouseenter="openReason"
      @mouseleave="scheduleClose"
      @focus="openReason"
      @blur="scheduleClose"
      @click.stop="openReason"
      @keydown.esc="closeReason"
    >
      <CircleAlert :size="13" aria-hidden="true" />
      <span>{{ text }}</span>
      <ChevronDown :size="12" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="seller-reason-popover">
        <div
          v-if="visible"
          :id="tooltipId"
          ref="popoverRef"
          class="seller-reason-popover"
          :style="popoverStyle"
          role="tooltip"
          @mouseenter="cancelClose"
          @mouseleave="scheduleClose"
        >
          <strong>{{ label }}</strong>
          <p>{{ text }}</p>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ChevronDown, CircleAlert } from '@lucide/vue'

defineProps({
  text: { type: String, required: true },
  label: { type: String, default: '状态说明' }
})

const triggerRef = ref(null)
const popoverRef = ref(null)
const visible = ref(false)
const coordinates = ref({ top: 0, left: 0, width: 320, placement: 'bottom' })
const tooltipId = `seller-reason-${Math.random().toString(36).slice(2, 10)}`
let closeTimer = null

const popoverStyle = computed(() => ({
  top: `${coordinates.value.top}px`,
  left: `${coordinates.value.left}px`,
  width: `${coordinates.value.width}px`,
  transform: coordinates.value.placement === 'top' ? 'translateY(-100%)' : 'none'
}))

function cancelClose() {
  if (!closeTimer) return
  window.clearTimeout(closeTimer)
  closeTimer = null
}

function scheduleClose() {
  cancelClose()
  closeTimer = window.setTimeout(closeReason, 120)
}

function updatePosition() {
  const trigger = triggerRef.value
  if (!trigger || typeof window === 'undefined') return
  const rect = trigger.getBoundingClientRect()
  const viewportPadding = 12
  const width = Math.max(160, Math.min(380, window.innerWidth - viewportPadding * 2))
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    window.innerWidth - width - viewportPadding
  )
  const availableBelow = window.innerHeight - rect.bottom
  const placement = availableBelow < 180 && rect.top > availableBelow ? 'top' : 'bottom'
  const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8
  coordinates.value = { top, left, width, placement }
}

async function openReason() {
  cancelClose()
  visible.value = true
  await nextTick()
  updatePosition()
}

function closeReason() {
  cancelClose()
  visible.value = false
}

function handleOutsidePointer(event) {
  if (!visible.value) return
  if (triggerRef.value?.contains(event.target) || popoverRef.value?.contains(event.target)) return
  closeReason()
}

function handleWindowScroll(event) {
  if (popoverRef.value?.contains(event.target)) return
  closeReason()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer)
  window.addEventListener('resize', closeReason)
  window.addEventListener('scroll', handleWindowScroll, true)
})

onUnmounted(() => {
  cancelClose()
  document.removeEventListener('pointerdown', handleOutsidePointer)
  window.removeEventListener('resize', closeReason)
  window.removeEventListener('scroll', handleWindowScroll, true)
})
</script>

<style scoped>
.seller-reason-wrap {
  display: block;
  min-width: 0;
  margin-top: 7px;
}

.seller-reason-trigger {
  max-width: 100%;
  min-height: 28px;
  display: inline-grid;
  grid-template-columns: 13px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border: 1px solid color-mix(in srgb, var(--seller-danger) 24%, var(--seller-border));
  border-radius: 8px;
  color: var(--seller-danger);
  background: color-mix(in srgb, var(--seller-danger) 6%, var(--seller-surface));
  font-size: 11px;
  line-height: 1.35;
  cursor: help;
}

.seller-reason-trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seller-reason-trigger svg:last-child {
  transition: transform 160ms ease;
}

.seller-reason-trigger[aria-expanded="true"] svg:last-child {
  transform: rotate(180deg);
}

.seller-reason-trigger:hover,
.seller-reason-trigger:focus-visible {
  border-color: color-mix(in srgb, var(--seller-danger) 48%, var(--seller-border));
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--seller-danger) 13%, transparent);
}

.seller-reason-popover {
  position: fixed;
  z-index: 2100;
  max-height: min(60vh, 360px);
  overflow-y: auto;
  padding: 13px 14px;
  border: 1px solid color-mix(in srgb, var(--seller-danger) 30%, var(--seller-border));
  border-radius: 11px;
  color: var(--seller-ink);
  background: var(--seller-surface);
  box-shadow: var(--seller-shadow-md);
}

.seller-reason-popover::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: 11px 0 0 11px;
  background: var(--seller-danger);
}

.seller-reason-popover strong {
  display: block;
  color: var(--seller-danger);
  font-size: 12px;
  letter-spacing: .04em;
}

.seller-reason-popover p {
  margin: 7px 0 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  color: var(--seller-ink);
  font-size: 13px;
  line-height: 1.65;
}

.seller-reason-popover-enter-active,
.seller-reason-popover-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.seller-reason-popover-enter-from,
.seller-reason-popover-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .seller-reason-trigger {
    min-height: 44px;
    cursor: pointer;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seller-reason-trigger svg:last-child,
  .seller-reason-popover-enter-active,
  .seller-reason-popover-leave-active {
    transition: none;
  }
}
</style>
