// API data-fair de l'ADEME : base « DPE Logements existants (depuis juillet 2021) ».
// Publique, sans clé, CORS ouvert. Filtres appliqués côté serveur.
// Doc : https://data.ademe.fr/datasets/dpe03existant/api-doc

import type { Commune } from './geo'

const API = 'https://data.ademe.fr/data-fair/api/v1/datasets'
const DATASET_URL = `${API}/dpe03existant`
// Logements neufs (permis après 2021) : même schéma, base séparée
const NEUF_URL = `${API}/g3cgx7jb3cmys5voxz1mrm22`

export type Source = 'existant' | 'neuf'
const SOURCES: Record<Source, string> = { existant: DATASET_URL, neuf: NEUF_URL }
// DPE d'avant la réforme de juillet 2021 (méthode et étiquettes différentes)
const OLD_DPE_URL = `${API}/dpe-france`
// Audits énergétiques (obligatoires pour vendre une maison F ou G depuis 2023)
const AUDIT_URL = `${API}/ync2epx48x9azbdnggbygqp0`

export const ETIQUETTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type Etiquette = (typeof ETIQUETTES)[number]
export type TypeBatiment = 'maison' | 'appartement' | 'immeuble'

const FIELDS = [
  'numero_dpe',
  'date_etablissement_dpe',
  'etiquette_dpe',
  'etiquette_ges',
  'type_batiment',
  'surface_habitable_logement',
  'annee_construction',
  'periode_construction',
  'conso_5_usages_par_m2_ep',
  'emission_ges_5_usages_par_m2',
  'type_energie_principale_chauffage',
  'adresse_ban',
  'nom_commune_ban',
  'code_postal_ban',
  'complement_adresse_logement',
  'numero_etage_appartement',
  'cout_total_5_usages',
  'identifiant_ban',
  'date_visite_diagnostiqueur',
  '_geopoint',
] as const

export interface Dpe {
  numero_dpe: string
  date_etablissement_dpe?: string
  etiquette_dpe?: Etiquette
  etiquette_ges?: Etiquette
  type_batiment?: TypeBatiment
  surface_habitable_logement?: number
  annee_construction?: number
  periode_construction?: string
  conso_5_usages_par_m2_ep?: number
  emission_ges_5_usages_par_m2?: number
  type_energie_principale_chauffage?: string
  adresse_ban?: string
  nom_commune_ban?: string
  code_postal_ban?: string
  complement_adresse_logement?: string
  numero_etage_appartement?: number
  cout_total_5_usages?: number
  identifiant_ban?: string
  date_visite_diagnostiqueur?: string
  _geopoint?: string // "lat,lon"
  _geo_distance?: number // mètres, présent si recherche par rayon
  _source?: Source // ajouté côté client : base d'origine
}

export interface DpeFilters {
  communes: Commune[]
  rayonKm: number | null // null = uniquement les communes sélectionnées
  etiquettesDpe: Etiquette[]
  etiquettesGes: Etiquette[]
  types: TypeBatiment[]
  surfaceMin: number | null
  surfaceMax: number | null
  dateMin: string | null // AAAA-MM-JJ, incluse
  dateMax: string | null // AAAA-MM-JJ, incluse
  consoEp: number | null // kWh/m²/an affiché sur l'annonce
  ges: number | null // kg CO₂/m²/an affiché sur l'annonce
  coutMin: number | null // fourchette « dépenses annuelles d'énergie » de l'annonce
  coutMax: number | null
  inclureNeufs: boolean
  periodes: Periode[]
  energies: Energie[]
  pompeAChaleur: boolean
  plainPied: boolean
  avecPhotovoltaique: boolean
  confortEteBon: boolean
}

// Périodes de construction telles qu'écrites dans la base (toujours renseignées,
// contrairement à l'année exacte, absente d'environ 40 % des DPE de maisons)
export const PERIODES = [
  'avant 1948',
  '1948-1974',
  '1975-1977',
  '1978-1982',
  '1983-1988',
  '1989-2000',
  '2001-2005',
  '2006-2012',
  '2013-2021',
  'après 2021',
] as const
export type Periode = (typeof PERIODES)[number]

