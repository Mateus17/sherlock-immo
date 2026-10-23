<script setup lang="ts">
import { computed } from 'vue'
import type { DpeDetail, Qualite } from '../../api/dpe'
import { majuscule, nombre } from '../../lib/format'
import { deperditions } from '../../lib/verification'

const props = defineProps<{ detail: DpeDetail }>()

const pertes = computed(() => deperditions(props.detail))

const isolation = computed(() => {
  const d = props.detail
  return (
    [
      ['Murs', d.qualite_isolation_murs],
      ['Plancher bas', d.qualite_isolation_plancher_bas],
      ['Combles perdus', d.qualite_isolation_plancher_haut_comble_perdu],
      ['Combles aménagés', d.qualite_isolation_plancher_haut_comble_amenage],
      ['Toit terrasse', d.qualite_isolation_plancher_haut_toit_terrasse],
      ['Fenêtres et portes', d.qualite_isolation_menuiseries],
      ['Ensemble', d.qualite_isolation_enveloppe],
    ] as [string, Qualite | undefined][]
  ).filter(([, q]) => q)
})

const couts = computed(() => {
  const d = props.detail
  return [
    ['Chauffage', d.cout_chauffage],
    ['Eau chaude', d.cout_ecs],
    ['Climatisation', d.cout_refroidissement],
    ['Éclairage', d.cout_eclairage],
    ['Auxiliaires', d.cout_auxiliaires],
  ].filter((x): x is [string, number] => typeof x[1] === 'number' && x[1] > 0)
})
</script>

<template>
  <section v-if="pertes.length" aria-labelledby="titre-pertes">
    <h3 id="titre-pertes">Par où part la chaleur</h3>
    <ul class="bars">
      <li v-for="p in pertes" :key="p.label">
        <span class="bar-label">{{ p.label }}</span>
        <span class="bar" role="img" :aria-label="`${p.pct.toFixed(0)} %`"
          ><span :style="{ width: `${p.pct}%` }"></span
        ></span>
        <span class="bar-value" aria-hidden="true">{{ p.pct.toFixed(0) }} %</span>
      </li>
    </ul>
  </section>

  <section v-if="isolation.length" aria-labelledby="titre-isolation">
    <h3 id="titre-isolation">Isolation</h3>
    <dl class="grid">
      <template v-for="[label, q] in isolation" :key="label">
        <dt>{{ label }}</dt>
        <dd>
          <span class="quality" :data-q="q">{{ q }}</span>
        </dd>
      </template>
    </dl>
  </section>

  <section aria-labelledby="titre-equipements">
    <h3 id="titre-equipements">Équipements</h3>
    <dl class="grid">
      <dt>Chauffage</dt>
      <dd>
        {{ detail.type_energie_principale_chauffage ?? '–' }}
        <small v-if="detail.type_generateur_chauffage_principal" class="muted">
          {{ detail.type_generateur_chauffage_principal }}
        </small>
      </dd>
      <dt>Eau chaude</dt>
      <dd>
        {{ detail.type_energie_principale_ecs ?? '–' }}
        <small v-if="detail.type_generateur_chauffage_principal_ecs" class="muted">
          {{ detail.type_generateur_chauffage_principal_ecs }}
        </small>
      </dd>
      <dt>Ventilation</dt>
      <dd>{{ detail.type_ventilation ?? '–' }}</dd>
      <template v-if="detail.type_generateur_froid">
        <dt>Climatisation</dt>
        <dd>{{ detail.type_generateur_froid }}</dd>
      </template>
      <dt>Photovoltaïque</dt>
      <dd>
        {{ detail.presence_production_pv === 1 ? 'Oui' : 'Non' }}
        <small v-if="detail.production_electricite_pv_kwhep_par_an" class="muted">
          {{ nombre(detail.production_electricite_pv_kwhep_par_an) }} kWhep/an
        </small>
      </dd>
      <dt>Confort d'été</dt>
      <dd>{{ majuscule(detail.indicateur_confort_ete) }}</dd>
      <template v-if="detail.nombre_niveau_logement">
        <dt>Niveaux</dt>
        <dd>{{ detail.nombre_niveau_logement }}</dd>
      </template>
      <template v-if="detail.hauteur_sous_plafond">
        <dt>Hauteur sous plafond</dt>
        <dd>{{ nombre(detail.hauteur_sous_plafond, 2) }} m</dd>
      </template>
    </dl>
  </section>

  <section v-if="couts.length" aria-labelledby="titre-couts">
    <h3 id="titre-couts">Facture estimée par poste</h3>
    <dl class="grid">
      <template v-for="[label, v] in couts" :key="label">
        <dt>{{ label }}</dt>
        <dd>{{ nombre(v) }} €/an</dd>
      </template>
    </dl>
    <p class="muted small">
      Estimation conventionnelle du DPE, pas une facture réelle : demandez les factures du vendeur.
    </p>
  </section>
</template>
