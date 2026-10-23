<script setup lang="ts">
import { useCriteres } from '../../composables/useCriteres'
import { dateOuNull } from '../../lib/saisie'

const { form } = useCriteres()
</script>

<template>
  <fieldset class="f-date">
    <legend>Date du DPE</legend>
    <label class="date-line">
      <span>{{ form.dateExacte ? 'Le' : 'Du' }}</span>
      <input :value="form.dateMin ?? ''" type="date" @input="form.dateMin = dateOuNull($event)" />
    </label>
    <label v-if="!form.dateExacte" class="date-line">
      <span>Au</span>
      <input :value="form.dateMax ?? ''" type="date" @input="form.dateMax = dateOuNull($event)" />
    </label>
    <label class="check">
      <input v-model="form.dateExacte" type="checkbox" />
      Date exacte
    </label>
  </fieldset>
</template>
