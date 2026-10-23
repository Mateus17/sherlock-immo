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

const { form, reset } = useCriteres()
const canSearch = computed(() => form.communes.length > 0 && !props.loading)
</script>

<template>
  <form @submit.prevent="emit('submit')">
    <FiltreLocalisation />

    <div class="col col-b">
      <FiltreType />
      <FiltreEtiquettes />
    </div>

    <div class="col col-c">
      <FiltreSurface />
      <FiltreDate />
      <FiltreConstruction />
    </div>

    <div class="buttons">
      <button type="submit" class="primary" :disabled="!canSearch">
        {{ loading ? 'Recherche…' : 'Rechercher' }}
      </button>
      <button type="button" @click="reset()">Réinitialiser</button>
    </div>
  </form>
</template>
