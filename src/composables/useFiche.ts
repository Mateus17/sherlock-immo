// Chargement de toutes les données d'une fiche : DPE détaillé, historique de l'adresse,
// DPE d'avant 2021, audits, parcelle et ventes, risques, urbanisme.
// Chaque source est indépendante : une panne n'empêche pas d'afficher le reste.

import { ref, shallowRef, watch, type Ref } from 'vue'
import {
  getAddressHistory,
  getAudits,
  getDpeDetail,
  getOldDpes,
  parseGeopoint,
  type Audit,
  type Dpe,
  type DpeDetail,
  type OldDpe,
} from '../api/dpe'
import {
  getMarche,
  getParcelle,
  getRisques,
  getUrbanisme,
  type MarcheLocal,
  type Parcelle,
  type Risques,
  type Urbanisme,
} from '../api/territoire'

export function useFiche(dpe: Ref<Dpe>, onParcelle: (geom: Parcelle['geometry'] | null) => void) {
  const detail = shallowRef<DpeDetail | null>(null)
  const history = shallowRef<Dpe[]>([])
  const oldDpes = shallowRef<OldDpe[]>([])
  const audits = shallowRef<Audit[]>([])
  const parcelle = shallowRef<Parcelle | null>(null)
  const marche = shallowRef<MarcheLocal | null>(null)
  const risques = shallowRef<Risques | null>(null)
  const urbanisme = shallowRef<Urbanisme | null>(null)
  const loading = ref(false)
  const errors = ref<string[]>([])
  let controller: AbortController | null = null

  const erreur = (signal: AbortSignal, message: string) => {
    if (!signal.aborted) errors.value = [...errors.value, message]
  }

  function chargerTerritoire(d: Dpe, signal: AbortSignal) {
    const pt = parseGeopoint(d)
    if (!pt) return
    const [lat, lon] = pt
    const typeLocal = d.type_batiment === 'appartement' ? 'Appartement' : 'Maison'
    getParcelle(lat, lon, signal)
      .then((p) => {
        if (signal.aborted) return null
        parcelle.value = p
        onParcelle(p?.geometry ?? null)
        return p ? getMarche(p, typeLocal, signal) : null
      })
      .then((m) => {
        if (!signal.aborted && m) marche.value = m
      })
      .catch((e) => erreur(signal, `Cadastre / ventes indisponibles (${(e as Error).message})`))
    getRisques(lat, lon, signal)
      .then((r) => {
        if (!signal.aborted) risques.value = r
      })
      .catch((e) => erreur(signal, `Géorisques indisponible (${(e as Error).message})`))
    getUrbanisme(lat, lon, signal)
      .then((u) => {
        if (!signal.aborted) urbanisme.value = u
      })
      .catch((e) => erreur(signal, `Urbanisme (PLU) indisponible (${(e as Error).message})`))
  }

  async function charger(d: Dpe) {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    loading.value = true
    errors.value = []
    detail.value = null
    history.value = []
    oldDpes.value = []
    audits.value = []
    parcelle.value = null
    marche.value = null
    risques.value = null
    urbanisme.value = null
    onParcelle(null)

    chargerTerritoire(d, signal)

    const ban = d.identifiant_ban
    const [det, h, o, a] = await Promise.allSettled([
      getDpeDetail(d.numero_dpe, d._source, signal),
      ban ? getAddressHistory(ban, signal) : Promise.resolve([]),
      getOldDpes(d, signal),
      ban ? getAudits(ban, signal) : Promise.resolve([]),
    ])
    if (signal.aborted) return
    if (det.status === 'fulfilled') detail.value = det.value
    else erreur(signal, 'Détail du DPE indisponible')
    if (h.status === 'fulfilled') history.value = h.value
    else erreur(signal, "Historique de l'adresse indisponible")
    if (o.status === 'fulfilled') oldDpes.value = o.value
    else erreur(signal, "DPE d'avant 2021 indisponibles")
    if (a.status === 'fulfilled') audits.value = a.value
    else erreur(signal, 'Audits indisponibles')
    loading.value = false
  }

  watch(
    () => dpe.value.numero_dpe,
    () => charger(dpe.value),
    { immediate: true },
  )

  return { detail, history, oldDpes, audits, parcelle, marche, risques, urbanisme, loading, errors }
}
