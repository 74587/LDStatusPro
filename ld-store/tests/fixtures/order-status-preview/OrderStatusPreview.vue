<template>
  <div class="preview"><header>商品订单 · 本地模拟数据 <button @click="toggleTheme">切换主题</button><router-link :to="seller ? '/user/orders' : '/seller/orders?source=product'">切换买卖家</router-link></header><div v-bind="shellAttributes" :class="{ 'seller-shell': seller }"><main v-bind="shellAttributes" :class="{ 'seller-main': seller }"><Orders :key="String(seller)" :seller-mode="seller" /></main></div></div>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Orders from '@/views/Orders.vue'
import SellerLayout from '@/layouts/SellerLayout.vue'
const shellAttributes = { [SellerLayout.__scopeId]: '' }
const route = useRoute()
const seller = computed(() => route.path.startsWith('/seller/'))
function toggleTheme() { document.documentElement.classList.toggle('dark') }
</script>
<style scoped>
.preview { max-width:1100px; margin:auto; padding:0; }
header { display:flex; gap:12px; flex-wrap:wrap; align-items:center; padding:12px; }
.preview .seller-shell { grid-template-columns: minmax(0, 1fr); }
header button { min-height:44px; }
</style>
