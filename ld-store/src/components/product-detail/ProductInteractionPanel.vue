<template>
  <div class="product-interactions">
    <button class="nav-favorite-btn" :class="{ active: favorited }" :disabled="busy" @click="emit('favorite')">
      <Heart :size="16" :fill="favorited ? 'currentColor' : 'none'" aria-hidden="true" />
      <span>{{ favorited ? '已收藏' : '收藏' }}</span>
    </button>
    <button class="nav-block-btn" :disabled="busy" title="以后不再向我展示这件商品" aria-label="将这件商品标记为不感兴趣" @click="emit('block')">
      <EyeOff :size="16" aria-hidden="true" /><span>不感兴趣</span>
    </button>
    <button class="nav-report-btn" :disabled="reporting" @click="emit('report')"><Flag :size="16" aria-hidden="true" /><span>举报</span></button>
  </div>
</template>

<script setup lang="ts">
import { EyeOff, Flag, Heart } from '@lucide/vue'
defineProps<{ favorited: boolean; busy: boolean; reporting: boolean }>()
const emit = defineEmits<{ favorite: []; block: []; report: [] }>()
</script>

<style scoped>
.product-interactions { display: contents; }
button { display: inline-flex; min-height: 34px; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 20px; cursor: pointer; font-size: 13px; line-height: 1.2; transition: background-color 0.2s, border-color 0.2s, color 0.2s; }
button:disabled { cursor: not-allowed; opacity: 0.65; }
button:focus-visible { outline: 3px solid rgba(99, 102, 241, 0.2); outline-offset: 2px; }
.nav-favorite-btn { color: #b16472; background: #fff4f6; border: 1px solid #e4cad0; }
.nav-favorite-btn:hover { background: #feecef; border-color: #dbaab5; }
.nav-favorite-btn.active { color: #9f4258; background: #fce5ea; border-color: #d98f9f; }
.nav-block-btn { color: var(--text-tertiary); background: var(--bg-card); border: 1px solid var(--border-color); }
.nav-block-btn:hover { color: var(--color-danger); background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.3); }
.nav-report-btn { color: #8a6500; background: rgba(250, 204, 21, 0.16); border: 1px solid rgba(234, 179, 8, 0.35); }
.nav-report-btn:hover { color: #6f5200; background: rgba(250, 204, 21, 0.24); border-color: rgba(234, 179, 8, 0.5); }
@media (max-width: 640px) {
  button { min-height: 44px; }
}
</style>
