<script setup lang="ts">
import { computed, ref } from 'vue'
import { observatoireUrl, type Dpe } from '../api/dpe'
import { useFavoris } from '../composables/useFavoris'
import { copier } from '../lib/presse-papiers'
import DpeBadge from './DpeBadge.vue'

const props = defineProps<{ results: Dpe[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

type SortKey = 'date_etablissement_dpe' | 'etiquette_dpe' | 'surface_habitable_logement' | 'annee_construction' | 'adresse_ban'
const sortKey = ref<SortKey>('date_etablissement_dpe')
const sortDir = ref<1 | -1>(-1)

function sortBy(k: SortKey) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = k
    sortDir.value = k === 'date_etablissement_dpe' ? -1 : 1
  }
}

const sorted = computed(() => {
  const k = sortKey.value
  const dir = sortDir.value
  return [...props.results].sort((a, b) => {
    const va = a[k]
    const vb = b[k]
    if (va == null) return 1
    if (vb == null) return -1
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir
  })
})

const columns: { key: SortKey; label: string }[] = [
  { key: 'adresse_ban', label: 'Adresse' },
  { key: 'etiquette_dpe', label: 'DPE' },
  { key: 'surface_habitable_logement', label: 'Surface' },
  { key: 'annee_construction', label: 'Année' },
  { key: 'date_etablissement_dpe', label: 'Date DPE' },
]

function formatDate(s?: string) {
  return s ? new Date(s).toLocaleDateString('fr-FR') : '–'
}

const { estFavori, basculer } = useFavoris()

function copy(text?: string) {
  if (text) copier(text)
}
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th
            v-for="c in columns"
            :key="c.key"
            :class="{ sorted: sortKey === c.key }"
            :aria-sort="sortKey === c.key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'"
          >
            <button type="button" class="sort" @click="sortBy(c.key)">
              {{ c.label }}
              <span v-if="sortKey === c.key" aria-hidden="true">{{ sortDir === 1 ? '▲' : '▼' }}</span>
            </button>
          </th>
          <th>GES</th>
          <th><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="d in sorted"
          :key="d.numero_dpe"
          :class="{ selected: d.numero_dpe === selectedId }"
          @click="emit('select', d.numero_dpe)"
        >
          <td class="addr">
            <button type="button" class="open" :aria-current="d.numero_dpe === selectedId" @click.stop="emit('select', d.numero_dpe)">
              {{ d.adresse_ban ?? 'Adresse inconnue' }}
            </button>
            <small v-if="d.complement_adresse_logement || d.type_batiment">
              {{ d.type_batiment }}
              <template v-if="d.complement_adresse_logement"> · {{ d.complement_adresse_logement }}</template>
              <template v-if="d._geo_distance != null"> · {{ (d._geo_distance / 1000).toFixed(1) }} km</template>
            </small>
          </td>
          <td><DpeBadge :value="d.etiquette_dpe" /></td>
          <td class="num">{{ d.surface_habitable_logement != null ? `${d.surface_habitable_logement} m²` : '–' }}</td>
          <td class="num">{{ d.annee_construction ?? d.periode_construction ?? '–' }}</td>
          <td class="num">{{ formatDate(d.date_etablissement_dpe) }}</td>
          <td><DpeBadge :value="d.etiquette_ges" /></td>
          <td class="actions" @click.stop>
            <button
              type="button"
              class="star"
              :aria-pressed="estFavori(d.numero_dpe)"
              :title="estFavori(d.numero_dpe) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              :aria-label="`${estFavori(d.numero_dpe) ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${d.adresse_ban ?? 'logement'}`"
              @click="basculer(d)"
            >
              {{ estFavori(d.numero_dpe) ? '★' : '☆' }}
            </button>
            <button type="button" title="Copier l'adresse" :aria-label="`Copier l'adresse ${d.adresse_ban ?? ''}`" @click="copy(d.adresse_ban)">⧉</button>
            <a
              :href="observatoireUrl(d.numero_dpe)"
              target="_blank"
              rel="noopener"
              title="Voir le DPE officiel"
              :aria-label="`Voir le DPE officiel de ${d.adresse_ban ?? 'ce logement'} (nouvel onglet)`"
            >↗</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sort {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.open {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.open:hover {
  color: var(--accent);
}
.star[aria-pressed='true'] {
  color: var(--accent-2);
}
.table-wrap {
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}
th,
td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
th {
  position: sticky;
  top: 0;
  background: var(--surface);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: var(--muted);
}
th.sorted {
  color: var(--text);
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
tbody tr.selected {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}
.addr {
  white-space: normal;
  min-width: 220px;
}
.addr small {
  display: block;
  color: var(--muted);
}
.num {
  font-variant-numeric: tabular-nums;
}
.actions {
  display: flex;
  gap: 6px;
}
.actions button,
.actions a {
  border: 1px solid var(--border);
  background: none;
  border-radius: 6px;
  padding: 2px 8px;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}
</style>
