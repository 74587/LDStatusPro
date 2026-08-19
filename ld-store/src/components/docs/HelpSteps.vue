<template>
  <ol class="help-steps">
    <li v-for="(step, index) in steps" :key="step.title">
      <span class="help-steps__number">{{ index + 1 }}</span>
      <div>
        <h3>{{ step.title }}</h3>
        <p>{{ step.description }}</p>
        <p v-if="step.result" class="help-steps__result">完成后：{{ step.result }}</p>
      </div>
    </li>
  </ol>
</template>

<script setup>
defineProps({
  steps: { type: Array, required: true }
})
</script>
