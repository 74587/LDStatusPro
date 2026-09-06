/* global window, document, URL */
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import Toast from '@/components/common/Toast.vue'
import SellerLayout from '@/layouts/SellerLayout.vue'
import '@/styles/tokens.css'
import SellerNotifications from '@/views/SellerNotifications.vue'
import '@/styles/main.css'
import '@/styles/seller.css'
import './preview.css'
document.documentElement.classList.toggle('dark', new URL(window.location.href).searchParams.get('theme') === 'dark')
window.fetch = async () => { throw new Error('External requests disabled in notification preview') }
const scope = { [SellerLayout.__scopeId]: '' }
createApp({ render: () => h('div', { class: 'seller-shell preview-shell', ...scope }, h('main', { class: 'seller-main', ...scope }, [h(SellerNotifications), h(Toast)])) }).use(createPinia()).mount('#preview')
