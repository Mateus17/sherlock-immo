<script setup lang="ts">
import { computed } from 'vue'
import { useCriteres } from '../../composables/useCriteres'
import FiltreConstruction from './FiltreConstruction.vue'
import FiltreDate from './FiltreDate.vue'
import FiltreEtiquettes from './FiltreEtiquettes.vue'
import FiltreLocalisation from './FiltreLocalisation.vue'
import FiltreSurface from './FiltreSurface.vue'
import FiltreType from './FiltreType.vue'

const props = defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { form, reset, avancesActifs, effacerAvances } = useCriteres()
const canSearch = computed(() => form.communes.length > 0 && !props.loading)
</script>

<template>
  <form :class="{ simple: !form.avance }" @submit.prevent="emit('submit')">
    <div class="mode">
      <div class="segmented" role="group" aria-label="Critères affichés">
        <button type="button" :aria-pressed="!form.avance" @click="form.avance = false">Simple</button>
        <button type="button" :aria-pressed="form.avance" @click="form.avance = true">Avancé</button>
      </div>
      <p v-if="!form.avance && avancesActifs" class="hint muted" aria-live="polite">
        {{ avancesActifs }} critère{{ avancesActifs > 1 ? 's' : '' }} avancé{{ avancesActifs > 1 ? 's' : '' }} actif{{
          avancesActifs > 1 ? 's' : ''
        }}
        · <button type="button" class="link" @click="form.avance = true">Voir</button> ·
        <button type="button" class="link" @click="effacerAvances()">Effacer</button>
      </p>
    </div>

    <FiltreLocalisation />

    <div class="col col-b">
      <FiltreType />
      <FiltreEtiquettes />
    </div>

    <div class="col col-c">
      <FiltreSurface />
      <template v-if="form.avance">
        <FiltreDate />
        <FiltreConstruction />
      </template>
    </div>

    <div class="buttons">
      <button type="submit" class="primary" :disabled="!canSearch">
        {{ loading ? 'Recherche…' : 'Rechercher' }}
      </button>
      <button type="button" @click="reset()">Réinitialiser</button>
    </div>
  </form>
</template>
