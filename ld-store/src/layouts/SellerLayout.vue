<template>
  <div class="seller-shell">
    <a class="seller-skip-link" href="#seller-main">跳到主要内容</a>

    <div v-if="drawerOpen" class="seller-backdrop" aria-hidden="true" @click="closeDrawer"></div>

    <aside id="seller-navigation" class="seller-sidebar" :class="{ 'is-open': drawerOpen }" aria-label="卖家后台导航">
      <div class="seller-brand-row">
        <router-link to="/seller" class="seller-brand" @click="closeDrawer">
          <span class="seller-brand-mark"><Store :size="20" aria-hidden="true" /></span>
          <span>
            <strong>LD 士多</strong>
            <small>卖家工作台</small>
          </span>
        </router-link>
        <button ref="sidebarCloseButton" type="button" class="seller-icon-button sidebar-close" aria-label="关闭导航" @click="closeDrawer">
          <X :size="20" aria-hidden="true" />
        </button>
      </div>

      <nav class="seller-nav">
        <section v-for="group in navigation" :key="group.label" class="seller-nav-group">
          <h2>{{ group.label }}</h2>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="seller-nav-item"
            :class="{ active: isNavigationActive(item) }"
            @click="closeDrawer"
          >
            <component :is="item.icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <span v-if="item.badge?.value" class="seller-nav-badge" :aria-label="`${item.badge.value} 项待处理`">
              {{ formatBadge(item.badge.value) }}
            </span>
          </router-link>
        </section>
      </nav>

      <div class="seller-sidebar-footer">
        <router-link to="/" class="seller-market-link" @click="closeDrawer">
          <ArrowLeft :size="17" aria-hidden="true" />
          返回物品广场
        </router-link>
        <div class="seller-account">
          <router-link to="/user" class="seller-account-main" @click="closeDrawer">
            <AvatarImage
              :src="userStore.avatar"
              :candidates="userStore.avatarCandidates"
              :seed="userStore.username || 'seller'"
              :size="80"
              alt=""
              class="seller-avatar"
              loading-mode="eager"
            />
            <span>
              <strong>{{ displayName }}</strong>
              <small>查看个人中心</small>
            </span>
          </router-link>
          <button type="button" class="seller-icon-button logout-button" title="退出登录" aria-label="退出登录" @click="logout">
            <LogOut :size="18" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>

    <div class="seller-workspace">
      <header class="seller-topbar">
        <div class="seller-topbar-title">
          <button ref="mobileMenuButton" type="button" class="seller-icon-button mobile-menu" aria-controls="seller-navigation" :aria-expanded="drawerOpen" aria-label="打开导航" @click="openDrawer">
            <Menu :size="21" aria-hidden="true" />
          </button>
          <div>
            <p>卖家后台</p>
            <h1>{{ pageTitle }}</h1>
          </div>
        </div>

        <div class="seller-topbar-actions">
          <router-link to="/" class="seller-topbar-market">
            <ArrowLeft :size="16" aria-hidden="true" />
            <span>物品广场</span>
          </router-link>
          <ThemeToggle :show-arrow="false" />
          <router-link to="/user" class="seller-topbar-profile" aria-label="打开个人中心">
            <AvatarImage
              :src="userStore.avatar"
              :candidates="userStore.avatarCandidates"
              :seed="userStore.username || 'seller'"
              :size="72"
              alt=""
              class="seller-topbar-avatar"
              loading-mode="eager"
            />
          </router-link>
        </div>
      </header>

      <section v-if="restrictedMaintenance" class="seller-maintenance" role="status">
        <AlertTriangle :size="18" aria-hidden="true" />
        <div>
          <strong>{{ MAINTENANCE_STATE.title }}</strong>
          <p>{{ MAINTENANCE_STATE.message }}</p>
        </div>
      </section>

      <main id="seller-main" ref="sellerMain" class="seller-main" tabindex="-1">
        <div class="seller-view-stage">
          <router-view v-slot="{ Component, route: childRoute }">
            <transition name="seller-route">
              <component :is="Component" :key="resolveSellerViewKey(childRoute)" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Store,
  X
} from '@lucide/vue'
import { useUserStore } from '@/stores/user'
import { api } from '@/utils/api'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import AvatarImage from '@/components/common/AvatarImage.vue'
import { MAINTENANCE_STATE, isRestrictedMaintenanceMode } from '@/config/maintenance'
import { isSellerNavigationItemActive, resolveSellerViewKey } from '@/utils/sellerNavigation'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const drawerOpen = ref(false)
const mobileMenuButton = ref(null)
const sidebarCloseButton = ref(null)
const sellerMain = ref(null)
const pendingDeliveryCount = ref(0)
let unreadTimer = null

