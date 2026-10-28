<script setup lang="ts">
import type { TypeBatiment } from '../../api/dpe'
import { useCriteres } from '../../composables/useCriteres'

const { form } = useCriteres()

const TYPES: { value: TypeBatiment; label: string }[] = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'immeuble', label: 'Immeuble' },
]
</script>

<template>
  <fieldset class="f-type">
    <legend>Type de bien</legend>
    <div class="types">
      <label v-for="t in TYPES" :key="t.value" class="check">
        <input v-model="form.types" type="checkbox" :value="t.value" />
        {{ t.label }}
      </label>
    </div>
    <label v-if="form.avance" class="check">
      <input v-model="form.inclureNeufs" type="checkbox" />
      Inclure les logements neufs (construits depuis 2021)
    </label>
  </fieldset>
</template>
