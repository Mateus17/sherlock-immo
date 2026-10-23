<script setup lang="ts">
import { useCriteres } from '../../composables/useCriteres'
import { nombreOuNull } from '../../lib/saisie'

const { form, surfaceBounds } = useCriteres()
const fmt = (n: number | null) => n?.toLocaleString('fr-FR') ?? ''
</script>

<template>
  <fieldset class="f-surf">
    <legend>Surface habitable (m²)</legend>
    <div class="segmented" role="group" aria-label="Mode de saisie de la surface">
      <button type="button" :aria-pressed="form.surfaceMode === 'cible'" @click="form.surfaceMode = 'cible'">
        Valeur ± tolérance
      </button>
      <button type="button" :aria-pressed="form.surfaceMode === 'fourchette'" @click="form.surfaceMode = 'fourchette'">
        Fourchette
      </button>
    </div>
    <template v-if="form.surfaceMode === 'cible'">
      <input
        :value="form.surfaceCible ?? ''"
        type="number"
        min="0"
        step="0.1"
        placeholder="ex. 105"
        aria-label="Surface habitable en m²"
        @input="form.surfaceCible = nombreOuNull($event)"
      />
      <div class="range">
        <input
          v-model.number="form.tolerancePct"
          type="range"
          min="0"
          max="30"
          step="1"
          aria-label="Tolérance en pourcentage"
        />
        <output>± {{ form.tolerancePct }} %</output>
      </div>
      <p v-if="surfaceBounds[0] != null" class="hint muted" aria-live="polite">
        <template v-if="surfaceBounds[0] === surfaceBounds[1]">Exactement {{ fmt(surfaceBounds[0]) }} m²</template>
        <template v-else>Entre {{ fmt(surfaceBounds[0]) }} et {{ fmt(surfaceBounds[1]) }} m²</template>
      </p>
    </template>
    <div v-else class="row">
      <input
        :value="form.surfaceMin ?? ''"
        type="number"
        min="0"
        placeholder="min"
        aria-label="Surface minimale en m²"
        @input="form.surfaceMin = nombreOuNull($event)"
      />
      <span aria-hidden="true">→</span>
      <input
        :value="form.surfaceMax ?? ''"
        type="number"
        min="0"
        placeholder="max"
        aria-label="Surface maximale en m²"
        @input="form.surfaceMax = nombreOuNull($event)"
      />
    </div>
  </fieldset>
</template>
