<script setup lang="ts">
import { useCriteres } from '../composables/useCriteres'
import { useLienPartage } from '../composables/useLienPartage'
import { useRecherche } from '../composables/useRecherche'
import { telechargerCsv } from '../lib/export-csv'

const emit = defineEmits<{ nouvelle: [] }>()

const { form } = useCriteres()
const { error, total, displayed, hiddenDuplicates, totalNeufs, hasMore, loading, more } = useRecherche()
const { lienCopie, partager } = useLienPartage()
const n = (v: number) => v.toLocaleString('fr-FR')
</script>

<template>
  <div class="summary">
    <button type="button" @click="emit('nouvelle')">← Nouvelle recherche</button>
    <span v-if="error" class="error" role="alert">Erreur : {{ error }}</span>
    <p v-else class="count" aria-live="polite">
      <strong>{{ n(total) }}</strong> DPE trouvés
      <span class="muted">· {{ n(displayed.length) }} affichés</span>
      <span v-if="hiddenDuplicates" class="muted">({{ hiddenDuplicates }} doublons masqués)</span>
      <span v-if="totalNeufs" class="muted">(dont {{ n(totalNeufs) }} neufs)</span>
    </p>
    <span class="spacer"></span>
    <label class="check">
      <input v-model="form.unParAdresse" type="checkbox" />
      Un seul DPE par adresse (le plus récent)
    </label>
    <button type="button" :title="lienCopie ? '' : 'Copier le lien de cette recherche'" @click="partager">
      {{ lienCopie ? 'Lien copié ✓' : 'Partager' }}
    </button>
    <button v-if="hasMore" type="button" :disabled="loading" @click="more">Charger plus</button>
    <button type="button" @click="telechargerCsv(displayed)">Exporter CSV</button>
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
.error {
  color: #c62828;
}
</style>
