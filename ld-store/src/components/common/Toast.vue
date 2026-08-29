<template>
  <Teleport to="body">
    <div
      :class="['toast-container', { 'toast-container--below-header': belowHeader }]"
      role="region"
      aria-label="操作提醒"
    >
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          aria-atomic="true"
          :aria-busy="toast.type === 'loading' ? 'true' : undefined"
          @pointerenter="handlePointerEnter(toast.id)"
          @pointerleave="handlePointerLeave(toast.id)"
          @focusin="handleFocusIn(toast.id)"
          @focusout="handleFocusOut(toast.id, $event)"
        >
          <span class="toast-icon" aria-hidden="true">
            <component
              :is="getIconComponent(toast.type)"
              :class="{ 'toast-icon-svg--loading': toast.type === 'loading' }"
              :size="19"
              :stroke-width="2"
            />
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            aria-label="关闭提醒"
            @click="removeToast(toast.id)"
          >
            <X :size="17" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'

defineProps({
  belowHeader: {
    type: Boolean,
    default: false
  }
})

const uiStore = useUiStore()
const toasts = computed(() => uiStore.toasts)
const hoveredToastIds = new Set()
const focusedToastIds = new Set()

const iconComponents = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  loading: LoaderCircle
}

function getIconComponent(type) {
  return iconComponents[type] || Info
}

function removeToast(id) {
  hoveredToastIds.delete(id)
  focusedToastIds.delete(id)
  uiStore.removeToast(id)
}

function pauseToast(id) {
  uiStore.pauseToast(id)
}

function resumeToastIfReady(id) {
  if (document.hidden || hoveredToastIds.has(id) || focusedToastIds.has(id)) return
  uiStore.resumeToast(id)
}

function handlePointerEnter(id) {
  hoveredToastIds.add(id)
  pauseToast(id)
}

function handlePointerLeave(id) {
  hoveredToastIds.delete(id)
  resumeToastIfReady(id)
}

function handleFocusIn(id) {
  focusedToastIds.add(id)
  pauseToast(id)
}

function handleFocusOut(id, event) {
  if (event.currentTarget.contains(event.relatedTarget)) return
  focusedToastIds.delete(id)
  resumeToastIfReady(id)
}

function handleVisibilityChange() {
  if (document.hidden) {
    toasts.value.forEach(toast => pauseToast(toast.id))
    return
  }

  toasts.value.forEach(toast => resumeToastIfReady(toast.id))
}

watch(
  () => toasts.value.map(toast => toast.id),
  (ids) => {
    if (document.hidden) ids.forEach(id => pauseToast(id))
  }
)

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  handleVisibilityChange()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: max(16px, calc(env(safe-area-inset-top, 0px) + 16px));
  right: 24px;
  z-index: 9999;
  width: clamp(320px, 32vw, 420px);
  max-width: calc(100vw - 48px);
  pointer-events: none;
}

.toast-container--below-header {
  top: calc(env(safe-area-inset-top, 0px) + 80px);
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  --toast-accent: var(--color-info);
  --toast-tint: var(--color-info-bg);

  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 9px 8px 9px 12px;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  background: var(--dropdown-bg);
  border: 1px solid color-mix(in srgb, var(--toast-accent) 24%, var(--border-light));
  border-radius: 14px;
  box-shadow: var(--dropdown-shadow);
  pointer-events: auto;
}

.toast-success {
  --toast-accent: var(--color-success);
  --toast-tint: var(--color-success-bg);
}

.toast-error {
  --toast-accent: var(--color-danger);
  --toast-tint: var(--color-danger-bg);
}

.toast-warning {
  --toast-accent: var(--color-warning);
  --toast-tint: var(--color-warning-bg);
}

.toast-loading {
  --toast-accent: var(--color-primary-hover);
  --toast-tint: var(--color-primary-light);
}

.toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--toast-accent);
  background: var(--toast-tint);
  border-radius: 10px;
}

.toast-icon-svg--loading {
  animation: toastSpin 0.9s linear infinite;
}

.toast-message {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: normal;
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  transition: color 120ms ease, background-color 120ms ease;
}

.toast-close:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.toast-close:active {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.toast-close:focus-visible {
  color: var(--text-primary);
  outline: 2px solid var(--toast-accent);
  outline-offset: 1px;
}

.toast-move {
  transition: transform 180ms ease-out;
}

.toast-enter-active {
  animation: toastIn 180ms ease-out;
}

.toast-leave-active {
  position: absolute;
  width: 100%;
  animation: toastOut 120ms ease-in;
}

@keyframes toastSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@media (max-width: 640px) {
  .toast-container {
    top: max(12px, calc(env(safe-area-inset-top, 0px) + 12px));
    right: 12px;
    width: calc(100% - 24px);
    max-width: none;
  }

  .toast-container--below-header {
    top: calc(env(safe-area-inset-top, 0px) + 69px);
  }

  .toast {
    grid-template-columns: 32px minmax(0, 1fr) 44px;
    gap: 10px;
    min-height: 60px;
    padding: 8px 4px 8px 12px;
    border-radius: 13px;
  }

  .toast-close {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-move,
  .toast-enter-active,
  .toast-leave-active,
  .toast-icon-svg--loading {
    animation: none;
    transition: none;
  }
}
</style>
