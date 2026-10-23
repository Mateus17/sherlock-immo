<script setup lang="ts">
import { computed, ref } from 'vue'
import { ENERGIES, PERIODES, type Energie, type Periode } from '../../api/dpe'
import { useCriteres } from '../../composables/useCriteres'

const { form } = useCriteres()

const actifs = computed(
  () =>
    form.periodes.length +
    form.energies.length +
    [form.pompeAChaleur, form.plainPied, form.avecPhotovoltaique, form.confortEteBon].filter(Boolean).length,
)
// Bloc replié par défaut pour ne pas alourdir le formulaire, sauf si un filtre est déjà actif
const ouvert = ref(actifs.value > 0)

function basculer<T>(liste: T[], v: T): T[] {
  return liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]
}
const togglePeriode = (p: Periode) => (form.periodes = basculer(form.periodes, p))
const toggleEnergie = (e: Energie) => (form.energies = basculer(form.energies, e))
const energies = Object.entries(ENERGIES) as [Energie, (typeof ENERGIES)[Energie]][]
</script>

<template>
  <fieldset class="f-constr">
    <legend>
      <button type="button" class="toggle" :aria-expanded="ouvert" @click="ouvert = !ouvert">
        <span aria-hidden="true">{{ ouvert ? '▾' : '▸' }}</span>
        Construction et équipements
        <small v-if="actifs" class="badge">{{ actifs }}</small>
      </button>
    </legend>

    <template v-if="ouvert">
      <span id="periodes" class="sublabel">Période de construction</span>
      <div class="chips" role="group" aria-labelledby="periodes">
        <button
          v-for="p in PERIODES"
          :key="p"
          type="button"
          class="chip"
          :aria-pressed="form.periodes.includes(p)"
          @click="togglePeriode(p)"
        >
          {{ p }}
        </button>
      </div>

      <span id="energies" class="sublabel">Énergie de chauffage</span>
      <div class="chips" role="group" aria-labelledby="energies">
        <button
          v-for="[cle, e] in energies"
          :key="cle"
          type="button"
          class="chip"
          :aria-pressed="form.energies.includes(cle)"
          @click="toggleEnergie(cle)"
        >
          {{ e.label }}
        </button>
      </div>

      <label class="check"><input v-model="form.pompeAChaleur" type="checkbox" /> Chauffage par pompe à chaleur</label>
      <label class="check"><input v-model="form.plainPied" type="checkbox" /> Plain-pied (un seul niveau)</label>
      <label class="check"><input v-model="form.avecPhotovoltaique" type="checkbox" /> Panneaux photovoltaïques</label>
      <label class="check"><input v-model="form.confortEteBon" type="checkbox" /> Bon confort d'été</label>
      <p class="hint muted">Une case non cochée n'exclut rien : elle ne filtre que si vous la cochez.</p>
    </template>
  </fieldset>
</template>
