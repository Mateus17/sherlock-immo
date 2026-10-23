<script setup lang="ts">
import { computed } from 'vue'
import type { Parcelle, Urbanisme } from '../../api/territoire'
import { nombre } from '../../lib/format'

const props = defineProps<{ parcelle: Parcelle; urbanisme: Urbanisme | null }>()

// Zones voisines qui changent la donne : à urbaniser, agricoles, naturelles
const zonesSensibles = computed(() => props.urbanisme?.voisines.filter((z) => !/^U/i.test(z.typezone)) ?? [])
</script>

<template>
  <section aria-labelledby="titre-terrain">
    <h3 id="titre-terrain">Terrain et urbanisme</h3>
    <dl class="grid">
      <dt>Parcelle</dt>
      <dd>{{ parcelle.section }} {{ parcelle.numero }} <small class="muted">{{ parcelle.idu }}</small></dd>
      <dt>Surface cadastrale</dt>
      <dd>{{ nombre(parcelle.contenance) }} m²</dd>
      <template v-if="urbanisme?.zone">
        <dt>Zone du PLU</dt>
        <dd>
          {{ urbanisme.zone.libelle }}
          <small v-if="urbanisme.zone.libelong" class="muted">{{ urbanisme.zone.libelong }}</small>
          <a v-if="urbanisme.zone.reglement" :href="urbanisme.zone.reglement" target="_blank" rel="noopener" class="small">
            Règlement ↗
          </a>
        </dd>
      </template>
      <template v-if="zonesSensibles.length">
        <dt>À moins de 150 m</dt>
        <dd>
          <span v-for="z in zonesSensibles" :key="z.libelle" class="zone-tag">
            {{ z.libelle }}<small v-if="z.libelong" class="muted"> {{ z.libelong }}</small>
          </span>
        </dd>
      </template>
    </dl>
    <p class="muted small">Contour de la parcelle tracé sur la carte. Un bien peut s'étendre sur plusieurs parcelles.</p>
  </section>
</template>
