<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nearbyCommunes, type Commune, type NearbyCommune } from '../api/geo'

const props = defineProps<{ center: Commune }>()
const selected = defineModel<Commune[]>({ required: true })
const radiusKm = defineModel<number>('radiusKm', { required: true })

const list = ref<NearbyCommune[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const open = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

watch(
  () => [props.center.code, radiusKm.value] as const,
  () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const id = ++requestId
      loading.value = true
      error.value = null
      try {
        const found = await nearbyCommunes(props.center, radiusKm.value)
        if (id === requestId) list.value = found
      } catch (e) {
        if (id === requestId) error.value = (e as Error).message
      } finally {
        if (id === requestId) loading.value = false
      }
    }, 250)
  },
  { immediate: true },
)

const selectedCodes = computed(() => new Set(selected.value.map((c) => c.code)))
const checkedCount = computed(() => list.value.filter((c) => selectedCodes.value.has(c.code)).length)

function strip(c: NearbyCommune): Commune {
  const { distanceKm: _d, population: _p, ...commune } = c
  return commune
}

function toggle(c: NearbyCommune) {
  selected.value = selectedCodes.value.has(c.code)
    ? selected.value.filter((s) => s.code !== c.code)
    : [...selected.value, strip(c)]
}

function checkAll() {
  const missing = list.value.filter((c) => !selectedCodes.value.has(c.code)).map(strip)
  selected.value = [...selected.value, ...missing]
}

function uncheckAll() {
  const nearby = new Set(list.value.map((c) => c.code))
  selected.value = selected.value.filter((s) => !nearby.has(s.code))
}
</script>

<template>
  <div class="nearby">
    <button type="button" class="toggle" :aria-expanded="open" @click="open = !open">
      <span>{{ open ? '▾' : '▸' }} Communes autour de {{ center.nom }}</span>
      <small class="muted">{{ checkedCount }}/{{ list.length }} cochées</small>
    </button>

    <template v-if="open">
      <div class="range">
        <input v-model.number="radiusKm" type="range" min="2" max="30" step="1" />
        <output>{{ radiusKm }} km</output>
      </div>

      <div class="bulk">
        <button type="button" :disabled="!list.length" @click="checkAll">Tout cocher</button>
        <button type="button" :disabled="!checkedCount" @click="uncheckAll">Tout décocher</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading && !list.length" class="muted">Chargement…</p>
      <p v-else-if="!list.length" class="muted">Aucune commune dans ce rayon.</p>

      <ul v-else :class="{ stale: loading }">
        <li v-for="c in list" :key="c.code">
          <label :title="c.population ? `${c.population.toLocaleString('fr-FR')} habitants` : undefined">
            <input type="checkbox" :checked="selectedCodes.has(c.code)" @change="toggle(c)" />
            <span class="name">{{ c.nom }}</span>
            <small class="muted">{{ c.distanceKm.toFixed(1).replace('.', ',') }} km</small>
          </label>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.nearby {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.toggle {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  font-weight: 600;
  text-align: left;
}
.range {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range input {
  flex: 1;
}
.range output {
  min-width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.bulk {
  display: flex;
  gap: 6px;
}
.bulk button {
  flex: 1;
  padding: 4px 8px;
  font-size: 0.85em;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow-y: auto;
}
ul.stale {
  opacity: 0.5;
}
label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 0;
  cursor: pointer;
}
.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
small {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
p {
  margin: 0;
  font-size: 0.9em;
}
.error {
  color: #c62828;
}
</style>
