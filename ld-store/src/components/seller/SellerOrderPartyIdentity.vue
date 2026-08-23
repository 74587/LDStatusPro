<template>
  <span class="seller-order-party-identity">
    <span v-if="identity.nickname" class="seller-order-party-nickname">{{ identity.nickname }}</span>
    <a
      v-if="identity.profileUrl"
      :href="identity.profileUrl"
      class="seller-order-party-username"
      target="_blank"
      rel="noopener"
      :aria-label="`查看 @${identity.username} 的 Linux DO 个人主页`"
    >
      @{{ identity.username }}
    </a>
    <span v-else class="seller-order-party-unknown">未知</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { resolveOrderPartyIdentity } from '@/utils/orderPartyIdentity'

const props = defineProps({
  order: { type: Object, required: true },
  role: { type: String, default: 'buyer' }
})

const identity = computed(() => resolveOrderPartyIdentity(props.order, props.role))
</script>

<style scoped>
.seller-order-party-identity {
  min-width: 0;
  display: grid;
  justify-items: start;
  gap: 2px;
  line-height: 1.35;
}

.seller-order-party-nickname {
  max-width: 100%;
  color: var(--seller-ink);
  font-size: 13px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.seller-order-party-username {
  min-width: 24px;
  min-height: 24px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  color: var(--seller-muted);
  font-size: 12px;
  font-weight: 550;
  overflow-wrap: anywhere;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 45%, transparent);
  text-underline-offset: 3px;
}

.seller-order-party-username:hover {
  color: var(--seller-ink);
  text-decoration-color: currentColor;
}

.seller-order-party-username:focus-visible {
  outline: 2px solid var(--seller-jade);
  outline-offset: 2px;
  border-radius: 4px;
}

.seller-order-party-unknown {
  color: var(--seller-muted);
  font-size: 12px;
}
</style>
