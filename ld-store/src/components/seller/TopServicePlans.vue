<template>
  <section aria-labelledby="promotion-plan-title" class="plans-section">
    <header><span class="step-label">第二步</span><h2 id="promotion-plan-title">选择展示范围</h2><p class="section-note">先看物品会在哪里展示，再选择推广时长。</p></header>
    <fieldset class="service-options" :disabled="disabled">
      <legend class="sr-only">推广服务</legend>
      <label v-for="group in packages" :key="group.type" class="service-option" :class="[group.type, { selected: selectedType === group.type, unavailable: !!reason(group), 'sold-out': availabilityState(group).kind === 'full' }]">
        <div class="service-heading"><span class="service-badge" :class="group.type">{{ group.name }}</span><input type="radio" name="promotion-service" :value="group.type" :checked="selectedType === group.type" :disabled="!!reason(group)" @change="$emit('service', group.type)" /></div>
        <strong class="service-placement">{{ placement(group.type) }}</strong>
        <p class="service-description">{{ group.type === 'category' ? '面向正在浏览本分类的买家' : product?.quota?.usesSharedGlobalPool ? '同时覆盖浏览“全部”分类的买家' : '在本分类的甄选区域优先展示' }}</p>
        <div class="service-price"><strong>{{ startPrice(group) }}</strong><span> LDC 起</span></div>
        <div v-if="reason(group)" class="availability-notice" :class="availabilityState(group).kind">
          <CircleSlash :size="18" aria-hidden="true" /><div><strong>{{ availabilityState(group).label }}</strong><span>{{ reason(group) }}</span></div>
        </div>
        <div v-else class="service-availability"><span><i aria-hidden="true"></i>剩余 <strong>{{ remaining(group.type) }}</strong> 个名额</span><span>含专属铭牌</span></div>
      </label>
    </fieldset>
    <p v-if="!packages.length" class="section-note">服务暂未开放，请稍后再来。</p>
  </section>
  <section aria-labelledby="promotion-duration-title" class="duration-section">
    <header><span class="step-label">第三步</span><h2 id="promotion-duration-title">选择推广时长</h2><p class="section-note">支付确认后连续计时，到期自动结束。</p></header>
    <fieldset v-if="selectedGroup" class="duration-options" :disabled="disabled">
      <legend class="sr-only">服务时长</legend>
      <label v-for="option in selectedGroup.options" :key="option.durationDays" class="duration-option" :class="{ selected: selectedDays === Number(option.durationDays), unavailable: !option.isEnabled }">
        <input type="radio" name="promotion-duration" :value="option.durationDays" :checked="selectedDays === Number(option.durationDays)" :disabled="!option.isEnabled || !!reason(selectedGroup)" @change="$emit('duration', Number(option.durationDays))" />
        <span class="duration-copy"><span class="duration-title"><strong>{{ option.durationDays }} <small>天</small></strong><span v-if="selectedDays === Number(option.durationDays)" class="chosen-label">已选择</span></span><span class="daily-price">{{ option.isEnabled ? `约 ${money(Number(option.price) / Number(option.durationDays))} LDC / 天` : '此时长暂未开放' }}</span></span>
        <span class="duration-total"><span>应付积分</span><span class="duration-price">{{ money(option.price) }} <small>LDC</small></span></span>
      </label>
    </fieldset>
    <p v-else class="duration-placeholder">选择上方服务后，即可查看对应时长和费用。</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { CircleSlash } from '@lucide/vue'
import { topServicePlacement } from '@/utils/topServiceOrder'
const props = defineProps({ packages: { type: Array, default: () => [] }, product: { type: Object, default: null }, selectedType: { type: String, default: '' }, selectedDays: { type: Number, default: 0 }, disabled: Boolean })
defineEmits(['service', 'duration'])
const selectedGroup = computed(() => props.packages.find(p => p.type === props.selectedType))
const money = value => Number(value || 0).toFixed(2)
function placement(type) { return topServicePlacement(type, props.product?.categoryName, props.product?.quota?.usesSharedGlobalPool) }
function remaining(type) { return Number(type === 'global' ? props.product?.quota?.globalRemaining : props.product?.quota?.categoryRemaining) }
function availabilityState(group) {
  if (!props.product) return { kind: 'waiting', label: '先选择物品', reason: '选择物品后查看可用名额' }
  if (props.product.currentTopOrder) return { kind: 'waiting', label: '已有服务订单', reason: '请先查看或处理已有订单' }
  if (Number.isFinite(remaining(group.type)) && remaining(group.type) <= 0) return { kind: 'full', label: '暂无空闲名额', reason: '名额释放后可购买，可刷新查看余量' }
  if (!group.options?.some(o => o.isEnabled)) return { kind: 'waiting', label: '服务暂未开放', reason: '当前没有可购买的时长方案' }
  if (!Number.isFinite(remaining(group.type))) return { kind: 'waiting', label: '名额待更新', reason: '请刷新名额后再选择' }
  return { kind: 'available', label: '', reason: '' }
}
function reason(group) { return availabilityState(group).reason }
function startPrice(group) { const values = (group.options || []).filter(o => o.isEnabled).map(o => Number(o.price)); return values.length ? money(Math.min(...values)) : '—' }
</script>

