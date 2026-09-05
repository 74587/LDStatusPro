/* global window */
import { createApp, h } from 'vue'
import SellerLayout from '@/layouts/SellerLayout.vue'
import '@/styles/tokens.css'
import SellerNotifications from '@/views/SellerNotifications.vue'
import '@/styles/main.css'
import '@/styles/seller.css'
import './preview.css'
window.fetch = async () => { throw new Error('External requests disabled in notification preview') }
const scope = { [SellerLayout.__scopeId]: '' }
createApp({ render: () => h('div', { class: 'seller-shell preview-shell', ...scope }, h('main', { class: 'seller-main', ...scope }, h(SellerNotifications))) }).mount('#preview')
