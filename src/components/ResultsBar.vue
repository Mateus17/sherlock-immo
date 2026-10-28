<script setup lang="ts">
import { computed } from 'vue'
import { useCriteres } from '../composables/useCriteres'
import { useFavoris } from '../composables/useFavoris'
import { useLienPartage } from '../composables/useLienPartage'
import { useRecherche } from '../composables/useRecherche'
import { telechargerCsv } from '../lib/export-csv'

const emit = defineEmits<{ nouvelle: [] }>()

const { form } = useCriteres()
const { error, total, displayed, hiddenDuplicates, totalNeufs, hasMore, loading, more } = useRecherche()
const { lienCopie, partager } = useLienPartage()
const { liste: favoris } = useFavoris()
const n = (v: number) => v.toLocaleString('fr-FR')
// « (9 doublons masqués, dont 2 neufs) »
const precisions = computed(() =>
  [
    hiddenDuplicates.value ? `${n(hiddenDuplicates.value)} doublons masqués` : '',
    totalNeufs.value ? `dont ${n(totalNeufs.value)} neufs` : '',
  ]
    .filter(Boolean)
    .join(', '),
)
</script>

<template>
  <div class="summary">
    <button type="button" @click="emit('nouvelle')">← Nouvelle recherche</button>
    <span v-if="error" class="error" role="alert">Erreur : {{ error }}</span>
    <p v-else class="count" aria-live="polite">
      <strong>{{ n(total) }}</strong> DPE trouvés
      <span class="muted">
        · {{ n(displayed.length) }} affichés<template v-if="precisions"> ({{ precisions }})</template></span
      >
    </p>
    <span class="spacer"></span>
    <label class="check">
      <input v-model="form.unParAdresse" type="checkbox" />
      Un seul DPE par adresse<span class="long"> (le plus récent)</span>
    </label>
    <button type="button" :title="lienCopie ? '' : 'Copier le lien de cette recherche'" @click="partager">
      {{ lienCopie ? 'Lien copié ✓' : 'Partager' }}
    </button>
    <button v-if="hasMore" type="button" :disabled="loading" @click="more">Charger plus</button>
    <button type="button" class="csv" @click="telechargerCsv(displayed)">Exporter CSV</button>
    <a href="#favoris" class="favoris"
      >★ Favoris<template v-if="favoris.length"> ({{ favoris.length }})</template></a
    >
  </div>
</template>

<style scoped>
.summary {
  /* Place pour le bouton de thème fixé en haut à droite */
  padding-right: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.count {
  margin: 0;
}
.spacer {
  flex: 1;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.favoris {
  font-weight: 600;
  text-decoration: none;
  color: var(--accent-2);
}
.error {
  color: #c62828;
}
/* Téléphone : compteur sur sa ligne, actions regroupées dessous */
@media (max-width: 600px) {
  .summary {
    gap: 6px 10px;
  }
  .count {
    flex-basis: 100%;
    order: -1;
    padding-top: 2px;
  }
  .summary > button:first-child {
    order: -2;
  }
  .spacer,
  .long,
  .csv {
    display: none;
  }
}
</style>