// Énergie principale de chauffage, regroupée en familles lisibles
export const ENERGIES = {
  electricite: { label: 'Électricité', valeurs: ['Électricité', "Électricité d'origine renouvelable utilisée dans le bâtiment"] },
  gaz: { label: 'Gaz', valeurs: ['Gaz naturel'] },
  bois: {
    label: 'Bois',
    valeurs: [
      'Bois – Bûches',
      'Bois – Granulés (pellets) ou briquettes',
      'Bois – Plaquettes forestières',
      'Bois – Plaquettes d’industrie',
    ],
  },
  reseau: { label: 'Réseau de chaleur', valeurs: ['Réseau de Chauffage urbain'] },
  fioul: { label: 'Fioul', valeurs: ['Fioul domestique'] },
  gpl: { label: 'GPL / propane', valeurs: ['GPL', 'Propane', 'Butane'] },
} as const
export type Energie = keyof typeof ENERGIES

// Les annonces affichent des entiers, la base a parfois une décimale (141,5 → « 142 »)
const ROUNDING = 0.5

interface LinesResponse {
  total: number
  next?: string
  results: Dpe[]
}

// Une « zone » = une requête. Les communes sans rayon tiennent en une seule
// requête (code_insee_ban_in). Avec un rayon, une requête par commune, car
// l'API n'accepte qu'un seul centre geo_distance.
export interface ZoneCursor {
  label: string
  source: Source
  total: number
  next?: string
}

const PAGE_SIZE = 500

function buildParams(filters: DpeFilters): URLSearchParams {
  const p = new URLSearchParams({
    size: String(PAGE_SIZE),
    select: FIELDS.join(','),
    sort: '-date_etablissement_dpe',
  })
  if (filters.etiquettesDpe.length) p.set('etiquette_dpe_in', filters.etiquettesDpe.join(','))
  if (filters.etiquettesGes.length) p.set('etiquette_ges_in', filters.etiquettesGes.join(','))
  if (filters.types.length) p.set('type_batiment_in', filters.types.join(','))
  if (filters.surfaceMin != null) p.set('surface_habitable_logement_gte', String(filters.surfaceMin))
  if (filters.surfaceMax != null) p.set('surface_habitable_logement_lte', String(filters.surfaceMax))
  if (filters.dateMin) p.set('date_etablissement_dpe_gte', filters.dateMin)
  if (filters.dateMax) p.set('date_etablissement_dpe_lte', filters.dateMax)
  if (filters.consoEp != null) {
    p.set('conso_5_usages_par_m2_ep_gte', String(filters.consoEp - ROUNDING))
    p.set('conso_5_usages_par_m2_ep_lte', String(filters.consoEp + ROUNDING))
  }
  if (filters.ges != null) {
    p.set('emission_ges_5_usages_par_m2_gte', String(filters.ges - ROUNDING))
    p.set('emission_ges_5_usages_par_m2_lte', String(filters.ges + ROUNDING))
  }
  // Le coût du DPE est la valeur centrale de la fourchette affichée sur l'annonce
  if (filters.coutMin != null) p.set('cout_total_5_usages_gte', String(filters.coutMin))
  if (filters.coutMax != null) p.set('cout_total_5_usages_lte', String(filters.coutMax))
  if (filters.periodes.length) p.set('periode_construction_in', filters.periodes.join(','))
  if (filters.energies.length)
    p.set('type_energie_principale_chauffage_in', filters.energies.flatMap((e) => ENERGIES[e].valeurs).join(','))
  // Le type de générateur est un libellé libre (« PAC air/eau installée après 2017 »…) : recherche par préfixe
  if (filters.pompeAChaleur) p.set('qs', 'type_generateur_chauffage_principal:PAC*')
  if (filters.plainPied) p.set('nombre_niveau_logement_eq', '1')
  if (filters.avecPhotovoltaique) p.set('presence_production_pv_eq', '1')
  if (filters.confortEteBon) p.set('indicateur_confort_ete_eq', 'bon')
  return p
}

async function fetchLines(url: string, signal?: AbortSignal): Promise<LinesResponse> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`API ADEME : HTTP ${res.status}`)
  return res.json()
}

