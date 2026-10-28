<script setup lang="ts">
import { useCriteres } from '../../composables/useCriteres'
import { nombreOuNull } from '../../lib/saisie'
import EtiquettePicker from '../EtiquettePicker.vue'

const { form } = useCriteres()
</script>

<template>
  <div class="f-labels">
    <fieldset class="f-dpe">
      <legend>Étiquette énergie (DPE) <small class="muted">— aucune = toutes</small></legend>
      <EtiquettePicker v-model="form.etiquettesDpe" label="Étiquette énergie" />
    </fieldset>

    <fieldset class="f-ges">
      <legend>Étiquette climat (GES)</legend>
      <EtiquettePicker v-model="form.etiquettesGes" label="Étiquette climat" />
    </fieldset>

    <template v-if="form.avance">
      <fieldset class="f-valeurs">
        <legend>Chiffres de l'annonce <small class="muted">— les plus discriminants</small></legend>
        <div class="pair">
          <label>
            <span>Énergie</span>
            <input
              :value="form.consoEp ?? ''"
              type="number"
              min="0"
              placeholder="ex. 142"
              @input="form.consoEp = nombreOuNull($event)"
            />
            <small class="muted">kWh/m²/an</small>
          </label>
          <label>
            <span>Climat</span>
            <input
              :value="form.ges ?? ''"
              type="number"
              min="0"
              placeholder="ex. 31"
              @input="form.ges = nombreOuNull($event)"
            />
            <small class="muted">kg CO₂/m²/an</small>
          </label>
        </div>
        <span id="depenses" class="sublabel">Dépenses annuelles d'énergie (fourchette)</span>
        <div class="row" role="group" aria-labelledby="depenses">
          <input
            :value="form.coutMin ?? ''"
            type="number"
            min="0"
            placeholder="entre… €"
            aria-label="Dépenses minimales en euros"
            @input="form.coutMin = nombreOuNull($event)"
          />
          <span aria-hidden="true">→</span>
          <input
            :value="form.coutMax ?? ''"
            type="number"
            min="0"
            placeholder="et… €"
            aria-label="Dépenses maximales en euros"
            @input="form.coutMax = nombreOuNull($event)"
          />
        </div>
      </fieldset>
    </template>
  </div>
</template>
