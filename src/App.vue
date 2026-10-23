<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import CityPicker from './components/CityPicker.vue'
import DpeDetail from './components/DpeDetail.vue'
import InstallButton from './components/InstallButton.vue'
import NearbyCommunes from './components/NearbyCommunes.vue'
import EtiquettePicker from './components/EtiquettePicker.vue'
import ResultsMap from './components/ResultsMap.vue'
import ResultsTable from './components/ResultsTable.vue'
import SourcesPage from './components/SourcesPage.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import {
  dedupe,
  getDatasetUpdatedAt,
  latestPerAddress,
  loadMore,
  searchDpe,
  type Dpe,
  type DpeFilters,
  type TypeBatiment,
  type ZoneCursor,
} from './api/dpe'

const STORAGE_KEY = 'sherlock-immo:filters'

interface FormState extends Omit<DpeFilters, 'rayonKm'> {
  alentours: boolean
  rayonKm: number
  nearbyRadiusKm: number
  unParAdresse: boolean
  surfaceMode: 'cible' | 'fourchette'
  dateExacte: boolean
  surfaceCible: number | null
  tolerancePct: number
}

const defaults: FormState = {
  communes: [],
  alentours: false,
  rayonKm: 10,
  etiquettesDpe: [],
  etiquettesGes: [],
  types: ['maison'],
  surfaceMin: null,
  surfaceMax: null,
  nearbyRadiusKm: 10,
  unParAdresse: true,
  surfaceMode: 'cible',
  surfaceCible: null,
  tolerancePct: 5,
  dateExacte: false,
  dateMin: null,
  dateMax: null,
  consoEp: null,
  ges: null,
  coutMin: null,
  coutMax: null,
  inclureNeufs: true,
}

function loadSaved(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

const form = reactive<FormState>(loadSaved())
watch(form, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    // stockage indisponible : pas grave
  }
})

const TYPES: { value: TypeBatiment; label: string }[] = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'immeuble', label: 'Immeuble' },
]

const results = shallowRef<Dpe[]>([])
const zones = ref<ZoneCursor[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)
const selectedId = ref<string | null>(null)
// DPE affiché dans la fiche (peut venir de l'historique, hors résultats)
const detailDpe = shallowRef<Dpe | null>(null)
// Contour de la parcelle du DPE ouvert, tracé sur la carte
const parcelleGeom = shallowRef<object | null>(null)
const updatedAt = ref<string | null>(null)
// Rayon effectivement utilisé pour les résultats affichés (pour la carte)
const shownRayon = ref<number | null>(null)
let controller: AbortController | null = null

const total = computed(() => zones.value.reduce((s, z) => s + z.total, 0))
const displayed = computed(() => (form.unParAdresse ? latestPerAddress(results.value) : results.value))
// Sans résultat, pas de carte : le formulaire prend toute la page
const hasResults = computed(() => displayed.value.length > 0)
const hiddenDuplicates = computed(() => results.value.length - displayed.value.length)
const totalNeufs = computed(() => zones.value.filter((z) => z.source === 'neuf').reduce((s, z) => s + z.total, 0))
const hasMore = computed(() => zones.value.some((z) => z.next))
const canSearch = computed(() => form.communes.length > 0 && !loading.value)

const round1 = (n: number) => Math.round(n * 10) / 10
const fmt = (n: number | null) => n?.toLocaleString('fr-FR') ?? ''

// Bornes réellement envoyées à l'API
const surfaceBounds = computed<[number | null, number | null]>(() => {
  if (form.surfaceMode === 'fourchette') return [form.surfaceMin, form.surfaceMax]
  const v = form.surfaceCible
  if (v == null) return [null, null]
  if (form.tolerancePct === 0) {
    // « 100 » doit aussi trouver 100,3 m² ; une valeur décimale reste exacte
    return Number.isInteger(v) ? [v, v + 0.99] : [v, v]
  }
  const delta = (v * form.tolerancePct) / 100
  return [round1(v - delta), round1(v + delta)]
})

const dateBounds = computed<[string | null, string | null]>(() => {
  // « Du » seul = minimum, « Au » seul = maximum, les deux = entre
  if (form.dateExacte) return [form.dateMin, form.dateMin]
  // Bornes saisies à l'envers : on les remet dans l'ordre
  const [a, b] = [form.dateMin, form.dateMax]
  return a && b && a > b ? [b, a] : [a, b]
})

