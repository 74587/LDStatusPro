/* global window */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import Preview from './TopServicePreview.vue'
import { resetScenario } from './api'
import '@/styles/main.css'
import '@/styles/seller.css'
window.fetch = async () => { throw new Error('Network disabled in isolated merchant service preview') }
const router = createRouter({ history: createWebHashHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }] })
const app = createApp(Preview).use(createPinia()).use(router)
await router.isReady()
resetScenario(router.currentRoute.value.query.scenario || 'default')
app.mount('#preview')
