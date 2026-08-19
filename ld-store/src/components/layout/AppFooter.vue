<template>
  <nav class="app-footer" v-if="showFooter">
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      :class="['nav-item', { active: isActive(item.path) }]"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

// 是否显示底部导航（仅移动端）
const showFooter = computed(() => {
  // 某些页面不显示底部导航
  const hideOnRoutes = ['Login', 'AuthCallback', 'ProductDetail', 'OrderConfirm', 'Publish', 'Edit', 'OrderDetail', 'Docs', 'DocsSection']
  return !hideOnRoutes.includes(route.name)
})

// 导航项
const navItems = computed(() => {
  const items = [
    { path: '/', icon: '🏪', label: '首页' },
    { path: '/search', icon: '🔍', label: '搜索' }
  ]
  
  if (userStore.isLoggedIn) {
    items.push(
      { path: '/user/orders', icon: '📋', label: '订单' },
      { path: '/user', icon: '👤', label: '我的' }
    )
  } else {
    items.push(
      { path: '/login', icon: '🔐', label: '登录' }
    )
  }
  
  return items
})

// 判断是否为当前路由
function isActive(path) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.app-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: none;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-light);
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-icon {
  font-size: 22px;
  margin-bottom: 2px;
  opacity: 0.6;
  transition: all 0.2s;
}

.nav-label {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: color 0.2s;
}

.nav-item.active .nav-icon {
  opacity: 1;
  transform: scale(1.1);
}

.nav-item.active .nav-label {
  color: var(--color-primary);
  font-weight: 600;
}

/* 仅在移动端显示底部导航 */
@media (max-width: 768px) {
  .app-footer {
    display: flex;
  }
}
</style>
