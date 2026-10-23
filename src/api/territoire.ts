// Données autour du logement, toutes publiques, sans clé, CORS ouvert :
// - cadastre et urbanisme (PLU) : API Carto de l'IGN
// - risques : Géorisques (rapport complet en un appel)
// - ventes passées : API de l'application DVF d'Etalab, par section cadastrale

import { getJson } from '../lib/http'

const APICARTO = 'https://apicarto.ign.fr/api'

type Polygon = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

function pointGeom(lat: number, lon: number) {
  return encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))
}

// Carré de ±`m` mètres autour du point (approximation suffisante à cette échelle)
function squareGeom(lat: number, lon: number, m: number) {
  const dLat = m / 111_320
  const dLon = m / (111_320 * Math.cos((lat * Math.PI) / 180))
  const ring = [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
    [lon - dLon, lat - dLat],
  ]
  return encodeURIComponent(JSON.stringify({ type: 'Polygon', coordinates: [ring] }))
}

const get = <T>(url: string, service: string, signal?: AbortSignal) => getJson<T>(url, { service, signal })

// ---------------------------------------------------------------------------
// Cadastre
// ---------------------------------------------------------------------------

export interface Parcelle {
  idu: string // ex. 35238000DE0042
  section: string
  numero: string
  contenance: number // surface cadastrale en m²
  codeInsee: string
  prefixe: string // « 000 » sauf communes associées
  geometry: Polygon
}

interface CadastreFeature {
  geometry: Polygon
  properties: {
    idu: string
    section: string
    numero: string
    contenance: number
    code_insee: string
    com_abs: string
  }
}

export async function getParcelle(lat: number, lon: number, signal?: AbortSignal): Promise<Parcelle | null> {
  const fc = await get<{ features: CadastreFeature[] }>(
    `${APICARTO}/cadastre/parcelle?geom=${pointGeom(lat, lon)}`,
    'Cadastre',
    signal,
  )
  const f = fc.features[0]
  if (!f) return null
  const p = f.properties
  return {
    idu: p.idu,
    section: p.section,
    numero: p.numero,
    contenance: p.contenance,
    codeInsee: p.code_insee,
    prefixe: p.com_abs || '000',
    geometry: f.geometry,
  }
}

// ---------------------------------------------------------------------------
// Urbanisme (Géoportail de l'urbanisme)
// ---------------------------------------------------------------------------

export interface ZoneUrba {
  libelle: string // ex. UE1a, 1AU, A, N
  libelong: string
  typezone: string // U, AUc, AUs, A, N…
  document: string // ex. 243500139_PLUI_20260917
  reglement?: string // lien vers le règlement, si fourni
}

interface ZoneFeature {
  properties: { libelle: string; libelong: string; typezone: string; idurba: string; urlfic: string }
}

const toZone = (f: ZoneFeature): ZoneUrba => ({
  libelle: f.properties.libelle,
  libelong: f.properties.libelong,
  typezone: f.properties.typezone,
  document: f.properties.idurba,
  reglement: f.properties.urlfic || undefined,
})

export interface Urbanisme {
  zone: ZoneUrba | null
  // Zones différentes à moins de ~150 m (à urbaniser, agricoles, naturelles…)
  voisines: ZoneUrba[]
}

export async function getUrbanisme(lat: number, lon: number, signal?: AbortSignal): Promise<Urbanisme> {
  const [ici, autour] = await Promise.all([
    get<{ features: ZoneFeature[] }>(`${APICARTO}/gpu/zone-urba?geom=${pointGeom(lat, lon)}`, 'Urbanisme', signal),
    get<{ features: ZoneFeature[] }>(
      `${APICARTO}/gpu/zone-urba?geom=${squareGeom(lat, lon, 150)}`,
      'Urbanisme',
      signal,
    ),
  ])
  const zone = ici.features[0] ? toZone(ici.features[0]) : null
  const seen = new Set<string>(zone ? [zone.libelle] : [])
  const voisines = autour.features.map(toZone).filter((z) => !seen.has(z.libelle) && seen.add(z.libelle))
  return { zone, voisines }
}

// ---------------------------------------------------------------------------
// Risques (Géorisques)
// ---------------------------------------------------------------------------

export interface Risque {
  cle: string
  libelle: string
  statutAdresse: string | null
  statutCommune: string | null
  technologique: boolean
}

export interface Risques {
  risques: Risque[] // seulement ceux présents sur la commune
  rapportUrl: string
}

interface GeorisquesItem {
  present: boolean
  libelle: string
  libelleStatutAdresse: string | null
  libelleStatutCommune: string | null
}

