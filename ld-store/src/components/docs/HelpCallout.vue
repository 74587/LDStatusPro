<template>
  <aside :class="['help-callout', `help-callout--${tone}`]" :aria-label="title">
    <component :is="toneIcon" class="help-callout__icon" :size="20" aria-hidden="true" />
    <div>
      <strong>{{ title }}</strong>
      <div class="help-callout__body"><slot /></div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from '@lucide/vue'

const props = defineProps({
  title: { type: String, required: true },
  tone: { type: String, default: 'info' }
})

const toneIcon = computed(() => ({
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info
})[props.tone] || Info)
</script>