const displayName = computed(() => userStore.user?.name || userStore.username || '卖家')
const pageTitle = computed(() => String(route.meta.title || '卖家后台').split(' - ')[0])
const restrictedMaintenance = computed(() => isRestrictedMaintenanceMode())
const orderBadge = computed(() => ({ value: pendingDeliveryCount.value }))

const navigation = computed(() => [
  {
    label: '概览',
    items: [
      { label: '经营概览', to: '/seller', exact: true, activeRouteNames: ['SellerDashboard'], icon: LayoutDashboard }
    ]
  },
  {
    label: '交易',
    items: [
      { label: '订单管理', to: '/seller/orders', activeRouteNames: ['SellerOrders', 'SellerOrderDetail'], icon: ShoppingBag, badge: orderBadge.value }
    ]
  },
  {
    label: '商品',
    items: [
      { label: '我的物品', to: '/seller/products', activeRouteNames: ['SellerProducts', 'SellerEdit'], icon: Package },
      { label: '发布物品', to: '/seller/products/new', activeRouteNames: ['SellerPublish'], matchChildren: false, icon: PlusCircle }
    ]
  },
  {
    label: '经营',
    items: [
      { label: '优惠券管理', to: '/seller/coupons', activeRouteNames: ['SellerCoupons'], icon: BadgePercent },
      { label: '商家服务', to: '/seller/services', activeRouteNames: ['SellerServices'], icon: Sparkles },
      { label: '小店管理', to: '/seller/store', activeRouteNames: ['SellerStore'], icon: Store }
    ]
  },
  {
    label: '设置',
    items: [
      { label: '收款设置', to: '/seller/payment', activeRouteNames: ['SellerPayment'], icon: CreditCard }
    ]
  }
])

function isNavigationActive(item) {
  return isSellerNavigationItemActive(route, item)
}

function formatBadge(value) {
  return Number(value) > 99 ? '99+' : String(value)
}

function openDrawer() {
  drawerOpen.value = true
  nextTick(() => sidebarCloseButton.value?.focus())
}

function closeDrawer({ restoreFocus = false } = {}) {
  const wasOpen = drawerOpen.value
  drawerOpen.value = false
  if (wasOpen && restoreFocus) nextTick(() => mobileMenuButton.value?.focus())
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeDrawer({ restoreFocus: true })
}

async function updatePendingDelivery() {
  try {
    const result = await api.get('/api/shop/messages/unread-summary')
    if (result.success) pendingDeliveryCount.value = Number(result.data?.sellerPendingDeliveryCount || 0)
  } catch {
    // 导航徽标失败不影响后台主要功能。
  }
}

function logout() {
  userStore.logout()
  router.replace('/')
}

watch(() => route.path, async () => {
  closeDrawer()
  await nextTick()
  sellerMain.value?.focus({ preventScroll: true })
})
watch(drawerOpen, value => {
  document.body.style.overflow = value && window.innerWidth < 1024 ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  updatePendingDelivery()
  unreadTimer = window.setInterval(updatePendingDelivery, 60_000)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (unreadTimer) window.clearInterval(unreadTimer)
})
</script>