export async function getRisques(lat: number, lon: number, signal?: AbortSignal): Promise<Risques> {
  const r = await get<{
    url: string
    risquesNaturels: Record<string, GeorisquesItem>
    risquesTechnologiques: Record<string, GeorisquesItem>
  }>(`https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lon},${lat}`, 'Géorisques', signal)
  const list = (o: Record<string, GeorisquesItem>, technologique: boolean) =>
    Object.entries(o)
      .filter(([, v]) => v.present)
      .map(([cle, v]) => ({
        cle,
        libelle: v.libelle,
        statutAdresse: v.libelleStatutAdresse,
        statutCommune: v.libelleStatutCommune,
        technologique,
      }))
  return { risques: [...list(r.risquesNaturels, false), ...list(r.risquesTechnologiques, true)], rapportUrl: r.url }
}

// ---------------------------------------------------------------------------
// Ventes passées (DVF)
// ---------------------------------------------------------------------------

export interface DvfRow {
  id_mutation: string
  date_mutation: string
  nature_mutation: string
  valeur_fonciere: string
  id_parcelle: string
  type_local: string
  surface_reelle_bati: string
  nombre_pieces_principales: string
  surface_terrain: string
  adresse_numero: string
  adresse_nom_voie: string
}

export interface Vente {
  id: string
  date: string
  nature: string
  prix: number | null
  type: 'Maison' | 'Appartement' | 'Autre'
  surfaceBati: number | null // surface « réelle bâtie » déclarée aux impôts
  pieces: number | null
  terrain: number | null
  parcelles: string[]
  adresse: string
}

// L'API renvoie des chaînes, avec « nan » et « None » pour les vides
const num = (v: string | undefined) => {
  const n = Number(v)
  return v && v !== 'nan' && v !== 'None' && Number.isFinite(n) ? n : null
}

// Une mutation = plusieurs lignes (une par local et par parcelle) qui répètent le prix total
export function grouperVentes(rows: DvfRow[]): Vente[] {
  const byId = new Map<string, DvfRow[]>()
  for (const r of rows) byId.set(r.id_mutation, [...(byId.get(r.id_mutation) ?? []), r])
  return [...byId.entries()].map(([id, rs]) => {
    const locaux = rs.filter((r) => r.type_local === 'Maison' || r.type_local === 'Appartement')
    const terrains = new Map<string, number>()
    for (const r of rs) {
      const t = num(r.surface_terrain)
      if (t) terrains.set(r.id_parcelle, Math.max(terrains.get(r.id_parcelle) ?? 0, t))
    }
    const surf = locaux.reduce((s, r) => s + (num(r.surface_reelle_bati) ?? 0), 0)
    const r0 = rs[0]
    return {
      id,
      date: r0.date_mutation,
      nature: r0.nature_mutation,
      prix: num(r0.valeur_fonciere),
      type: locaux.length === 1 ? (locaux[0].type_local as 'Maison' | 'Appartement') : 'Autre',
      surfaceBati: surf || null,
      pieces: locaux.length === 1 ? num(locaux[0].nombre_pieces_principales) : null,
      terrain: terrains.size ? [...terrains.values()].reduce((a, b) => a + b, 0) : null,
      parcelles: [...new Set(rs.map((r) => r.id_parcelle))],
      adresse: [num(r0.adresse_numero) ?? '', r0.adresse_nom_voie].join(' ').trim(),
    }
  })
}

export interface MarcheLocal {
  ventesParcelle: Vente[]
  // Prix au m² des ventes simples (un seul logement) du même type dans la section, sur 3 ans
  comparables: Vente[]
  medianePrixM2: number | null
}

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export const prixM2 = (v: Vente) => (v.prix && v.surfaceBati ? v.prix / v.surfaceBati : null)

export async function getMarche(
  parcelle: Parcelle,
  type: 'Maison' | 'Appartement',
  signal?: AbortSignal,
): Promise<MarcheLocal> {
  const { mutations } = await get<{ mutations: DvfRow[] }>(
    `https://app.dvf.etalab.gouv.fr/api/mutations3/${parcelle.codeInsee}/${parcelle.prefixe}${parcelle.section}`,
    'DVF',
    signal,
  )
  const ventes = grouperVentes(mutations).filter((v) => v.nature.startsWith('Vente'))
  const depuis = new Date()
  depuis.setFullYear(depuis.getFullYear() - 3)
  const iso = depuis.toISOString().slice(0, 10)
  const comparables = ventes
    .filter((v) => v.type === type && v.date >= iso && prixM2(v) != null)
    // Écarte les valeurs aberrantes (ventes symboliques, erreurs de saisie)
    .filter((v) => prixM2(v)! > 300 && prixM2(v)! < 20_000)
    .sort((a, b) => b.date.localeCompare(a.date))
  return {
    ventesParcelle: ventes
      .filter((v) => v.parcelles.includes(parcelle.idu))
      .sort((a, b) => b.date.localeCompare(a.date)),
    comparables,
    medianePrixM2: median(comparables.map((v) => prixM2(v)!)),
  }
}
