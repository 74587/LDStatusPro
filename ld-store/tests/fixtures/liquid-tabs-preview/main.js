/* global window */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import Preview from './LiquidTabsPreview.vue'
import '@/styles/main.css'
import '@/styles/seller.css'
window.fetch = async () => { throw new Error('Network disabled in isolated Tab preview') }
const router = createRouter({ history: createWebHashHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }] })
createApp(Preview).use(createPinia()).use(router).mount('#preview')
