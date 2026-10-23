<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import type { Dpe } from '../api/dpe'
import type { Parcelle } from '../api/territoire'
import { useFavoris } from '../composables/useFavoris'
import { useFiche } from '../composables/useFiche'
import { date, majuscule, nombre } from '../lib/format'
import { nombreOuNull } from '../lib/saisie'
import { analyser } from '../lib/verification'
import '../styles/fiche.css'
import DpeBadge from './DpeBadge.vue'
import FicheAudit from './fiche/FicheAudit.vue'
import FicheEnergie from './fiche/FicheEnergie.vue'
import FicheHistorique from './fiche/FicheHistorique.vue'
import FicheLiens from './fiche/FicheLiens.vue'
import FichePoints from './fiche/FichePoints.vue'
import FicheQuestions from './fiche/FicheQuestions.vue'
import FicheRisques from './fiche/FicheRisques.vue'
import FicheTerrain from './fiche/FicheTerrain.vue'
import FicheVentes from './fiche/FicheVentes.vue'

const props = defineProps<{
  dpe: Dpe
  surfaceAnnonce: number | null
  terrainAnnonce?: number | null
  prixAnnonce?: number | null
}>()
const emit = defineEmits<{ close: []; open: [dpe: Dpe]; parcelle: [geometry: Parcelle['geometry'] | null] }>()

const { detail, history, oldDpes, audits, parcelle, marche, risques, urbanisme, loading, errors } = useFiche(
  toRef(props, 'dpe'),
  (g) => emit('parcelle', g),
)
const { estFavori, basculer, favoris } = useFavoris()

// Valeurs de l'annonce, modifiables dans la fiche
const surface = ref<number | null>(props.surfaceAnnonce)
const terrain = ref<number | null>(props.terrainAnnonce ?? null)
// Un prix noté dans les favoris prime sur celui de l'annonce collée
const prix = ref<number | null>(favoris[props.dpe.numero_dpe]?.prix ?? props.prixAnnonce ?? null)
watch(prix, (p) => {
  const f = favoris[props.dpe.numero_dpe]
  if (f) f.prix = p
})

const points = computed(() =>
  detail.value
    ? analyser({
        dpe: detail.value,
        history: history.value,
        oldDpes: oldDpes.value,
        audits: audits.value,
        surfaceAnnonce: surface.value,
        terrainAnnonce: terrain.value,
        prixAnnonce: prix.value,
        parcelle: parcelle.value,
        marche: marche.value,
        risques: risques.value,
        urbanisme: urbanisme.value,
      })
    : [],
)

// Accessibilité : le focus va sur le titre à chaque ouverture, Échap ferme la fiche
const titre = ref<HTMLElement>()
watch(
  () => props.dpe.numero_dpe,
  () => nextTick(() => titre.value?.focus()),
  { immediate: true },
)
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

// Impression : toutes les sections repliées sont ouvertes
const racine = ref<HTMLElement>()
const ouvrirDetails = () => racine.value?.querySelectorAll('details').forEach((d) => (d.open = true))
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeprint', ouvrirDetails)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeprint', ouvrirDetails)
})
const aujourdhui = new Date().toLocaleDateString('fr-FR')
const imprimer = () => {
  ouvrirDetails()
  window.print()
}
</script>

<template>
  <aside ref="racine" class="detail" aria-label="Fiche du logement">
    <p class="print-only muted small">
      Dossier Sherlock Immo · {{ aujourdhui }} · données publiques, à vérifier sur place
    </p>

    <header>
      <div>
        <h2 ref="titre" tabindex="-1">{{ dpe.adresse_ban ?? 'Adresse inconnue' }}</h2>
        <p class="muted">
          {{ majuscule(dpe.type_batiment) }}
          <template v-if="dpe.complement_adresse_logement"> · {{ dpe.complement_adresse_logement }}</template>
          · {{ nombre(dpe.surface_habitable_logement, 1) }} m²
          <template v-if="dpe.annee_construction || dpe.periode_construction">
            · {{ dpe.annee_construction ?? dpe.periode_construction }}
          </template>
          · DPE du {{ date(dpe.date_etablissement_dpe) }}
        </p>
      </div>
      <button type="button" class="close" aria-label="Fermer la fiche" @click="emit('close')">×</button>
    </header>

    <div class="actions">
      <button type="button" :aria-pressed="estFavori(dpe.numero_dpe)" @click="basculer(dpe, prix)">
        {{ estFavori(dpe.numero_dpe) ? '★ Dans mes favoris' : '☆ Ajouter aux favoris' }}
      </button>
      <button type="button" :disabled="loading" @click="imprimer">Imprimer le dossier</button>
    </div>

    <div class="labels">
      <div>
        <DpeBadge :value="dpe.etiquette_dpe" />
        <span
          ><strong>{{ nombre(dpe.conso_5_usages_par_m2_ep) }}</strong> kWh/m²/an</span
        >
      </div>
      <div>
        <DpeBadge :value="dpe.etiquette_ges" />
        <span
          ><strong>{{ nombre(dpe.emission_ges_5_usages_par_m2) }}</strong> kg CO₂/m²/an</span
        >
      </div>
      <div>
        <span class="euro" aria-hidden="true">€</span>
        <span
          ><strong>{{ nombre(dpe.cout_total_5_usages) }}</strong> €/an estimés</span
        >
      </div>
    </div>

    <p v-if="loading" class="muted" role="status">Chargement de la fiche…</p>
    <p v-for="e in errors" :key="e" class="error" role="alert">{{ e }}</p>

    <section aria-labelledby="titre-annonce">
      <h3 id="titre-annonce">Comparer avec l'annonce</h3>
      <div class="compare">
        <label>
          <span>Surface</span>
          <input
            :value="surface ?? ''"
            type="number"
            min="0"
            step="0.1"
            placeholder="m²"
            @input="surface = nombreOuNull($event)"
          />
        </label>
        <label>
          <span>Terrain</span>
          <input
            :value="terrain ?? ''"
            type="number"
            min="0"
            placeholder="m²"
            @input="terrain = nombreOuNull($event)"
          />
        </label>
        <label>
          <span>Prix</span>
          <input
            :value="prix ?? ''"
            type="number"
            min="0"
            step="1000"
            placeholder="€"
            @input="prix = nombreOuNull($event)"
          />
        </label>
      </div>
    </section>

    <FichePoints :points="points" />
    <FicheQuestions v-if="detail" :points="points" />
    <FicheEnergie v-if="detail" :detail="detail" />
    <FicheAudit v-if="audits[0]" :audit="audits[0]" />
    <FicheTerrain v-if="parcelle" :parcelle="parcelle" :urbanisme="urbanisme" />
    <FicheVentes v-if="marche" :marche="marche" :prix="prix" :surface="dpe.surface_habitable_logement" />
    <FicheRisques v-if="risques" :risques="risques" />
    <FicheHistorique
      :dpe="dpe"
      :history="history"
      :old-dpes="oldDpes"
      :loading="loading"
      @open="emit('open', $event)"
    />
    <FicheLiens :dpe="dpe" :detail="detail" />
  </aside>
</template>