<style scoped>
.seller-shell {
  --seller-paper: #f4f1e8;
  --seller-bg: var(--seller-paper);
  --seller-surface: #fcfbf7;
  --seller-surface-soft: #eeebe2;
  --seller-surface-muted: #f5f2ea;
  --seller-surface-strong: #fffefa;
  --seller-navy: #10243e;
  --seller-navy-soft: #193451;
  --seller-ink: #1f2a34;
  --seller-muted: #68737c;
  --seller-jade: #718d7a;
  --seller-jade-strong: #5f7968;
  --seller-jade-soft: #e5ece5;
  --seller-border: #d8d2c7;
  --seller-border-strong: #c5beb1;
  --seller-success: #54745e;
  --seller-danger: #a5534d;
  --seller-warning: #a7773f;
  --seller-shadow-sm: 0 3px 12px rgba(31, 42, 52, 0.05);
  --seller-shadow-md: 0 18px 48px rgba(31, 42, 52, 0.08);
  --bg-primary: var(--seller-paper);
  --bg-secondary: var(--seller-surface-soft);
  --bg-tertiary: #e5e1d8;
  --bg-card: var(--seller-surface);
  --bg-card-hover: #ffffff;
  --text-primary: var(--seller-ink);
  --text-secondary: var(--seller-muted);
  --text-tertiary: #899198;
  --border-light: var(--seller-border);
  --border-medium: #c5beb1;
  --border-color: var(--seller-border);
  --color-primary: var(--seller-jade);
  --color-primary-hover: #5f7968;
  --color-primary-light: var(--seller-jade-soft);
  --input-bg: #efede6;
  --input-focus-bg: var(--seller-surface);
  --dropdown-bg: var(--seller-surface);
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  background: var(--seller-paper);
  color: var(--seller-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

html.dark .seller-shell {
  --seller-paper: #0d151d;
  --seller-bg: var(--seller-paper);
  --seller-surface: #16212a;
  --seller-surface-soft: #1c2933;
  --seller-surface-muted: #192630;
  --seller-surface-strong: #1b2832;
  --seller-navy: #0a1b2c;
  --seller-navy-soft: #122c42;
  --seller-ink: #e8e3d8;
  --seller-muted: #aab2b5;
  --seller-jade: #91b29a;
  --seller-jade-strong: #a4c4ac;
  --seller-jade-soft: #20382e;
  --seller-border: #2b3943;
  --seller-border-strong: #3a4a55;
  --seller-success: #a4c8ad;
  --seller-danger: #d4867f;
  --seller-warning: #d5a76f;
  --seller-shadow-sm: 0 3px 12px rgba(0, 0, 0, 0.18);
  --seller-shadow-md: 0 18px 48px rgba(0, 0, 0, 0.28);
  --bg-tertiary: #25343f;
  --bg-card-hover: #1b2933;
  --text-tertiary: #818d92;
  --border-medium: #3a4a55;
  --color-primary-hover: #a4c4ac;
  --input-bg: #1b2832;
}

.seller-skip-link {
  position: fixed;
  z-index: 2000;
  top: 12px;
  left: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--seller-surface);
  color: var(--seller-ink);
  transform: translateY(-150%);
  transition: transform 160ms ease;
}

.seller-skip-link:focus { transform: translateY(0); }

.seller-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  z-index: 60;
  display: flex;
  flex-direction: column;
  padding: 20px 16px 16px;
  overflow-y: auto;
  color: #e9edf0;
  background: var(--seller-navy);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
}

.seller-brand-row,
.seller-brand,
.seller-account,
.seller-account-main,
.seller-topbar,
.seller-topbar-title,
.seller-topbar-actions,
.seller-maintenance { display: flex; align-items: center; }

.seller-brand-row { justify-content: space-between; margin-bottom: 24px; }
.seller-brand { min-width: 0; gap: 11px; color: #fff; }
.seller-brand-mark { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.16); border-radius: 11px; background: rgba(255,255,255,.07); }
.seller-brand strong { display: block; font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, serif; font-size: 17px; letter-spacing: .05em; }
.seller-brand small { display: block; margin-top: 2px; color: rgba(233,237,240,.58); font-size: 11px; letter-spacing: .12em; }

.seller-icon-button { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 10px; color: inherit; transition: background 180ms ease, color 180ms ease; }
.seller-icon-button:hover { background: rgba(255,255,255,.08); }
.seller-icon-button:focus-visible,
.seller-nav-item:focus-visible,
.seller-market-link:focus-visible,
.seller-topbar-market:focus-visible,
.seller-topbar-profile:focus-visible { outline: 3px solid var(--seller-jade); outline-offset: 2px; }
.sidebar-close { display: none; }

