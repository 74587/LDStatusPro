<script setup>
import { useRoute } from 'vue-router'
import { announcementImpression as vAnnouncementImpression } from '@/utils/announcementTelemetry'
import { computed } from 'vue'
import { Megaphone, ArrowRight } from '@lucide/vue'
import { useAnnouncement } from '@/composables/useAnnouncement'
const route = useRoute()
const { announcementItems } = useAnnouncement()
const banner = computed(() => announcementItems.value.find(item => item.mode === 'banner'))
</script>
<template><section v-if="banner" v-announcement-impression="{item:banner,placement:route.meta.layout === 'seller' ? 'seller' : 'storefront'}" class="announcement-bar" aria-label="站内公告"><Megaphone :size="18" aria-hidden="true" /><p>{{ banner.summary || banner.content }}</p><router-link :to="`/announcements/${banner.id}`">查看详情<ArrowRight :size="16" aria-hidden="true" /></router-link></section></template>
<style scoped>
.announcement-bar{display:flex;align-items:center;gap:var(--space-3);width:min(calc(100% - 24px),1180px);margin:var(--space-3) auto 0;padding:var(--space-2) var(--space-4);border:1px solid var(--border-default-semantic);border-radius:var(--radius-md);background:var(--surface-subtle);color:var(--text-primary-semantic)}.announcement-bar>svg{flex-shrink:0}.announcement-bar p{margin:0;line-height:1.6;font-size:var(--text-size-sm);overflow-wrap:anywhere;flex:1;min-width:0}.announcement-bar a{display:inline-flex;align-items:center;gap:var(--space-1);min-height:44px;white-space:nowrap;color:var(--text-link);font-size:var(--text-size-sm);text-decoration:underline}@media(max-width:600px){.announcement-bar{gap:var(--space-2);padding:var(--space-2) var(--space-3)}}
</style>
