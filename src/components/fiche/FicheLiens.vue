<script setup lang="ts">
import { computed } from 'vue'
import { observatoireUrl, parseGeopoint, type Dpe, type DpeDetail } from '../../api/dpe'
import { date, majuscule } from '../../lib/format'
import { liensExternes } from '../../lib/verification'

const props = defineProps<{ dpe: Dpe; detail: DpeDetail | null }>()

const liens = computed(() => {
  const pt = parseGeopoint(props.dpe)
  return pt ? liensExternes(pt[0], pt[1]) : []
})
</script>

<template>
  <section v-if="liens.length" aria-labelledby="titre-liens">
    <h3 id="titre-liens">Voir sur place</h3>
    <ul class="links">
      <li v-for="l in liens" :key="l.url">
        <a :href="l.url" target="_blank" rel="noopener">{{ l.label }} ↗</a>
      </li>
      <li>
        <a :href="observatoireUrl(dpe.numero_dpe)" target="_blank" rel="noopener">DPE complet (ADEME) ↗</a>
      </li>
    </ul>
  </section>

  <section v-if="detail" aria-labelledby="titre-dpe">
    <h3 id="titre-dpe">Le DPE</h3>
    <dl class="grid">
      <dt>Numéro</dt>
      <dd>{{ detail.numero_dpe }}</dd>
      <dt>Établi le</dt>
      <dd>{{ date(detail.date_etablissement_dpe) }}</dd>
      <dt>Visite</dt>
      <dd>{{ date(detail.date_visite_diagnostiqueur) }}</dd>
      <dt>Valide jusqu'au</dt>
      <dd>{{ date(detail.date_fin_validite_dpe) }}</dd>
      <dt>Méthode</dt>
      <dd>{{ majuscule(detail.methode_application_dpe) }}</dd>
      <template v-if="detail.numero_dpe_remplace">
        <dt>Remplace</dt>
        <dd>
          <a :href="observatoireUrl(detail.numero_dpe_remplace)" target="_blank" rel="noopener">
            {{ detail.numero_dpe_remplace }} ↗
          </a>
        </dd>
      </template>
    </dl>
  </section>
</template>
