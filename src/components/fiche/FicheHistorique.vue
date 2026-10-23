<script setup lang="ts">
import { computed } from 'vue'
import type { Dpe, OldDpe } from '../../api/dpe'
import { date, nombre } from '../../lib/format'
import DpeBadge from '../DpeBadge.vue'

const props = defineProps<{ dpe: Dpe; history: Dpe[]; oldDpes: OldDpe[]; loading: boolean }>()
const emit = defineEmits<{ open: [dpe: Dpe] }>()

const recents = computed(() => [...props.history].reverse())
const anciens = computed(() => [...props.oldDpes].reverse())
</script>

<template>
  <section aria-labelledby="titre-historique">
    <h3 id="titre-historique">Historique de l'adresse</h3>
    <p v-if="!history.length && !oldDpes.length && !loading" class="muted small">Aucun autre DPE trouvé.</p>
    <ul class="timeline">
      <li v-for="h in recents" :key="h.numero_dpe" :class="{ current: h.numero_dpe === dpe.numero_dpe }">
        <span class="date">{{ date(h.date_etablissement_dpe) }}</span>
        <DpeBadge :value="h.etiquette_dpe" />
        <span class="small">
          {{ nombre(h.conso_5_usages_par_m2_ep) }} kWh · {{ nombre(h.surface_habitable_logement, 1) }} m²
          <template v-if="h.complement_adresse_logement"> · {{ h.complement_adresse_logement }}</template>
        </span>
        <button v-if="h.numero_dpe !== dpe.numero_dpe" type="button" class="link" @click="emit('open', h)">
          Voir<span class="sr-only"> le DPE du {{ date(h.date_etablissement_dpe) }}</span>
        </button>
        <span v-else class="muted small">ce DPE</span>
      </li>
      <li v-for="o in anciens" :key="o.numero_dpe" class="old">
        <span class="date">{{ date(o.date_etablissement_dpe) }}</span>
        <span class="old-badge">{{ o.classe_consommation_energie }}</span>
        <span class="small">
          {{ nombre(o.consommation_energie) }} kWh · {{ nombre(o.surface_thermique_lot, 1) }} m²
          <span class="muted">· ancienne méthode</span>
        </span>
      </li>
    </ul>
  </section>
</template>
