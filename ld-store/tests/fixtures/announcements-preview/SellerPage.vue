<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <section class="seller-preview-content" aria-label="卖家页面内容">
    <h2>{{ route.meta.title }}</h2>
    <p>隔离布局预览：公告应排列在本区域上方，文字和操作均可正常访问。</p>
    <router-link :to="route.name === 'SellerDashboard' ? '/seller/orders' : '/seller'">{{ route.name === 'SellerDashboard' ? '查看订单管理' : '返回经营概览' }}</router-link>
  </section>
</template>
<style scoped>
.seller-preview-content { min-height: 700px; padding: var(--space-6); border: 1px solid var(--seller-border); border-radius: var(--radius-lg); background: var(--seller-surface); color: var(--seller-ink); }
h2 { margin: 0 0 var(--space-4); font-family: var(--font-serif); font-size: 24px; }
p { margin-bottom: var(--space-5); line-height: 1.8; }
a { display: inline-flex; align-items: center; min-height: 44px; color: var(--text-link); text-decoration: underline; }
</style>
