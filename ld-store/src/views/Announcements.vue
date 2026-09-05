<script setup>
import { announcementImpression as vAnnouncementImpression, trackAnnouncement } from '@/utils/announcementTelemetry'
import { computed, ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Megaphone, ArrowLeft, ArrowRight, Copy } from '@lucide/vue'
import { fetchAnnouncementCenter, fetchAnnouncementDetail, acknowledgeAnnouncement } from '@/services/announcementService'
import AnnouncementContent from '@/components/common/AnnouncementContent.vue'
import { announcementIdentity } from '@/utils/announcementPreferences'
import { useUserStore } from '@/stores/user'
const route = useRoute(), userStore = useUserStore()
const items = ref([]), item = ref(null), page = ref(1), pages = ref(1), total = ref(0), search = ref(''), status = ref('')
const loading = ref(false), error = ref(''), feedback = ref(''), acknowledging = ref(false), acknowledged = ref(false)
const detail = computed(() => Boolean(route.params.id))
let controller = null, sequence = 0
const date = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : ''
async function load(target = 1) {
  const ticket = ++sequence; controller?.abort(); controller = new AbortController()
  loading.value = true; error.value = ''; feedback.value = ''; acknowledged.value = false
  try {
    const result = detail.value ? await fetchAnnouncementDetail(String(route.params.id), controller.signal) : await fetchAnnouncementCenter({ page: target, search: search.value, status: status.value }, controller.signal)
    if (ticket !== sequence) return
    if (!result.success) throw new Error(typeof result.error === 'string' ? result.error : '公告加载失败')
    if (detail.value) { item.value = result.data.item; acknowledged.value = Boolean(item.value.acknowledged) }
    else { items.value = result.data.items; page.value = target; pages.value = result.data.pagination.totalPages || 1; total.value = result.data.pagination.total }
  } catch (err) { if (ticket === sequence) { error.value = err.message; item.value = null } }
  finally { if (ticket === sequence) loading.value = false }
}
async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); feedback.value = '链接已复制' } catch { feedback.value = '复制失败，可以复制浏览器地址' } }
async function acknowledge() {
  const ticket = sequence, current = item.value
  acknowledging.value = true
  try {
    const result = await acknowledgeAnnouncement(current.id, current.contentVersion)
    if (ticket !== sequence) return
    if (result.success) { acknowledged.value = true; feedback.value = '已记录本版本的知悉确认' }
    else feedback.value = result.error || '确认失败，请重试'
  } catch { if (ticket === sequence) feedback.value = '确认失败，请重试' }
  finally { acknowledging.value = false }
}

watch([() => route.params.id, () => announcementIdentity(userStore)], () => { items.value = []; item.value = null; void load() }, { immediate: true })
onUnmounted(() => { sequence++; controller?.abort() })
</script>
<template>
  <main class="announcements-page">
    <router-link :to="detail ? '/announcements' : '/'" class="announcement-back"><ArrowLeft :size="16" aria-hidden="true" />{{ detail ? '全部公告' : '返回物品广场' }}</router-link>
    <header v-if="!detail" class="announcement-heading"><span class="announcement-eyebrow"><Megaphone :size="18" aria-hidden="true" />LD 士多</span><h1>公告中心</h1><p>平台动态与规则，随时回来查阅。</p></header>
    <form v-if="!detail" class="announcement-filters" @submit.prevent="load(1)"><label>搜索公告<input v-model.trim="search" maxlength="200" placeholder="标题或正文关键词"></label><label>时间范围<select v-model="status" @change="load(1)"><option value="">全部公告</option><option value="active">当前公告</option><option value="expired">历史公告</option></select></label><button class="announcement-button" type="submit">查询</button></form>
    <p v-if="loading" role="status">正在加载公告…</p>
    <div v-if="error" class="announcement-error" role="alert">{{ error }}<button class="announcement-button secondary" @click="load(page)">重试</button></div>
    <template v-else-if="detail && item">
      <article class="announcement-document"><header v-announcement-impression="{item,event:'open',placement:'detail'}"><span class="announcement-eyebrow">{{ item.status === 'expired' ? '历史公告 · 已结束' : '站内公告' }}</span><h1>{{ item.title || '站内公告' }}</h1><p class="announcement-meta">{{ date(item.publishedAt || item.createdAt) }} · 北京时间<span v-if="item.contentVersion"> · 版本 {{ item.contentVersion }}</span></p></header><AnnouncementContent :content="item.content" :content-type="item.contentType" /><footer><a v-if="item.actionUrl" @click="trackAnnouncement(item, 'action', 'detail')" class="announcement-button" :href="item.actionUrl" :target="item.actionUrl.startsWith('/') ? undefined : '_blank'" rel="noopener noreferrer">{{ item.actionLabel }}<ArrowRight :size="16" aria-hidden="true" /></a><button class="announcement-button secondary" @click="copyLink"><Copy :size="16" aria-hidden="true" />复制链接</button><template v-if="item.requiresAcknowledgement"><button v-if="userStore.isLoggedIn" class="announcement-button secondary" :disabled="acknowledging || acknowledged" @click="acknowledge">{{ acknowledged ? '已知悉本版本' : acknowledging ? '正在记录…' : '我已阅读并知悉' }}</button><router-link v-else to="/login" class="announcement-back">登录后可记录知悉确认</router-link></template></footer></article>
    </template>
    <template v-else-if="!detail">
      <p v-if="!loading && !items.length" class="announcement-empty">暂无符合条件的公告，可调整关键词或时间范围。</p>
      <div class="announcement-list"><router-link v-for="entry in items" :key="entry.id" :to="`/announcements/${entry.id}`" v-announcement-impression="{item:entry,placement:'center'}" class="announcement-list-item"><div><span class="announcement-eyebrow">{{ entry.status === 'expired' ? '已结束' : '当前公告' }}</span><h2>{{ entry.title || '站内公告' }}</h2><p>{{ entry.summary || '查看公告详情' }}</p><time>{{ date(entry.publishedAt || entry.createdAt) }}</time></div><ArrowRight :size="20" aria-hidden="true" /></router-link></div>
      <nav v-if="total" class="announcement-pagination" aria-label="公告分页"><button class="announcement-button secondary" :disabled="page <= 1 || loading" @click="load(page - 1)">上一页</button><span>{{ page }} / {{ pages }} · {{ total }} 条</span><button class="announcement-button secondary" :disabled="page >= pages || loading" @click="load(page + 1)">下一页</button></nav>
    </template>
    <p v-if="feedback" role="status">{{ feedback }}</p>
  </main>