<style scoped>
.plans-section,.duration-section { padding-top:28px; margin-top:28px; border-top:1px solid var(--seller-border); }
.step-label { color:var(--seller-muted); font-size:12px; }
h2 { margin:5px 0 0; font-size:19px; color:var(--seller-ink); font-weight:650; }
.section-note { margin:8px 0 20px; color:var(--seller-muted); font-size:13px; line-height:1.7; }
fieldset { border:0; padding:0; margin:0; min-width:0; }
.service-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.service-option { --option-accent:var(--seller-jade-strong); --option-soft:var(--seller-jade-soft); display:flex; flex-direction:column; padding:20px; border:1px solid var(--seller-border); border-radius:14px; background:var(--seller-surface-strong); cursor:pointer; }
.service-option.global { --option-accent:var(--service-gold-ink); --option-soft:var(--service-gold-soft); }
.service-option.selected:not(.unavailable) { border-color:var(--option-accent); box-shadow:inset 0 0 0 1px var(--option-accent); background:color-mix(in srgb,var(--option-soft) 48%,var(--seller-surface-strong)); }
.service-option:has(input:focus-visible),.duration-option:has(input:focus-visible) { outline:3px solid var(--seller-jade); outline-offset:3px; }
.service-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; }
input { accent-color:var(--option-accent,var(--service-gold-ink)); width:18px; height:18px; flex:0 0 auto; }
.service-option input:focus-visible,.duration-option input:focus-visible { outline:0; }
.service-badge { display:inline-flex; align-items:center; padding:5px 9px; border-radius:6px; font-size:12px; font-weight:650; white-space:nowrap; }
.service-badge.global { background:var(--service-gold-soft); color:var(--service-gold-ink); }
.service-badge.category { background:var(--seller-jade-soft); color:var(--seller-jade-strong); }
.service-placement { display:block; margin:18px 0 8px; font-size:16px; color:var(--seller-ink); line-height:1.6; }
.service-description { flex:1; min-height:40px; margin:0 0 20px; font-size:13px; line-height:1.7; color:var(--seller-muted); }
.service-price { color:var(--seller-ink); font-variant-numeric:tabular-nums; }
.service-price strong { font-size:26px; font-weight:650; }
.service-price span { font-size:12px; color:var(--seller-muted); }
.service-availability { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; margin-top:16px; padding-top:14px; border-top:1px solid var(--seller-border); font-size:12px; color:var(--seller-muted); }
.service-availability>span:first-child { display:flex; align-items:center; gap:4px; }
.service-availability strong { color:var(--seller-ink); font-weight:650; }
.service-availability i { width:5px; height:5px; margin-right:3px; background:var(--seller-jade); border-radius:50%; }
.unavailable { cursor:not-allowed; }
.service-option.sold-out { border-color:color-mix(in srgb,var(--service-rose) 60%,var(--seller-border)); background:color-mix(in srgb,var(--service-rose-soft) 35%,var(--seller-surface)); }
.sold-out .service-price { color:var(--seller-muted); }
.availability-notice { display:flex; align-items:flex-start; gap:9px; margin:16px -8px -8px; padding:12px; border-radius:9px; color:var(--service-gold-ink); background:var(--service-gold-soft); }
.availability-notice.full { color:var(--service-rose-ink); background:var(--service-rose-soft); }
.availability-notice>svg { flex:0 0 auto; margin-top:2px; }
.availability-notice>div { display:grid; gap:5px; }
.availability-notice strong { font-size:14px; line-height:1.5; font-weight:650; }
.availability-notice span { font-size:12px; line-height:1.65; }
.duration-options { display:grid; grid-template-columns:minmax(0,1fr); gap:10px; }
.duration-option { display:grid; grid-template-columns:20px minmax(0,1fr) auto; gap:16px; align-items:center; min-height:90px; padding:16px 20px; border:1px solid var(--seller-border); border-radius:12px; cursor:pointer; color:var(--seller-ink); background:var(--seller-surface-strong); }
.duration-option.selected:not(.unavailable) { border-color:var(--service-gold-ink); box-shadow:inset 0 0 0 1px var(--service-gold-ink); background:color-mix(in srgb,var(--service-gold-soft) 40%,var(--seller-surface-strong)); }
.duration-copy { min-width:0; display:grid; gap:7px; }
.duration-title { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
.duration-title>strong { font-size:24px; font-weight:650; line-height:1.25; font-variant-numeric:tabular-nums; }
.duration-title small { font-size:13px; font-weight:500; }
.chosen-label { color:var(--service-gold-ink); font-size:11px; font-weight:600; }
.daily-price { font-size:12px; line-height:1.5; color:var(--seller-muted); font-variant-numeric:tabular-nums; }
.duration-total { display:grid; justify-items:end; gap:5px; white-space:nowrap; }
.duration-total>span:first-child { font-size:11px; color:var(--seller-muted); }
.duration-price { font-size:23px; font-weight:650; line-height:1.3; font-variant-numeric:tabular-nums; }
.duration-price small { font-size:12px; font-weight:400; }
.duration-option.unavailable { background:var(--seller-surface-muted); color:var(--seller-muted); }
.duration-placeholder { border:1px dashed var(--seller-border); padding:20px; border-radius:10px; font-size:13px; color:var(--seller-muted); line-height:1.7; }
@media(hover:hover) { .service-option:not(.unavailable):hover { border-color:var(--option-accent); } .duration-option:not(.unavailable):hover { border-color:var(--service-gold); } }
@media(max-width:640px) { .service-options { gap:10px; } .service-option { padding:15px 12px; } .service-placement { font-size:14px; min-height:45px; margin-top:14px; } .service-description { min-height:42px; margin-bottom:14px; font-size:12px; } .service-price strong { font-size:23px; } .service-availability { flex-direction:column; } .availability-notice { gap:6px; padding:10px 8px; } .availability-notice>svg { display:none; } .availability-notice strong { font-size:13px; } .duration-option { gap:12px; padding:15px 13px; min-height:88px; } .duration-price { font-size:21px; } .duration-title { gap:7px; } }
@media(prefers-reduced-motion:no-preference) { .service-option,.duration-option { transition:border-color .16s ease,background-color .16s ease; } }
</style>
