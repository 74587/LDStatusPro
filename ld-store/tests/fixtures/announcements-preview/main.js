import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory, RouterView } from 'vue-router'
import Announcements from '../../../src/views/Announcements.vue'
import AnnouncementBar from '../../../src/components/common/AnnouncementBar.vue'
import AnnouncementPopup from '../../../src/components/common/AnnouncementPopup.vue'
import { useAnnouncement } from '../../../src/composables/useAnnouncement'
import { useUserStore } from '../../../src/stores/user'
import '../../../src/styles/tokens.css'
import '../../../src/styles/main.css'
const item = { id: 11, title: '普通物品 72 小时发货保障规则已上线', content: '## 发货保障\n请在付款后 **72 小时内** 完成发货。\n\n- 保留履约记录\n- 及时处理售后\n\n[查看规则](/docs/shipping-deadline)\n\n| 项目 | 说明 |\n|---|---|\n| 发货 | 72 小时内 |', summary: '了解发货时限、退款与卖家责任。', mode: 'popup', type: 'info', contentType: 'markdown', publicationStatus: 'published', enabled: true, status: 'active', audience: 'all', placements: ['storefront'], contentVersion: 1, reminderVersion: 1, revision: 1, sortOrder: 0, startsAt: Date.now()-86400000, expiresAt: Date.now()+86400000, createdAt: Date.now()-86400000, popupDismissKey:'popup-preview', actionLabel:'查看发货规则',actionUrl:'/docs/shipping-deadline',requiresAcknowledgement:true }
// Fixtures never contact any API or telemetry service.
globalThis.fetch=async () => new globalThis.Response(JSON.stringify({ success:true,data:{items:[item,{...item,id:12,mode:'banner',summary:'收藏士多官网，随时回来看看。'}],item,pagination:{page:1,pageSize:20,total:2,totalPages:1},timestamp:Date.now()}}),{headers:{'content-type':'application/json'}})
const router=createRouter({history:createWebHistory(),routes:[{path:'/',name:'Home',component:{render:()=>h('main',{},'士多首页 · 隔离预览')}},{path:'/announcements',component:Announcements},{path:'/announcements/:id',component:Announcements}]})
const app=createApp({setup(){useUserStore().sessionReady=true;useAnnouncement().startAnnouncements();return ()=>h('div',[h('button',{onClick:()=>{globalThis.sessionStorage.clear();globalThis.localStorage.clear();globalThis.location.reload()}},'重置隔离预览'),h('button',{onClick:()=>globalThis.document.documentElement.classList.toggle('dark')},'切换预览主题'),h(AnnouncementBar),h(AnnouncementPopup),h(RouterView)])}})
app.use(createPinia()).use(router).mount('#app')
