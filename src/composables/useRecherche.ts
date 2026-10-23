// Résultats de la recherche, pagination, sélection et fiche ouverte.

import { computed, ref, shallowRef } from 'vue'
import { dedupe, latestPerAddress, loadMore, searchDpe, type Dpe, type DpeFilters, type ZoneCursor } from '../api/dpe'
import { useCriteres } from './useCriteres'

const results = shallowRef<Dpe[]>([])
const zones = ref<ZoneCursor[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)
const selectedId = ref<string | null>(null)
// DPE affiché dans la fiche (peut venir de l'historique ou des favoris, hors résultats)
const detailDpe = shallowRef<Dpe | null>(null)
// Contour de la parcelle du DPE ouvert, tracé sur la carte
const parcelleGeom = shallowRef<object | null>(null)
// Rayon effectivement utilisé pour les résultats affichés (pour la carte)
const shownRayon = ref<number | null>(null)
let controller: AbortController | null = null

const { form } = useCriteres()

const displayed = computed(() => (form.unParAdresse ? latestPerAddress(results.value) : results.value))
const total = computed(() => zones.value.reduce((s, z) => s + z.total, 0))
const totalNeufs = computed(() => zones.value.filter((z) => z.source === 'neuf').reduce((s, z) => s + z.total, 0))
const hiddenDuplicates = computed(() => results.value.length - displayed.value.length)
const hasMore = computed(() => zones.value.some((z) => z.next))
// Sans résultat, pas de carte : le formulaire prend toute la page
const hasResults = computed(() => displayed.value.length > 0)

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

function search(filters: DpeFilters) {
  return run(async (signal) => {
    const r = await searchDpe(filters, signal)
    results.value = r.results
    zones.value = r.zones
    shownRayon.value = filters.rayonKm
    selectedId.value = null
    detailDpe.value = null
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

function clear() {
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

export function useRecherche() {
  return {
    results,
    zones,
    loading,
    error,
    searched,
    selectedId,
    detailDpe,
    parcelleGeom,
    shownRayon,
    displayed,
    total,
    totalNeufs,
    hiddenDuplicates,
    hasMore,
    hasResults,
    search,
    more,
    clear,
    select,
    openDetail,
    closeDetail,
  }
}
