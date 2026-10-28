<script setup lang="ts">
import { useCriteres } from '../../composables/useCriteres'
import CityPicker from '../CityPicker.vue'
import NearbyCommunes from '../NearbyCommunes.vue'

const { form } = useCriteres()
</script>

<template>
  <fieldset class="f-loc">
    <legend>Localisation</legend>
    <CityPicker v-model="form.communes" />
    <NearbyCommunes
      v-if="form.avance && form.communes.length"
      v-model="form.communes"
      v-model:radius-km="form.nearbyRadiusKm"
      :center="form.communes[0]"
    />
    <label v-if="form.avance" class="check">
      <input v-model="form.alentours" type="checkbox" />
      Chercher aussi dans un rayon autour de chaque commune
    </label>
    <div v-if="form.avance && form.alentours" class="range">
      <input v-model.number="form.rayonKm" type="range" min="1" max="50" step="1" aria-label="Rayon en kilomètres" />
      <output>{{ form.rayonKm }} km</output>
    </div>
  </fieldset>
</template>
