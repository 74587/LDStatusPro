<template>
  <nav class="help-path" :aria-label="label">
    <span class="help-path__label">{{ label }}</span>
    <template v-for="(item, index) in items" :key="`${item.label}-${index}`">
      <router-link v-if="item.to" :to="item.to">{{ item.label }}</router-link>
      <span v-else>{{ item.label }}</span>
      <ChevronRight v-if="index < items.length - 1" :size="15" aria-hidden="true" />
    </template>
  </nav>
</template>

<script setup>
import { ChevronRight } from '@lucide/vue'

defineProps({
  label: { type: String, default: '入口' },
  items: { type: Array, required: true }
})
</script>