export interface SearchResult {
  results: Dpe[]
  zones: ZoneCursor[]
}

const tag = (list: Dpe[], source: Source) => list.map((d) => ({ ...d, _source: source }))

export async function searchDpe(filters: DpeFilters, signal?: AbortSignal): Promise<SearchResult> {
  const base = buildParams(filters)
  const sources: Source[] = filters.inclureNeufs ? ['existant', 'neuf'] : ['existant']
  const requests: { label: string; source: Source; url: string }[] = []

  for (const source of sources) {
    const suffix = source === 'neuf' ? ' (neufs)' : ''
    if (filters.rayonKm) {
      for (const c of filters.communes) {
        const p = new URLSearchParams(base)
        p.set('geo_distance', `${c.lon},${c.lat},${filters.rayonKm}km`)
        requests.push({ label: `${c.nom} + ${filters.rayonKm} km${suffix}`, source, url: `${SOURCES[source]}/lines?${p}` })
      }
    } else {
      const p = new URLSearchParams(base)
      p.set('code_insee_ban_in', filters.communes.map((c) => c.code).join(','))
      requests.push({
        label: filters.communes.map((c) => c.nom).join(', ') + suffix,
        source,
        url: `${SOURCES[source]}/lines?${p}`,
      })
    }
  }

  const responses = await Promise.all(requests.map((r) => fetchLines(r.url, signal)))
  return {
    results: dedupe(responses.flatMap((r, i) => tag(r.results, requests[i].source))),
    zones: responses.map((r, i) => ({ label: requests[i].label, source: requests[i].source, total: r.total, next: r.next })),
  }
}

export async function loadMore(zones: ZoneCursor[], signal?: AbortSignal): Promise<SearchResult> {
  const pending = zones.filter((z) => z.next)
  const responses = await Promise.all(pending.map((z) => fetchLines(z.next!, signal)))
  const updated = zones.map((z) => {
    const i = pending.indexOf(z)
    return i === -1 ? z : { ...z, next: responses[i].next }
  })
  return { results: responses.flatMap((r, i) => tag(r.results, pending[i].source)), zones: updated }
}

// Les rayons de plusieurs communes peuvent se chevaucher
export function dedupe(list: Dpe[]): Dpe[] {
  const seen = new Set<string>()
  return list.filter((d) => !seen.has(d.numero_dpe) && seen.add(d.numero_dpe))
}

export async function getDatasetUpdatedAt(): Promise<string | null> {
  try {
    const res = await fetch(`${DATASET_URL}?select=dataUpdatedAt`)
    const meta = await res.json()
    return meta.dataUpdatedAt ?? null
  } catch {
    return null
  }
}

export function parseGeopoint(d: Dpe): [number, number] | null {
  if (!d._geopoint) return null
  const [lat, lon] = d._geopoint.split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
}

export function observatoireUrl(numero: string): string {
  return `https://observatoire-dpe-audit.ademe.fr/afficher-dpe/${encodeURIComponent(numero)}`
}

// Couleurs officielles de l'étiquette énergie
export const DPE_COLORS: Record<Etiquette, string> = {
  A: '#009c6d',
  B: '#52b153',
  C: '#a5cc74',
  D: '#f4e70f',
  E: '#f0b40f',
  F: '#eb8235',
  G: '#d7221f',
}

// Une même adresse peut avoir plusieurs DPE (refaits, remplacés, doublons de saisie).
// On garde le plus récent. Le complément (bât., étage, n° de lot) distingue les appartements.
export function latestPerAddress(list: Dpe[]): Dpe[] {
  const byKey = new Map<string, Dpe>()
  const withoutAddress: Dpe[] = []
  for (const d of list) {
    if (!d.adresse_ban) {
      withoutAddress.push(d)
      continue
    }
    const key = [d.adresse_ban, d.complement_adresse_logement, d.numero_etage_appartement]
      .map((v) => String(v ?? '').trim().toLowerCase())
      .join('|')
    const current = byKey.get(key)
    if (!current || (d.date_etablissement_dpe ?? '') > (current.date_etablissement_dpe ?? '')) byKey.set(key, d)
  }
  return [...byKey.values(), ...withoutAddress]
}