</template>
<style scoped>
.announcements-page{width:min(calc(100% - 32px),900px);margin:var(--space-8) auto;padding-bottom:100px;color:var(--text-primary-semantic)}.announcement-back{display:inline-flex;align-items:center;gap:var(--space-2);min-height:44px;color:var(--text-link);text-decoration:none}.announcement-heading{padding:var(--space-8) 0}.announcement-eyebrow{display:inline-flex;gap:var(--space-2);align-items:center;font-size:var(--text-size-sm);color:var(--text-secondary-semantic)}h1{font-family:var(--font-serif);font-size:clamp(24px,4vw,34px);line-height:1.45;overflow-wrap:anywhere;margin:var(--space-3) 0}.announcement-heading p,.announcement-meta{color:var(--text-secondary-semantic);line-height:1.6}.announcement-filters{display:flex;gap:var(--space-3);align-items:end;margin-bottom:var(--space-6)}.announcement-filters label{display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--text-size-sm)}.announcement-filters label:first-child{flex:1}.announcement-filters input,.announcement-filters select{min-height:44px;min-width:0;padding:var(--space-2) var(--space-3);border:1px solid var(--border-default-semantic);background:var(--surface-card);color:inherit;border-radius:var(--radius-sm)}.announcement-button{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;padding:var(--space-2) var(--space-4);border:1px solid transparent;border-radius:var(--radius-sm);background:var(--action-primary);color:var(--action-primary-text);text-decoration:none;cursor:pointer}.announcement-button.secondary{background:var(--action-secondary);color:var(--action-secondary-text);border-color:var(--border-default-semantic)}.announcement-button:disabled{opacity:.5;cursor:default}.announcement-list{border:1px solid var(--border-default-semantic);border-radius:var(--radius-lg);background:var(--surface-card);overflow:hidden}.announcement-list:empty{display:none}.announcement-list-item{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-6);color:inherit;text-decoration:none;border-bottom:1px solid var(--border-default-semantic)}.announcement-list-item:last-child{border-bottom:0}.announcement-list-item>div{min-width:0}.announcement-list-item h2{font-size:var(--text-size-lg);line-height:1.5;overflow-wrap:anywhere;margin:var(--space-2) 0}.announcement-list-item p{overflow-wrap:anywhere;line-height:1.6;color:var(--text-secondary-semantic)}.announcement-list-item time{font-size:var(--text-size-xs);color:var(--text-muted-semantic)}.announcement-document{padding:var(--space-8);background:var(--surface-card);border:1px solid var(--border-default-semantic);border-radius:var(--radius-lg)}.announcement-document header{margin-bottom:var(--space-8);padding-bottom:var(--space-4);border-bottom:1px solid var(--border-default-semantic)}.announcement-document footer{display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-8);padding-top:var(--space-6);border-top:1px solid var(--border-default-semantic)}.announcement-pagination{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:var(--space-6);font-size:var(--text-size-sm)}.announcement-error,.announcement-empty{padding:var(--space-6);line-height:1.7}.announcement-error{color:var(--status-danger)}@media(max-width:600px){.announcement-filters{flex-wrap:wrap}.announcement-filters label:first-child{flex-basis:100%}.announcement-document{padding:var(--space-5)}.announcement-list-item{padding:var(--space-5)}}
</style>
