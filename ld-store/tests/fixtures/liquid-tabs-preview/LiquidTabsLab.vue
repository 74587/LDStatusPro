<template>
  <section class="tabs-lab">
    <h2>组件边界验收</h2>
    <div class="lab-controls">
      <label><input v-model="visible" type="checkbox" />显示页签</label>
      <label><input v-model="mounted" type="checkbox" />启用缓存组件</label>
      <label><input v-model="disabled" type="checkbox" />全部禁用</label>
      <button type="button" @click="count = count ? 0 : 100000">改变徽标宽度</button>
      <button type="button" @click="selected = 99">设置不存在的选中值</button>
    </div>
    <KeepAlive>
      <LiquidTabs v-if="mounted" v-show="visible" v-model="selected" :tabs="items" :disabled="disabled" mode="tabs" aria-label="数字编号页签验收" @activate="activations++" />
    </KeepAlive>
    <p>选中值：{{ selected }}；激活次数：{{ activations }}</p>
    <section v-for="item in items" v-show="mounted && visible && selected === item.value" :id="item.panelId" :key="item.value" role="tabpanel" :aria-labelledby="item.id" tabindex="0">{{ item.label }}的本地示例内容</section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import LiquidTabs from '@/components/common/LiquidTabs.vue'
const visible = ref(true)
const mounted = ref(true)
const disabled = ref(false)
const selected = ref(1)
const count = ref(0)
const activations = ref(0)
const items = computed(() => [
  { value: 1, label: '待响应', badge: count.value },
  { value: 2, label: '协商中', badge: 0 },
  { value: 3, label: '暂不可用', disabled: true },
  { value: 4, label: '滚动后可见的最后一项', badge: 12 }
].map(item => ({ ...item, id: `lab-tab-${item.value}`, panelId: `lab-panel-${item.value}` })))
</script>

<style scoped>
.tabs-lab { min-width: 0; display: grid; gap: 16px; }
.lab-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.lab-controls label { display: flex; align-items: center; gap: 6px; }
.lab-controls button { padding: 10px; border: 1px solid var(--seller-border); border-radius: 8px; background: var(--seller-surface); }
.tabs-lab > section { padding: 16px; border: 1px solid var(--seller-border); border-radius: 10px; }
</style>