// ---------------------------------------------------------------------------
// Fiche détaillée d'un DPE
// ---------------------------------------------------------------------------

const DETAIL_FIELDS = [
  ...FIELDS,
  'date_fin_validite_dpe',
  'numero_dpe_remplace',
  'methode_application_dpe',
  'appartement_non_visite',
  'version_dpe',
  'nombre_niveau_logement',
  'hauteur_sous_plafond',
  'zone_climatique',
  'classe_altitude',
  'conso_5_usages_par_m2_ef',
  'cout_chauffage',
  'cout_ecs',
  'cout_refroidissement',
  'cout_eclairage',
  'cout_auxiliaires',
  'type_generateur_chauffage_principal',
  'type_energie_principale_ecs',
  'type_generateur_chauffage_principal_ecs',
  'type_ventilation',
  'type_generateur_froid',
  'presence_production_pv',
  'production_electricite_pv_kwhep_par_an',
  'indicateur_confort_ete',
  'qualite_isolation_enveloppe',
  'qualite_isolation_murs',
  'qualite_isolation_plancher_bas',
  'qualite_isolation_plancher_haut_comble_amenage',
  'qualite_isolation_plancher_haut_comble_perdu',
  'qualite_isolation_plancher_haut_toit_terrasse',
  'qualite_isolation_menuiseries',
  'ubat_w_par_m2_k',
  'deperditions_murs',
  'deperditions_planchers_hauts',
  'deperditions_planchers_bas',
  'deperditions_portes',
  'deperditions_baies_vitrees',
  'deperditions_ponts_thermiques',
  'deperditions_renouvellement_air',
  'id_rnb',
] as const

export type Qualite = 'insuffisante' | 'moyenne' | 'bonne' | 'très bonne'

export interface DpeDetail extends Dpe {
  date_fin_validite_dpe?: string
  numero_dpe_remplace?: string
  methode_application_dpe?: string
  appartement_non_visite?: number
  version_dpe?: number
  nombre_niveau_logement?: number
  hauteur_sous_plafond?: number
  zone_climatique?: string
  classe_altitude?: string
  conso_5_usages_par_m2_ef?: number
  cout_chauffage?: number
  cout_ecs?: number
  cout_refroidissement?: number
  cout_eclairage?: number
  cout_auxiliaires?: number
  type_generateur_chauffage_principal?: string
  type_energie_principale_ecs?: string
  type_generateur_chauffage_principal_ecs?: string
  type_ventilation?: string
  type_generateur_froid?: string
  presence_production_pv?: number
  production_electricite_pv_kwhep_par_an?: number
  indicateur_confort_ete?: 'insuffisant' | 'moyen' | 'bon'
  qualite_isolation_enveloppe?: Qualite
  qualite_isolation_murs?: Qualite
  qualite_isolation_plancher_bas?: Qualite
  qualite_isolation_plancher_haut_comble_amenage?: Qualite
  qualite_isolation_plancher_haut_comble_perdu?: Qualite
  qualite_isolation_plancher_haut_toit_terrasse?: Qualite
  qualite_isolation_menuiseries?: Qualite
  ubat_w_par_m2_k?: number
  deperditions_murs?: number
  deperditions_planchers_hauts?: number
  deperditions_planchers_bas?: number
  deperditions_portes?: number
  deperditions_baies_vitrees?: number
  deperditions_ponts_thermiques?: number
  deperditions_renouvellement_air?: number
  id_rnb?: string
}

// Champs de la fiche absents de la base des neufs (un select inconnu renvoie une erreur 400)
const ABSENTS_NEUF = new Set(['qualite_isolation_plancher_haut_comble_perdu', 'qualite_isolation_plancher_haut_toit_terrasse'])