.seller-nav { width: 100%; min-width: 0; display: grid; gap: 20px; }
.seller-nav-group { width: 100%; min-width: 0; }
.seller-nav-group h2 { margin: 0 0 7px 12px; color: rgba(233,237,240,.42); font-size: 11px; font-weight: 600; letter-spacing: .16em; }
.seller-nav-item { width: 100%; min-width: 0; min-height: 44px; justify-self: stretch; box-sizing: border-box; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: rgba(240,244,246,.76); font-size: 14px; line-height: 1; transition: background 180ms ease, color 180ms ease, transform 180ms ease; }
.seller-nav-item > svg { display: block; align-self: center; justify-self: center; }
.seller-nav-item > span:not(.seller-nav-badge) { min-width: 0; align-self: center; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seller-nav-item:hover { color: #fff; background: rgba(255,255,255,.06); transform: translateX(2px); }
.seller-nav-item.active { color: #fff; background: rgba(145,178,154,.18); box-shadow: inset 3px 0 0 var(--seller-jade); }
.seller-nav-badge { min-width: 22px; height: 22px; padding: 0 6px; display: grid; place-items: center; border-radius: 999px; background: #e8d4b8; color: #3d3021; font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }

.seller-sidebar-footer { margin-top: auto; padding-top: 20px; }
.seller-market-link { min-height: 44px; display: flex; align-items: center; gap: 8px; padding: 8px 10px; color: rgba(233,237,240,.7); font-size: 13px; }
.seller-market-link:hover { color: #fff; }
.seller-account { gap: 8px; margin-top: 10px; padding: 10px; border: 1px solid rgba(255,255,255,.09); border-radius: 13px; background: rgba(255,255,255,.04); }
.seller-account-main { min-width: 0; flex: 1; gap: 9px; color: #fff; }
.seller-avatar { width: 36px; height: 36px; border-radius: 10px; }
.seller-account-main span { min-width: 0; }
.seller-account-main strong,
.seller-account-main small { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.seller-account-main strong { font-size: 13px; }
.seller-account-main small { margin-top: 2px; color: rgba(233,237,240,.48); font-size: 11px; }
.logout-button { flex: 0 0 38px; width: 38px; height: 38px; color: rgba(255,255,255,.62); }
.logout-button:hover { color: #fff; background: rgba(165,83,77,.28); }

.seller-workspace { min-width: 0; }
.seller-topbar { position: sticky; top: 0; z-index: 40; justify-content: space-between; min-height: 72px; padding: 10px clamp(18px, 3vw, 38px); border-bottom: 1px solid color-mix(in srgb, var(--seller-border) 78%, transparent); background: color-mix(in srgb, var(--seller-paper) 90%, transparent); backdrop-filter: blur(14px); }
.seller-topbar-title { gap: 10px; }
.seller-topbar-title p { margin: 0 0 2px; color: var(--seller-jade); font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.seller-topbar-title h1 { margin: 0; color: var(--seller-ink); font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, serif; font-size: clamp(18px, 2vw, 22px); font-weight: 600; }
.seller-topbar-actions { gap: 8px; }
.seller-topbar-market { min-height: 44px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 1px solid var(--seller-border); border-radius: 10px; color: var(--seller-muted); font-size: 13px; background: var(--seller-surface); }
.seller-topbar-market:hover { color: var(--seller-ink); border-color: var(--seller-jade); }
.seller-topbar-profile { width: 44px; height: 44px; padding: 3px; border: 1px solid var(--seller-border); border-radius: 11px; background: var(--seller-surface); }
.seller-topbar-avatar { width: 100%; height: 100%; border-radius: 8px; }
.seller-topbar-actions :deep(.theme-btn) { width: 44px; height: 44px; }
.mobile-menu { display: none; color: var(--seller-ink); }

.seller-maintenance { gap: 10px; margin: 18px clamp(18px, 3vw, 38px) 0; padding: 13px 16px; border: 1px solid color-mix(in srgb, var(--seller-warning) 45%, var(--seller-border)); border-radius: 12px; color: var(--seller-warning); background: color-mix(in srgb, var(--seller-warning) 9%, var(--seller-surface)); }
.seller-maintenance p { margin: 2px 0 0; color: var(--seller-muted); font-size: 13px; }
.seller-main { width: min(100%, 1480px); margin: 0 auto; padding: clamp(20px, 3vw, 38px); outline: none; }
.seller-view-stage { min-height: calc(100dvh - 148px); display: grid; isolation: isolate; }
.seller-view-stage > * { min-width: 0; grid-area: 1 / 1; }
.seller-route-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.seller-route-leave-active { transition: opacity 120ms ease; }
.seller-route-enter-from { opacity: 0; transform: translateY(6px); }
.seller-route-leave-to { opacity: 0; }
.seller-backdrop { display: none; }

@media (max-width: 1023px) {
  .seller-shell { grid-template-columns: minmax(0, 1fr); }
  .seller-sidebar { position: fixed; left: 0; width: min(86vw, 288px); transform: translateX(-105%); box-shadow: none; transition: transform 220ms ease; }
  .seller-sidebar.is-open { transform: translateX(0); }
  .seller-backdrop { position: fixed; inset: 0; z-index: 50; display: block; background: rgba(7,15,23,.48); backdrop-filter: blur(2px); }
  .sidebar-close,
  .mobile-menu { display: grid; }
}

@media (max-width: 640px) {
  .seller-topbar { min-height: 64px; padding: 8px 14px; }
  .seller-topbar-market span { display: none; }
  .seller-topbar-market { width: 44px; padding: 0; justify-content: center; }
  .seller-topbar-title p { display: none; }
  .seller-main { padding: 18px 14px 32px; }
  .seller-view-stage { min-height: calc(100dvh - 114px); }
  .seller-maintenance { margin: 14px 14px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .seller-sidebar,
  .seller-nav-item,
  .seller-route-enter-active,
  .seller-route-leave-active { transition: none !important; }
}
</style>
