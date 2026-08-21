<template>
  <fieldset class="purchase-limit-fieldset" :aria-describedby="descriptionId">
    <legend>购买限制</legend>

    <div v-if="sharedCdkEnabled" class="shared-limit-card">
      <span class="shared-limit-icon" aria-hidden="true"><LockKeyhole :size="19" /></span>
      <span class="shared-limit-copy">
        <strong>每位用户累计限购 1 件</strong>
        <small>共享卡密会重复发放同一内容，系统固定阻止同一账号再次购买。</small>
        <small class="restore-copy">切回独立卡密后恢复为：{{ configuredPolicyLabel }}</small>
      </span>
    </div>

    <div v-else class="purchase-limit-options">
      <div
        v-for="option in options"
        :key="option.mode"
        class="purchase-limit-option"
        :class="{ selected: mode === option.mode }"
        @click="selectMode(option.mode)"
      >
        <input
          :id="`${inputIdPrefix}-${option.mode}`"
          :name="radioName"
          type="radio"
          :value="option.mode"
          :checked="mode === option.mode"
          @click.stop
          @change="selectMode(option.mode)"
        />
        <label
          class="option-main"
          :for="`${inputIdPrefix}-${option.mode}`"
          @click.stop
        >
          <span class="option-icon" aria-hidden="true">
            <component :is="option.icon" :size="19" />
          </span>
          <span class="option-copy">
            <strong>{{ option.title }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </label>
        <span v-if="mode === option.mode && option.mode !== 'none'" class="option-quantity">
          <input
            ref="quantityInput"
            :id="quantityInputId"
            :value="quantity"
            type="number"
            inputmode="numeric"
            min="1"
            max="1000"
            step="1"
            :aria-label="`${option.title}件数`"
            :aria-invalid="Boolean(error)"
            :aria-describedby="error ? errorId : descriptionId"
            @click.stop
            @input="updateQuantity"
            @blur="$emit('blur')"
          />
          <span>{{ option.mode === 'per_order' ? '件 / 单' : '件 / 用户' }}</span>
        </span>
      </div>
    </div>

    <p :id="descriptionId" class="purchase-limit-help">
      <template v-if="sharedCdkEnabled">共享模式的限制由系统管理，卖家无需额外设置。</template>
      <template v-else-if="mode === 'per_user'">
        待支付订单会暂时占用额度；取消或过期后恢复。支付成功后永久计入，即使退款也不恢复。
      </template>
      <template v-else-if="mode === 'per_order'">只限制单笔订单数量，买家仍可再次下单。</template>
      <template v-else>买家仅受库存和平台单笔 1000 件上限约束。</template>
    </p>
    <p v-if="error && !sharedCdkEnabled" :id="errorId" class="purchase-limit-error" role="alert">{{ error }}</p>
  </fieldset>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Infinity as InfinityIcon, LockKeyhole, ReceiptText, Users } from '@lucide/vue'

const props = defineProps({
  mode: { type: String, default: 'none' },
  quantity: { type: [String, Number], default: '' },
  sharedCdkEnabled: { type: Boolean, default: false },
  inputIdPrefix: { type: String, default: 'purchase-limit' },
  error: { type: String, default: '' }
})

const emit = defineEmits(['update:mode', 'update:quantity', 'blur'])
const quantityInput = ref(null)

const options = [
  { mode: 'none', title: '不限制', description: '适合常规库存商品', icon: InfinityIcon },
  { mode: 'per_order', title: '每笔订单最多', description: '限制一次下单的购买数量', icon: ReceiptText },
  { mode: 'per_user', title: '每位用户累计最多', description: '阻止拆成多笔订单重复购买', icon: Users }
]

const radioName = computed(() => `${props.inputIdPrefix}-mode`)
const quantityInputId = computed(() => `${props.inputIdPrefix}-quantity`)
const descriptionId = computed(() => `${props.inputIdPrefix}-description`)
const errorId = computed(() => `${props.inputIdPrefix}-error`)
const configuredPolicyLabel = computed(() => {
  const value = Number(props.quantity || 0)
  if (props.mode === 'per_order' && value > 0) return `每笔订单最多 ${value} 件`
  if (props.mode === 'per_user' && value > 0) return `每位用户累计最多 ${value} 件`
  return '不限制'
})

async function selectMode(nextMode) {
  emit('update:mode', nextMode)
  if (nextMode !== 'none' && !String(props.quantity ?? '').trim()) {
    emit('update:quantity', 1)
  }
  if (nextMode !== 'none') {
    await nextTick()
    quantityInput.value?.[0]?.focus?.()
  }
}

function updateQuantity(event) {
  emit('update:quantity', event.target.value)
}

watch(
  () => props.sharedCdkEnabled,
  enabled => {
    const value = Number(props.quantity)
    if (enabled && props.mode !== 'none' && (!Number.isInteger(value) || value < 1 || value > 1000)) {
      emit('update:quantity', 1)
    }
  }
)

function focus() {
  quantityInput.value?.[0]?.focus?.()
}

function scrollIntoView(options) {
  quantityInput.value?.[0]?.scrollIntoView?.(options)
}

defineExpose({ focus, scrollIntoView })
</script>

<style scoped>
.purchase-limit-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.purchase-limit-options {
  display: grid;
  gap: 8px;
}

.purchase-limit-option {
  min-height: 58px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-medium);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.purchase-limit-option:hover {
  border-color: var(--color-primary);
  background: var(--bg-card-hover);
}

.purchase-limit-option.selected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary-light) 68%, var(--bg-card));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 24%, transparent);
}

.purchase-limit-option:focus-within {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 60%, transparent);
  outline-offset: 2px;
}

.purchase-limit-option > input[type='radio'] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-primary-hover);
}

.option-main {
  min-width: 0;
  min-height: 38px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.option-icon,
.shared-limit-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--color-primary-hover);
  background: var(--color-primary-light);
}

.option-copy,
.shared-limit-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.option-copy strong,
.shared-limit-copy strong {
  font-size: 14px;
  line-height: 1.35;
}

.option-copy small,
.shared-limit-copy small {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.option-quantity {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.option-quantity input {
  width: 76px;
  min-height: 38px;
  padding: 7px 9px;
  border: 1px solid var(--border-medium);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font: inherit;
}

.option-quantity input[aria-invalid='true'] {
  border-color: var(--color-danger);
}

.shared-limit-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 11px;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--color-info) 42%, var(--border-medium));
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-info-bg) 58%, var(--bg-card));
}

.restore-copy {
  margin-top: 3px;
  color: var(--color-info) !important;
  font-weight: 600;
}

.purchase-limit-help,
.purchase-limit-error {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.55;
}

.purchase-limit-help {
  color: var(--text-secondary);
}

.purchase-limit-error {
  color: var(--color-danger);
}

@media (max-width: 560px) {
  .purchase-limit-option {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .option-quantity {
    grid-column: 2;
    justify-self: stretch;
  }

  .option-quantity input {
    flex: 1;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .purchase-limit-option {
    transition: none;
  }
}
</style>
