<template>
  <div class="tab-preview">
    <header class="preview-controls">
      <strong>Tab 本地隔离验收</strong>
      <label>验收页面<select :value="page" @change="changePage($event.target.value)"><option v-for="item in pages" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label><input v-model="dark" type="checkbox" />深色模式</label>
      <span>模拟数据 · 禁止写操作</span>
    </header>
    <div v-bind="shellAttributes" :class="{ 'seller-shell': page !== 'home' }">
      <main v-bind="shellAttributes" :class="{ 'seller-main': page !== 'home' }">
        <component :is="views[page]" :key="page" :seller-mode="true" />
      </main>
    </div>
    <details class="preview-requests"><summary>本地模拟请求（{{ previewRequests.length }}）</summary><ol><li v-for="(request, index) in previewRequests" :key="index">{{ request }}</li></ol></details>
  </div>
</template>

<script setup>
/* global document */
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Home from '@/views/Home.vue'
import Orders from '@/views/Orders.vue'
import SellerDashboard from '@/views/seller/SellerDashboard.vue'
import SellerRefunds from '@/views/seller/SellerRefunds.vue'
import CouponManage from '@/views/CouponManage.vue'
import MerchantServices from '@/views/MerchantServices.vue'
import SellerLayout from '@/layouts/SellerLayout.vue'
import LiquidTabsLab from './LiquidTabsLab.vue'
import { previewRequests } from './api.js'

const views = { home: Home, dashboard: SellerDashboard, orders: Orders, refunds: SellerRefunds, coupons: CouponManage, services: MerchantServices, lab: LiquidTabsLab }
const pages = [{ value: 'home', label: '首页' }, { value: 'dashboard', label: '经营概览' }, { value: 'orders', label: '订单管理' }, { value: 'refunds', label: '退款售后' }, { value: 'coupons', label: '优惠券' }, { value: 'services', label: '商家服务' }, { value: 'lab', label: '组件边界' }]
const router = useRouter()
const route = useRoute()
const page = computed(() => pages.find(item => route.path === `/seller/${item.value}`)?.value || 'home')
const dark = ref(document.documentElement.classList.contains('dark'))
// Use the real scoped palette without mounting session/subscription behavior.
const shellAttributes = { [SellerLayout.__scopeId]: '' }
watch(dark, value => document.documentElement.classList.toggle('dark', value))
function changePage(value) { router.push({ path: value === 'home' ? '/' : `/seller/${value}` }) }
</script>

<style>
.tab-preview .seller-shell { display: block; min-height: 0; }
.preview-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-light); background: var(--bg-primary); }
.preview-controls label { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
.preview-controls select { max-width: 160px; padding: 8px; border: 1px solid var(--border-light); border-radius: 8px; }
.preview-controls span { color: var(--text-secondary); font-size: 12px; }
.preview-requests { padding: 16px; font-size: 12px; overflow-wrap: anywhere; }
</style>
