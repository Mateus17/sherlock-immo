<script setup lang="ts">
import type { Risques } from '../../api/territoire'

defineProps<{ risques: Risques }>()

const statut = (adresse: string | null, commune: string | null) =>
  adresse && !/non connu/i.test(adresse) ? adresse : `Commune : ${commune ?? '?'}`
</script>

<template>
  <section aria-labelledby="titre-risques">
    <h3 id="titre-risques">Risques (Géorisques)</h3>
    <ul class="risks">
      <li v-for="r in risques.risques" :key="r.cle">
        <span>{{ r.libelle }}</span>
        <small class="muted">{{ statut(r.statutAdresse, r.statutCommune) }}</small>
      </li>
    </ul>
    <a :href="risques.rapportUrl" target="_blank" rel="noopener" class="small">Rapport complet Géorisques ↗</a>
  </section>
</template>
