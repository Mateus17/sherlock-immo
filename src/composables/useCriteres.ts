// Critères de recherche : état du formulaire, mémorisé dans le navigateur,
// et conversion vers les filtres envoyés à l'API.

import { computed, reactive, watch } from 'vue'
import type { DpeFilters } from '../api/dpe'
import type { Criteres } from '../lib/lien'

const STORAGE_KEY = 'sherlock-immo:filters'

export interface FormState extends Omit<DpeFilters, 'rayonKm'> {
  avance: boolean // mode avancé : tous les critères ; sinon commune, type, étiquette DPE et surface
  alentours: boolean
  rayonKm: number
  nearbyRadiusKm: number
  unParAdresse: boolean
  surfaceMode: 'cible' | 'fourchette'
  dateExacte: boolean
  surfaceCible: number | null
  tolerancePct: number
}

export const defaults: FormState = {
  avance: false,
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
  periodes: [],
  energies: [],
  pompeAChaleur: false,
  plainPied: false,
  avecPhotovoltaique: false,
  confortEteBon: false,
}

function loadSaved(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

// État unique, partagé par tous les composants du formulaire
const form = reactive<FormState>(loadSaved())
watch(form, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    // stockage indisponible (navigation privée…) : les critères ne seront pas mémorisés
  }
})

const round1 = (n: number) => Math.round(n * 10) / 10

// Bornes de surface réellement envoyées à l'API
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

// Critères au format du lien partageable
function criteres(): Criteres {
  return {
    communes: form.communes.map((c) => c.code),
    rayonKm: form.alentours ? form.rayonKm : null,
    etiquettesDpe: form.etiquettesDpe,
    etiquettesGes: form.etiquettesGes,
    types: form.types,
    inclureNeufs: form.inclureNeufs,
    surfaceMode: form.surfaceMode,
    surfaceCible: form.surfaceCible,
    tolerancePct: form.tolerancePct,
    surfaceMin: form.surfaceMin,
    surfaceMax: form.surfaceMax,
    consoEp: form.consoEp,
    ges: form.ges,
    coutMin: form.coutMin,
    coutMax: form.coutMax,
    dateMin: form.dateMin,
    dateMax: form.dateMax,
    dateExacte: form.dateExacte,
    periodes: form.periodes,
    energies: form.energies,
    pompeAChaleur: form.pompeAChaleur,
    plainPied: form.plainPied,
    avecPhotovoltaique: form.avecPhotovoltaique,
    confortEteBon: form.confortEteBon,
  }
}

// Réinitialise tout sauf ce qu'on précise (par défaut : les communes et le mode)
function reset(
  garder: Partial<FormState> = { communes: form.communes, nearbyRadiusKm: form.nearbyRadiusKm, avance: form.avance },
) {
  Object.assign(form, { ...defaults, ...garder })
}

// Critères du mode avancé. Cachés en mode simple, ils restent appliqués : le formulaire
// signale combien sont actifs et permet de les effacer.
const CHAMPS_AVANCES = [
  'alentours',
  'inclureNeufs',
  'etiquettesGes',
  'consoEp',
  'ges',
  'coutMin',
  'coutMax',
  'dateMin',
  'dateMax',
  'dateExacte',
  'periodes',
  'energies',
  'pompeAChaleur',
  'plainPied',
  'avecPhotovoltaique',
  'confortEteBon',
] as const satisfies (keyof FormState)[]

const avancesActifs = computed(
  () =>
    [
      form.alentours,
      !form.inclureNeufs,
      form.etiquettesGes.length > 0,
      form.consoEp != null,
      form.ges != null,
      form.coutMin != null || form.coutMax != null,
      form.dateMin != null || form.dateMax != null,
      form.periodes.length > 0,
      form.energies.length > 0,
      form.pompeAChaleur,
      form.plainPied,
      form.avecPhotovoltaique,
      form.confortEteBon,
    ].filter(Boolean).length,
)

function effacerAvances() {
  Object.assign(form, Object.fromEntries(CHAMPS_AVANCES.map((k) => [k, defaults[k]])))
}

export function useCriteres() {
  return { form, surfaceBounds, dateBounds, toFilters, criteres, reset, avancesActifs, effacerAvances }
}
