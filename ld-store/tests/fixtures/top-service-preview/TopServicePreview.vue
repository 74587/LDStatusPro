<template>
  <header class="preview-controls"><strong>商家服务 · 本地验收</strong><label>状态场景<select :value="scenario" @change="changeScenario($event.target.value)"><option v-for="item in scenarios" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label><label><input v-model="dark" type="checkbox" />深色模式</label><span>模拟接口 · 真实支付已禁用</span></header>
  <div class="seller-shell preview-shell" v-bind="scope">
    <aside class="preview-nav"><strong>LD 士多</strong><span>卖家管理</span><p>经营概览</p><p>我的物品</p><p>订单管理</p><p class="active">商家服务</p></aside>
    <div class="seller-workspace" v-bind="scope">
      <header class="seller-topbar" v-bind="scope">
        <div class="seller-topbar-title" v-bind="scope"><div v-bind="scope"><p v-bind="scope">卖家后台</p><h1 v-bind="scope">商家服务</h1></div></div>
        <div class="seller-topbar-actions" v-bind="scope"><a href="#/seller/services" class="seller-topbar-market" v-bind="scope">物品广场</a></div>
      </header>
      <main class="seller-main preview-main" v-bind="scope"><div class="seller-view-stage" v-bind="scope"><MerchantServices :key="revision" /></div></main>
    </div>
  </div>
  <Dialog />
</template>
<script setup>
/* global document */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SellerLayout from '@/layouts/SellerLayout.vue'
import MerchantServices from '@/views/MerchantServices.vue'
import Dialog from '@/components/common/Dialog.vue'
import { scenario, resetScenario } from './api'
const router = useRouter()
const scope = { [SellerLayout.__scopeId]: '' }
const dark = ref(false)
const revision = ref(0)
const scenarios = [['default','正常购买'],['legacy-images','旧接口图片兼容'],['pending','待支付'],['paid','服务生效'],['mismatch','分类变更暂停'],['full','名额已满'],['unavailable','服务未开放'],['options-error','加载失败'],['empty','无物品'],['expired','支付超时'],['refund','退款待核验'],['create-timeout','创建超时恢复'],['price-change','下单价格变化'],['cancel-race','取消与付款竞态'],['history','26 条购买记录']]
watch(dark, value => document.documentElement.classList.toggle('dark', value))
async function changeScenario(value) { resetScenario(value); await router.replace({ path: '/seller/services', query: { tab: 'service', scenario: value } }); revision.value++ }
</script>
<style>
.preview-controls { display:flex; align-items:center; flex-wrap:wrap; gap:14px; padding:10px 16px; background:var(--bg-primary); color:var(--text-primary); border-bottom:1px solid var(--border-light); font-size:12px; }
.preview-controls label { display:flex; align-items:center; gap:8px; }
.preview-controls select { padding:8px; background:var(--bg-card); border:1px solid var(--border-medium); border-radius:6px; }
.preview-controls span { color:var(--text-secondary); }
.preview-shell.seller-shell { display:grid; grid-template-columns:220px minmax(0,1fr); }
.preview-nav { background:var(--seller-navy); color:#c6d1dc; padding:30px 22px; }
.preview-nav>strong { display:block; color:#fff; font-size:24px; }
.preview-nav>span { display:block; margin:10px 0 40px; font-size:12px; }
.preview-nav p { padding:14px; margin:6px -8px; font-size:14px; }
.preview-nav p.active { color:#fff; background:#ffffff16; border-left:3px solid var(--seller-jade); }
.preview-main { min-width:0; padding:30px!important; }
@media(max-width:1100px) { .preview-shell.seller-shell { grid-template-columns:1fr; } .preview-nav { display:none; } }
@media(max-width:767px) { .preview-main { padding:20px 16px!important; } .preview-controls>strong,.preview-controls>span { display:none; } }
</style>
