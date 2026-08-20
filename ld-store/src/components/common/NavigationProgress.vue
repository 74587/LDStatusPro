<template>
  <Transition name="navigation-progress">
    <div
      v-if="visible"
      class="navigation-progress"
      role="progressbar"
      aria-label="页面加载中"
      aria-valuetext="正在打开新页面"
    >
      <span class="navigation-progress__bar"></span>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'

const SHOW_DELAY_MS = 140
const uiStore = useUiStore()
const routeLoading = computed(() => uiStore.routeLoading)
const visible = ref(false)
let showTimer = null

function clearShowTimer() {
  if (showTimer === null) return
  window.clearTimeout(showTimer)
  showTimer = null
}

watch(routeLoading, (isLoading) => {
  clearShowTimer()

  if (!isLoading) {
    visible.value = false
    return
  }

  showTimer = window.setTimeout(() => {
    visible.value = routeLoading.value
    showTimer = null
  }, SHOW_DELAY_MS)
}, { immediate: true })

onBeforeUnmount(clearShowTimer)
</script>

<style scoped>
.navigation-progress {
  position: fixed;
  inset: 0 0 auto;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
  z-index: 10020;
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.navigation-progress__bar {
  display: block;
  width: 45%;
  height: 100%;
  border-radius: 0 999px 999px 0;
  background: var(--color-primary-hover);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 55%, transparent);
  animation: navigation-progress-slide 1s ease-in-out infinite;
  will-change: transform;
}

.navigation-progress-enter-active,
.navigation-progress-leave-active {
  transition: opacity 120ms ease;
}

.navigation-progress-enter-from,
.navigation-progress-leave-to {
  opacity: 0;
}

@keyframes navigation-progress-slide {
  from { transform: translateX(-110%); }
  to { transform: translateX(235%); }
}

@media (prefers-reduced-motion: reduce) {
  .navigation-progress__bar {
    width: 72%;
    animation: none;
  }

  .navigation-progress-enter-active,
  .navigation-progress-leave-active {
    transition: none;
  }
}
</style>