export async function getDpeDetail(
  numero: string,
  source: Source = 'existant',
  signal?: AbortSignal,
): Promise<DpeDetail | null> {
  const fields = source === 'neuf' ? DETAIL_FIELDS.filter((f) => !ABSENTS_NEUF.has(f)) : DETAIL_FIELDS
  const p = new URLSearchParams({ size: '1', numero_dpe_eq: numero, select: fields.join(',') })
  const r = await fetchLines(`${SOURCES[source]}/lines?${p}`, signal)
  return r.results[0] ? ({ ...r.results[0], _source: source } as DpeDetail) : null
}

// Tous les DPE (depuis 2021, existants et neufs) de la même adresse BAN, du plus ancien au plus récent
export async function getAddressHistory(identifiantBan: string, signal?: AbortSignal): Promise<Dpe[]> {
  const p = new URLSearchParams({
    size: '100',
    identifiant_ban_eq: identifiantBan,
    sort: 'date_etablissement_dpe',
    select: FIELDS.join(','),
  })
  const parts = await Promise.all(
    (Object.keys(SOURCES) as Source[]).map(async (source) =>
      tag((await fetchLines(`${SOURCES[source]}/lines?${p}`, signal)).results, source),
    ),
  )
  return parts.flat().sort((a, b) => (a.date_etablissement_dpe ?? '').localeCompare(b.date_etablissement_dpe ?? ''))
}

export interface OldDpe {
  numero_dpe: string
  date_etablissement_dpe?: string
  classe_consommation_energie?: string // A…G, ou N = non applicable
  consommation_energie?: number
  classe_estimation_ges?: string
  surface_thermique_lot?: number
  geo_adresse?: string
  tr002_type_batiment_description?: string
}

function normalizeAddress(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// La base d'avant 2021 n'a pas d'identifiant BAN : on cherche autour du point,
// puis on ne garde que la même adresse écrite.
export async function getOldDpes(d: Dpe, signal?: AbortSignal): Promise<OldDpe[]> {
  const pt = parseGeopoint(d)
  if (!pt || !d.adresse_ban) return []
  const p = new URLSearchParams({
    size: '100',
    geo_distance: `${pt[1]},${pt[0]},50m`,
    sort: 'date_etablissement_dpe',
    select:
      'numero_dpe,date_etablissement_dpe,classe_consommation_energie,consommation_energie,classe_estimation_ges,surface_thermique_lot,geo_adresse,tr002_type_batiment_description',
  })
  const res = await fetch(`${OLD_DPE_URL}/lines?${p}`, { signal })
  if (!res.ok) throw new Error(`API ADEME (DPE avant 2021) : HTTP ${res.status}`)
  const { results } = (await res.json()) as { results: OldDpe[] }
  const target = normalizeAddress(d.adresse_ban)
  return results.filter(
    (o) => o.geo_adresse && normalizeAddress(o.geo_adresse) === target && o.classe_consommation_energie !== 'N',
  )
}

export interface AuditEtape {
  n_audit: string
  date_etablissement_audit?: string
  categorie_scenario?: string
  etape_travaux?: string
  classe_bilan_dpe?: Etiquette
  cout_travaux?: number
  couts_cumules_travaux?: number
  travaux_realises?: string
  ep_conso_5_usages_m2?: number
}

export interface Audit {
  numero: string
  date?: string
  etapes: AuditEtape[]
}

export async function getAudits(identifiantBan: string, signal?: AbortSignal): Promise<Audit[]> {
  const p = new URLSearchParams({
    size: '200',
    identifiant_ban_eq: identifiantBan,
    select:
      'n_audit,date_etablissement_audit,categorie_scenario,etape_travaux,classe_bilan_dpe,cout_travaux,couts_cumules_travaux,travaux_realises,ep_conso_5_usages_m2',
  })
  const res = await fetch(`${AUDIT_URL}/lines?${p}`, { signal })
  if (!res.ok) throw new Error(`API ADEME (audits) : HTTP ${res.status}`)
  const { results } = (await res.json()) as { results: AuditEtape[] }
  const byAudit = new Map<string, Audit>()
  for (const e of results) {
    const a = byAudit.get(e.n_audit) ?? { numero: e.n_audit, date: e.date_etablissement_audit, etapes: [] }
    a.etapes.push(e)
    byAudit.set(e.n_audit, a)
  }
  return [...byAudit.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}
