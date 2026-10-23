<script setup lang="ts">
import { computed } from 'vue'
import type { Audit } from '../../api/dpe'
import { date, majuscule, nombre } from '../../lib/format'
import DpeBadge from '../DpeBadge.vue'

const props = defineProps<{ audit: Audit }>()

const ORDRE = (e?: string) =>
  e === 'état initial'
    ? 0
    : e === 'étape première'
      ? 1
      : e?.startsWith('étape intermédiaire')
        ? 2 + Number(e.slice(-1) || 0)
        : 9

// Scénarios regroupés (une étape, plusieurs étapes…), étapes dans l'ordre
const scenarios = computed(() => {
  const groups = new Map<string, Audit['etapes']>()
  for (const e of props.audit.etapes) {
    if (e.etape_travaux === 'état initial') continue
    const k = e.categorie_scenario ?? 'Scénario'
    groups.set(k, [...(groups.get(k) ?? []), e])
  }
  return [...groups.entries()].map(([nom, etapes]) => ({
    nom,
    etapes: [...etapes].sort((x, y) => ORDRE(x.etape_travaux) - ORDRE(y.etape_travaux)),
  }))
})
</script>

<template>
  <section v-if="scenarios.length" aria-labelledby="titre-audit">
    <h3 id="titre-audit">Audit énergétique : travaux chiffrés</h3>
    <p class="muted small">Audit {{ audit.numero }} du {{ date(audit.date) }}.</p>
    <div v-for="s in scenarios" :key="s.nom" class="scenario">
      <h4>{{ majuscule(s.nom) }}</h4>
      <ol>
        <li v-for="e in s.etapes" :key="e.etape_travaux">
          <div class="step-head">
            <DpeBadge :value="e.classe_bilan_dpe" />
            <strong>{{ majuscule(e.etape_travaux) }}</strong>
            <span v-if="e.cout_travaux">{{ nombre(e.cout_travaux) }} €</span>
            <span v-if="e.couts_cumules_travaux && e.couts_cumules_travaux !== e.cout_travaux" class="muted">
              (cumul {{ nombre(e.couts_cumules_travaux) }} €)
            </span>
          </div>
          <p v-if="e.travaux_realises" class="small">{{ e.travaux_realises }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
