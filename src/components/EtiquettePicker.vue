<script setup lang="ts">
import { DPE_COLORS, ETIQUETTES, type Etiquette } from '../api/dpe'

const model = defineModel<Etiquette[]>({ required: true })
defineProps<{ label?: string }>()

function toggle(e: Etiquette) {
  model.value = model.value.includes(e) ? model.value.filter((x) => x !== e) : [...model.value, e].sort()
}
</script>

<template>
  <div class="etiquettes" role="group" :aria-label="label">
    <button
      v-for="e in ETIQUETTES"
      :key="e"
      type="button"
      :aria-pressed="model.includes(e)"
      :aria-label="label ? `${label} ${e}` : e"
      :style="{ '--c': DPE_COLORS[e] }"
      @click="toggle(e)"
    >
      {{ e }}
    </button>
  </div>
</template>

<style scoped>
.etiquettes {
  display: flex;
  gap: 4px;
}
button {
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  border: 2px solid var(--c);
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  opacity: 0.55;
}
button[aria-pressed='true'] {
  background: var(--c);
  color: #1b1b1b;
  opacity: 1;
}
</style>
