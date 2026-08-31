<template>
  <LiquidTabs
    class="category-filter"
    :tabs="tabs"
    :model-value="selectedValue"
    aria-label="物品分类"
    @activate="selectCategory"
  />
</template>

<script setup>
import { computed } from 'vue'
import LiquidTabs from '@/components/common/LiquidTabs.vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  currentCategory: { type: [String, Number], default: '' }
})
const emit = defineEmits(['select'])
// Compare normalized keys, but emit the original category ID as before.
const selectedValue = computed(() => props.currentCategory ? String(props.currentCategory) : '')
const tabs = computed(() => [
  { value: '', label: '全部', icon: '🏷️' },
  ...props.categories.map(category => ({ value: String(category.id), label: category.name, icon: category.icon || '📦' }))
])

function selectCategory(value) {
  if (value === '') emit('select', '')
  else {
    const category = props.categories.find(item => String(item.id) === value)
    if (category) emit('select', category.id)
  }
}
</script>

<style scoped>
.category-filter { display: flex; width: 100%; }
</style>
