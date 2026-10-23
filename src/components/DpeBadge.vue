<script setup lang="ts">
import { DPE_COLORS, type Etiquette } from '../api/dpe'

defineProps<{ value?: Etiquette }>()
</script>

<template>
  <span v-if="value" class="badge" :style="{ background: DPE_COLORS[value] }">{{ value }}</span>
  <span v-else class="muted">–</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  width: 1.6em;
  line-height: 1.6em;
  text-align: center;
  border-radius: 4px;
  font-weight: 700;
  color: #1b1b1b;
}
</style>
