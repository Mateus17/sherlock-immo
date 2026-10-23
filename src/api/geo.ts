// API Géo (geo.api.gouv.fr) : référentiel officiel des communes, sans clé.

import { getJson } from '../lib/http'

export interface Commune {
  nom: string
  code: string // code INSEE
  codesPostaux: string[]
  departement?: string
  lon: number
  lat: number
}

interface GeoApiCommune {
  nom: string
  code: string
  codesPostaux: string[]
  codeDepartement?: string
  centre?: { coordinates: [number, number] }
}

// Saisies acceptées :
//   « 35000 »              → code postal
//   « Saint-Martin »       → nom
//   « Saint-Martin 35 »    → nom + département (dès 2 caractères : 35, 2A, 971…)
//   « Saint-Martin 35190 » → nom + code postal
// Un n° de département incomplet (« 3 », « 97 ») est ignoré tant qu'il n'est pas fini.
export interface CommuneQuery {
  nom: string
  dep?: string
  codePostal?: string
}

const isFullDep = (dep: string) => /^(\d{2}|2[AB]|97\d)$/.test(dep) && dep !== '97'

export function parseCommuneQuery(query: string): CommuneQuery {
  const q = query.trim().replace(/\s+/g, ' ')
  if (/^\d{5}$/.test(q)) return { nom: '', codePostal: q }
  const m = q.match(/^(.*\S)\s+(\d{5}|\d[\dab]?\d?)$/i)
  if (!m || m[1].length < 2) return { nom: q }
  const suffix = m[2].toUpperCase()
  if (suffix.length === 5) return { nom: m[1], codePostal: suffix }
  return isFullDep(suffix) ? { nom: m[1], dep: suffix } : { nom: m[1] }
}

// Clé de la recherche réellement envoyée : deux saisies de même clé = même résultat
export function communeQueryKey(q: CommuneQuery): string {
  return [q.nom.toLowerCase(), q.dep ?? '', q.codePostal ?? ''].join('|')
}

export async function searchCommunes(q: CommuneQuery, signal?: AbortSignal): Promise<Commune[]> {
  const { nom, dep, codePostal } = q
  if (!codePostal && nom.length < 2) return []

  const params = new URLSearchParams({
    fields: 'nom,code,codesPostaux,codeDepartement,centre',
    boost: 'population',
    limit: '10',
  })
  if (nom) params.set('nom', nom)
  if (codePostal) params.set('codePostal', codePostal)
  if (dep) params.set('codeDepartement', dep)

  const data = await getJson<GeoApiCommune[]>(`https://geo.api.gouv.fr/communes?${params}`, {
    service: 'API Géo',
    signal,
  })

  return data
    .filter((c) => c.centre)
    .map((c) => ({
      nom: c.nom,
      code: c.code,
      codesPostaux: c.codesPostaux,
      departement: c.codeDepartement,
      lon: c.centre!.coordinates[0],
      lat: c.centre!.coordinates[1],
    }))
}

export interface NearbyCommune extends Commune {
  distanceKm: number
  population?: number
}

interface GeoApiCommuneFull extends GeoApiCommune {
  population?: number
}

// Le module réseau met en cache : chaque département n'est téléchargé qu'une fois
async function fetchDepartementCommunes(dep: string): Promise<NearbyCommune[]> {
  const list = await getJson<GeoApiCommuneFull[]>(
    `https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom,code,codesPostaux,codeDepartement,centre,population`,
    { service: 'API Géo' },
  )
  return list
    .filter((c) => c.centre)
    .map((c) => ({
      nom: c.nom,
      code: c.code,
      codesPostaux: c.codesPostaux,
      departement: c.codeDepartement,
      lon: c.centre!.coordinates[0],
      lat: c.centre!.coordinates[1],
      population: c.population,
      distanceKm: 0,
    }))
}

async function departementAt(lat: number, lon: number): Promise<string | null> {
  // Coordonnées arrondies (~100 m) pour que le cache serve d'une recherche à l'autre
  const [la, lo] = [lat.toFixed(3), lon.toFixed(3)]
  const [c] = await getJson<GeoApiCommune[]>(
    `https://geo.api.gouv.fr/communes?lat=${la}&lon=${lo}&fields=codeDepartement`,
    {
      service: 'API Géo',
    },
  )
  return c?.codeDepartement ?? null
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// Point à `km` du centre dans la direction `angle` (approximation suffisante à cette échelle)
function offset(center: Commune, km: number, angle: number) {
  const lat = center.lat + (km / 111.32) * Math.cos(angle)
  const lon = center.lon + (km / (111.32 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle)
  return { lat, lon }
}

// Communes dont le centre est à moins de `radiusKm`, triées par distance.
// On ne charge que les départements touchés par le cercle (sondés en 8 points).
export async function nearbyCommunes(center: Commune, radiusKm: number): Promise<NearbyCommune[]> {
  const probes = Array.from({ length: 8 }, (_, i) => offset(center, radiusKm, (i * Math.PI) / 4))
  const deps = new Set<string>(center.departement ? [center.departement] : [])
  const found = await Promise.all(probes.map((p) => departementAt(p.lat, p.lon).catch(() => null)))
  found.forEach((d) => d && deps.add(d))

  const all = (await Promise.all([...deps].map(fetchDepartementCommunes))).flat()
  return all
    .filter((c) => c.code !== center.code)
    .map((c) => ({ ...c, distanceKm: distanceKm(center, c) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

// Commune par code INSEE (pour rouvrir une recherche partagée par lien)
export async function getCommune(code: string, signal?: AbortSignal): Promise<Commune | null> {
  try {
    const c = await getJson<GeoApiCommune>(
      `https://geo.api.gouv.fr/communes/${encodeURIComponent(code)}?fields=nom,code,codesPostaux,codeDepartement,centre`,
      { service: 'API Géo', signal },
    )
    if (!c.centre) return null
    return {
      nom: c.nom,
      code: c.code,
      codesPostaux: c.codesPostaux,
      departement: c.codeDepartement,
      lon: c.centre.coordinates[0],
      lat: c.centre.coordinates[1],
    }
  } catch {
    return null
  }
}
