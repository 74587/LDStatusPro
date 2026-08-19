<template>
  <div class="help-table-wrap" tabindex="0" :aria-label="label">
    <table class="help-table">
      <caption v-if="caption">{{ caption }}</caption>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="row.id || rowIndex">
          <td v-for="column in columns" :key="column.key" :data-label="column.label">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  caption: { type: String, default: '' },
  label: { type: String, default: '表格，可横向滚动查看' }
})
</script>