function toFilters(): DpeFilters {
  const [surfaceMin, surfaceMax] = surfaceBounds.value
  const [dateMin, dateMax] = dateBounds.value
  return { ...form, surfaceMin, surfaceMax, dateMin, dateMax, rayonKm: form.alentours ? form.rayonKm : null }
}

async function run(fn: (signal: AbortSignal) => Promise<void>) {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = null
  try {
    await fn(controller.signal)
  } catch (e) {
    if ((e as Error).name !== 'AbortError') error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function search() {
  if (!form.communes.length) return
  const filters = toFilters()
  return run(async (signal) => {
    const r = await searchDpe(filters, signal)
    results.value = r.results
    zones.value = r.zones
    shownRayon.value = filters.rayonKm
    selectedId.value = null
    detailDpe.value = null
    window.scrollTo({ top: 0 })
    searched.value = true
  })
}

function more() {
  return run(async (signal) => {
    const r = await loadMore(zones.value, signal)
    results.value = dedupe([...results.value, ...r.results])
    zones.value = r.zones
  })
}

// Retour à l'accueil, filtres conservés
function newSearch() {
  controller?.abort()
  results.value = []
  zones.value = []
  searched.value = false
  error.value = null
  selectedId.value = null
  detailDpe.value = null
}

function select(id: string) {
  selectedId.value = id
  detailDpe.value = displayed.value.find((d) => d.numero_dpe === id) ?? detailDpe.value
}

function openDetail(d: Dpe) {
  detailDpe.value = d
  selectedId.value = d.numero_dpe
}

function closeDetail() {
  detailDpe.value = null
  parcelleGeom.value = null
}

// La surface saisie dans les filtres sert de point de comparaison dans la fiche
const surfaceAnnonce = computed(() => (form.surfaceMode === 'cible' ? form.surfaceCible : null))

function reset() {
  Object.assign(form, { ...defaults, communes: form.communes })
}

function exportCsv() {
  const cols: (keyof Dpe)[] = [
    'adresse_ban',
    'complement_adresse_logement',
    'type_batiment',
    'etiquette_dpe',
    'etiquette_ges',
    'surface_habitable_logement',
    'annee_construction',
    'date_etablissement_dpe',
    'numero_dpe',
  ]
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(';'), ...displayed.value.map((d) => cols.map((c) => esc(d[c])).join(';'))].join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'dpe-recherche.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

function numberOrNull(v: string) {
  return v === '' ? null : Number(v)
}

// Page « Sources et outils » : simple ancre (#sources), sans routeur
const page = ref(location.hash === '#sources' ? 'sources' : 'app')
const onHash = () => {
  page.value = location.hash === '#sources' ? 'sources' : 'app'
  window.scrollTo({ top: 0 })
}

onMounted(async () => {
  window.addEventListener('hashchange', onHash)
  updatedAt.value = await getDatasetUpdatedAt()
})
</script>

<template>
  <ThemeToggle />
  <SourcesPage v-if="page === 'sources'" :updated-at="updatedAt" />
  <div v-else class="layout" :class="{ landing: !hasResults }">
    <aside class="filters">
      <header>
        <div class="brand">
          <img class="logo" src="/icons/icon.svg" alt="" width="40" height="40" />
          <h1>Sherlock <span>Immo</span></h1>
        </div>
        <p class="tagline muted">Retrouvez la maison d'une annonce, puis vérifiez ce que l'annonce ne dit pas.</p>
        <p v-if="!hasResults && error" class="status error">Erreur : {{ error }}</p>
        <p v-else-if="!hasResults && searched && !loading" class="status">
          Aucun DPE ne correspond. Élargissez la surface, la zone ou ajoutez des étiquettes.
        </p>
        <InstallButton v-if="!hasResults" class="install" />
      </header>

      <form @submit.prevent="search">
        <fieldset class="f-loc">
          <legend>Localisation</legend>
          <CityPicker v-model="form.communes" />
          <NearbyCommunes
            v-if="form.communes.length"
            v-model="form.communes"
            v-model:radius-km="form.nearbyRadiusKm"
            :center="form.communes[0]"
          />
          <label class="check">
            <input v-model="form.alentours" type="checkbox" />
            Chercher aussi dans un rayon autour de chaque commune
          </label>
          <div v-if="form.alentours" class="range">
            <input v-model.number="form.rayonKm" type="range" min="1" max="50" step="1" />
            <output>{{ form.rayonKm }} km</output>
          </div>
        </fieldset>

        <div class="col col-b">
          <fieldset class="f-type">
            <legend>Type de bien</legend>
            <div class="types">
              <label v-for="t in TYPES" :key="t.value" class="check">
                <input v-model="form.types" type="checkbox" :value="t.value" />
                {{ t.label }}
              </label>
            </div>
            <label class="check">
              <input v-model="form.inclureNeufs" type="checkbox" />
              Inclure les logements neufs (construits depuis 2021)
            </label>
          </fieldset>

          <div class="f-labels">
            <fieldset class="f-dpe">
              <legend>Étiquette énergie (DPE) <small class="muted">— aucune = toutes</small></legend>
              <EtiquettePicker v-model="form.etiquettesDpe" />
            </fieldset>

            <fieldset class="f-ges">
              <legend>Étiquette climat (GES)</legend>
              <EtiquettePicker v-model="form.etiquettesGes" />
            </fieldset>

            <fieldset class="f-valeurs">
              <legend>Chiffres de l'annonce <small class="muted">— les plus discriminants</small></legend>
              <div class="pair">
                <label>
                  <span>Énergie</span>
                  <input
                    :value="form.consoEp ?? ''"
                    type="number"
                    min="0"
                    placeholder="ex. 187"
                    @input="form.consoEp = numberOrNull(($event.target as HTMLInputElement).value)"
                  />
                  <small class="muted">kWh/m²/an</small>
                </label>
                <label>
                  <span>Climat</span>
                  <input
                    :value="form.ges ?? ''"
                    type="number"
                    min="0"
                    placeholder="ex. 6"
                    @input="form.ges = numberOrNull(($event.target as HTMLInputElement).value)"
                  />
                  <small class="muted">kg CO₂/m²/an</small>
                </label>
              </div>
              <span class="sublabel">Dépenses annuelles d'énergie (fourchette)</span>
              <div class="row">
                <input
                  :value="form.coutMin ?? ''"
                  type="number"
                  min="0"
                  placeholder="entre… €"
                  @input="form.coutMin = numberOrNull(($event.target as HTMLInputElement).value)"
                />
                <span>→</span>
                <input
                  :value="form.coutMax ?? ''"
                  type="number"
                  min="0"
                  placeholder="et… €"
                  @input="form.coutMax = numberOrNull(($event.target as HTMLInputElement).value)"
                />
              </div>
            </fieldset>
          </div>
        </div>

        <div class="col col-c">
          <fieldset class="f-surf">
            <legend>Surface habitable (m²)</legend>
            <div class="segmented" role="group">
              <button type="button" :aria-pressed="form.surfaceMode === 'cible'" @click="form.surfaceMode = 'cible'">
                Valeur ± tolérance
              </button>
              <button
                type="button"
                :aria-pressed="form.surfaceMode === 'fourchette'"
                @click="form.surfaceMode = 'fourchette'"
              >
                Fourchette
              </button>
            </div>
            <template v-if="form.surfaceMode === 'cible'">
              <input
                :value="form.surfaceCible ?? ''"
                type="number"
                min="0"
                step="0.1"
                placeholder="ex. 105"
                @input="form.surfaceCible = numberOrNull(($event.target as HTMLInputElement).value)"
              />
              <div class="range">
                <input v-model.number="form.tolerancePct" type="range" min="0" max="30" step="1" />
                <output>± {{ form.tolerancePct }} %</output>
              </div>
              <p v-if="surfaceBounds[0] != null" class="hint muted">
                <template v-if="surfaceBounds[0] === surfaceBounds[1]">Exactement {{ fmt(surfaceBounds[0]) }} m²</template>
                <template v-else>Entre {{ fmt(surfaceBounds[0]) }} et {{ fmt(surfaceBounds[1]) }} m²</template>
              </p>
            </template>
            <div v-else class="row">
              <input
                :value="form.surfaceMin ?? ''"
                type="number"
                min="0"
                placeholder="min"
                @input="form.surfaceMin = numberOrNull(($event.target as HTMLInputElement).value)"
              />
              <span>→</span>
              <input
                :value="form.surfaceMax ?? ''"
                type="number"
                min="0"
                placeholder="max"
                @input="form.surfaceMax = numberOrNull(($event.target as HTMLInputElement).value)"
              />
            </div>
          </fieldset>

          <fieldset class="f-date">
            <legend>Date du DPE</legend>
            <label class="date-line">
              <span>{{ form.dateExacte ? 'Le' : 'Du' }}</span>
              <input
                :value="form.dateMin ?? ''"
                type="date"
                @input="form.dateMin = ($event.target as HTMLInputElement).value || null"
              />
            </label>
            <label v-if="!form.dateExacte" class="date-line">
              <span>Au</span>
              <input
                :value="form.dateMax ?? ''"
                type="date"
                @input="form.dateMax = ($event.target as HTMLInputElement).value || null"
              />
            </label>
            <label class="check">
              <input v-model="form.dateExacte" type="checkbox" />
              Date exacte
            </label>
          </fieldset>
        </div>

        <div class="buttons">
          <button type="submit" class="primary" :disabled="!canSearch">
            {{ loading ? 'Recherche…' : 'Rechercher' }}
          </button>
          <button type="button" @click="reset">Réinitialiser</button>
        </div>
      </form>

      <footer class="muted">
        <a href="#sources">Sources et outils</a>
        · Données publiques <template v-if="updatedAt">(DPE à jour au {{ new Date(updatedAt).toLocaleDateString('fr-FR') }})</template>
        · Open source
      </footer>
    </aside>

    <main v-if="hasResults" class="results">
      <div class="summary">
        <button type="button" @click="newSearch">← Nouvelle recherche</button>
        <span v-if="error" class="error">Erreur : {{ error }}</span>
        <template v-else>
          <strong>{{ total.toLocaleString('fr-FR') }}</strong> DPE trouvés
          <span class="muted">· {{ displayed.length.toLocaleString('fr-FR') }} affichés</span>
          <span v-if="hiddenDuplicates" class="muted">({{ hiddenDuplicates }} doublons masqués)</span>
          <span v-if="totalNeufs" class="muted">(dont {{ totalNeufs.toLocaleString('fr-FR') }} neufs)</span>
        </template>
        <span class="spacer"></span>
        <label class="check">
          <input v-model="form.unParAdresse" type="checkbox" />
          Un seul DPE par adresse (le plus récent)
        </label>
        <button v-if="hasMore" type="button" :disabled="loading" @click="more">Charger plus</button>
        <button type="button" @click="exportCsv">Exporter CSV</button>
      </div>

      <div class="body" :class="{ 'with-detail': detailDpe }">
        <div class="panes">
          <ResultsMap
            class="map-pane"
            :results="displayed"
            :communes="form.communes"
            :rayon-km="shownRayon"
            :selected-id="selectedId"
            :parcelle="parcelleGeom"
            @select="select"
          />
          <ResultsTable
            class="table-pane"
            :results="displayed"
            :selected-id="selectedId"
            @select="select"
          />
        </div>
        <DpeDetail
          v-if="detailDpe"
          class="detail-pane"
          :dpe="detailDpe"
          :surface-annonce="surfaceAnnonce"
          @close="closeDetail"
          @open="openDetail"
          @parcelle="parcelleGeom = $event"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  grid-template-rows: minmax(0, 1fr);
  height: 100vh;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--surface);
}
h1 {
  margin: 0;
  font-size: 1.4em;
  font-weight: 800;
}
header p {
  margin: 4px 0 0;
}
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
fieldset {
  /* fieldset a un min-width: min-content par défaut, qui fait déborder la colonne */
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
legend {
  font-weight: 600;
  margin-bottom: 6px;
  padding: 0;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.types {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.range {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range input {
  flex: 1;
}
.range output {
  min-width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row input {
  flex: 1;
  min-width: 0;
  width: 100%;
}
.date-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.date-line span {
  min-width: 22px;
}
.date-line input {
  flex: 1;
  min-width: 0;
}
.segmented {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.segmented button {
  flex: 1;
  border: 0;
  border-radius: 0;
  padding: 6px 8px;
  font-size: 0.9em;
}
.segmented button[aria-pressed='true'] {
  background: var(--accent);
  color: #fff;
}
.hint {
  margin: 0;
  font-size: 0.85em;
}
.buttons {
  display: flex;
  gap: 8px;
}
.buttons .primary {
  flex: 1;
}
footer {
  margin-top: auto;
  font-size: 0.8em;
}
.results {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  gap: 12px;
}
.summary {
  /* Place pour le bouton de thème fixé en haut à droite */
  padding-right: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.error {
  color: #c62828;
}
.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.body.with-detail {
  grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
}
.detail-pane {
  min-height: 0;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pair label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pair input {
  width: 100%;
  min-width: 0;
}
.pair span,
.sublabel {
  font-size: 0.9em;
}
.panes {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.panes > * {
  min-height: 0;
}
.status {
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.status.error {
  background: color-mix(in srgb, #c62828 12%, transparent);
}

/* Accueil : formulaire pleine page, blocs sur deux colonnes */
.landing {
  display: block;
  height: auto;
  min-height: 100vh;
}
.landing .filters {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px 32px;
  gap: 28px;
  overflow: visible;
  border: 0;
  background: transparent;
}
.landing header {
  text-align: center;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand h1 span {
  color: var(--accent-2);
}
.logo {
  width: 28px;
  height: 28px;
  flex: none;
}
/* Colonne de filtres : juste le logo et le nom, sur une ligne */
.layout:not(.landing) .tagline {
  display: none;
}
/* Accueil : logo, nom, accroche et installation sur une seule ligne centrée */
.landing header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 18px;
}
.landing .logo {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent));
}
.landing .tagline {
  margin: 0;
}
.landing header .status {
  flex-basis: 100%;
}

.landing h1 {
  font-size: 1.7em;
  letter-spacing: -0.02em;
}
.landing form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'loc type'
    'loc labels'
    'loc .'
    'surf date'
    'btn btn';
  /* La rangée vide absorbe la hauteur de « Localisation » : les blocs voisins restent groupés */
  grid-template-rows: auto auto 1fr auto auto;
  gap: 16px;
  align-items: start;
}
.landing fieldset,
.landing .f-labels {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
/* DPE et GES : un seul bloc, les deux fieldsets internes sans cadre */
.f-labels {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.landing .f-labels fieldset {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
}
/* Sorti du bord du fieldset pour rester dans le bloc */
.landing legend {
  float: left;
  width: 100%;
}
.landing .f-loc {
  grid-area: loc;
  align-self: stretch;
}
.landing .f-type {
  grid-area: type;
}
.landing .f-labels {
  grid-area: labels;
}
.landing .f-surf {
  grid-area: surf;
  align-self: stretch;
}
.landing .f-date {
  grid-area: date;
  align-self: stretch;
}
.landing .buttons {
  grid-area: btn;
  justify-content: center;
}
.landing .buttons .primary {
  flex: 0 1 320px;
  padding: 12px 20px;
  font-size: 1.05em;
}
.landing footer {
  text-align: center;
}

/* Hors 3 colonnes, les conteneurs de colonne s'effacent : leurs blocs suivent la grille */
.col {
  display: contents;
}

/* Très grand écran : trois colonnes, chacune empile ses blocs */
@media (min-width: 1280px) {
  .landing .filters {
    max-width: 1360px;
  }
  .landing form {
    grid-template-columns: 1.1fr 1fr 1fr;
    grid-template-areas:
      'loc b c'
      'btn btn btn';
    grid-template-rows: auto auto;
  }
  .landing .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .landing .col-b {
    grid-area: b;
  }
  .landing .col-c {
    grid-area: c;
  }
}

@media (max-width: 860px) {
  .landing .filters {
    padding-top: 32px;
  }
  .landing form {
    grid-template-columns: 1fr;
    grid-template-areas: 'loc' 'type' 'labels' 'surf' 'date' 'btn';
    grid-template-rows: none;
  }
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
  }
  .filters {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .panes {
    grid-template-rows: 360px auto;
  }
  .body.with-detail {
    grid-template-columns: 1fr;
  }
  /* Résultats sur téléphone : les filtres laissent la place, « Nouvelle recherche » y ramène */
  .layout:not(.landing) .filters {
    display: none;
  }
  /* Sur téléphone, la fiche passe en plein écran par-dessus les résultats */
  .detail-pane {
    position: fixed;
    inset: 0;
    z-index: 1200;
    border-radius: 0;
    padding-top: calc(16px + env(safe-area-inset-top));
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }
}
</style>
