<script setup lang="ts">
import { prixM2, type MarcheLocal } from '../../api/territoire'
import { date, nombre } from '../../lib/format'

defineProps<{ marche: MarcheLocal; prix: number | null; surface?: number }>()
</script>

<template>
  <section aria-labelledby="titre-ventes">
    <h3 id="titre-ventes">Ventes passées (DVF)</h3>
    <p v-if="!marche.ventesParcelle.length" class="muted small">Aucune vente de cette parcelle depuis 2021.</p>
    <ul class="sales">
      <li v-for="v in marche.ventesParcelle" :key="v.id">
        <span class="date">{{ date(v.date) }}</span>
        <strong>{{ v.prix ? `${nombre(v.prix)} €` : '–' }}</strong>
        <span class="small muted">
          {{ v.type !== 'Autre' ? v.type : 'Lot' }}
          <template v-if="v.surfaceBati"> · {{ nombre(v.surfaceBati) }} m² bâtis</template>
          <template v-if="v.pieces"> · {{ v.pieces }} p.</template>
          <template v-if="v.terrain"> · terrain {{ nombre(v.terrain) }} m²</template>
        </span>
      </li>
    </ul>
    <template v-if="marche.medianePrixM2">
      <p class="small">
        Prix médian dans la section cadastrale :
        <strong>{{ nombre(marche.medianePrixM2) }} €/m²</strong>
        <span class="muted">({{ marche.comparables.length }} ventes, 3 ans)</span>
        <template v-if="prix && surface"> · annonce : <strong>{{ nombre(prix / surface) }} €/m²</strong></template>
      </p>
      <details class="small">
        <summary>Voir les ventes comparables</summary>
        <ul class="sales">
          <li v-for="v in marche.comparables.slice(0, 30)" :key="v.id">
            <span class="date">{{ date(v.date) }}</span>
            <span>{{ nombre(v.prix) }} €</span>
            <span class="muted">{{ nombre(v.surfaceBati) }} m² · {{ nombre(prixM2(v)) }} €/m² · {{ v.adresse }}</span>
          </li>
        </ul>
      </details>
    </template>
    <p class="muted small">Surfaces « bâties » déclarées aux impôts, souvent proches de la surface habitable.</p>
  </section>
</template>
