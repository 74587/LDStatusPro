<template>
  <component :is="detailComponent" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OrderDetail from '@/views/OrderDetail.vue'
import BuyOrderDetail from '@/views/BuyOrderDetail.vue'

const route = useRoute()
const detailComponent = computed(() => route.query.source === 'service' ? BuyOrderDetail : OrderDetail)
</script>
