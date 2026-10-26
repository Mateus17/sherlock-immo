// Lecture des données hébergées (« miroir ») : les DPE de maisons, servis avec le site.
// Une recherche télécharge le fichier de chaque commune concernée, puis filtre dans le
// navigateur : aucun appel à l'API de l'ADEME, donc aucun quota. Si les fichiers sont absents
// (développement, fork pas encore construit), disponible() renvoie null et l'application
// interroge l'API comme avant.

import type { Dpe, DpeFilters } from '../api/dpe'
import { distanceKm, nearbyCommunes, type Commune } from '../api/geo'
import {
  VERSION_FORMAT,
  banDe,
  cheminCommune,
  coordonnees,
  decoderLigne,
  filtrerLignes,
  type FichierCommune,
  type IndexMiroir,
} from './miroir-format'

const url = (chemin: string) => new URL(`donnees/${chemin}`, document.baseURI).href

let index: Promise<IndexMiroir | null> | null = null

export function disponible(): Promise<IndexMiroir | null> {
  index ??= fetch(url('index.json'), { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<IndexMiroir>) : null))
    .then((i) => (i?.version === VERSION_FORMAT ? i : null))
    .catch(() => null)
  return index
}

// Selon le serveur, un .gz arrive compressé (GitHub Pages : application/gzip) ou déjà
// décompressé par le navigateur (serveur de développement : Content-Encoding: gzip).
// La signature gzip (1f 8b) tranche.
async function lireGzip(octets: ArrayBuffer): Promise<string> {
  const debut = new Uint8Array(octets, 0, 2)
  if (debut[0] !== 0x1f || debut[1] !== 0x8b) return new TextDecoder().decode(octets)
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(flux).text()
}

const fichiers = new Map<string, Promise<FichierCommune | null>>()

// Fichier d'une commune ; null si la commune n'a aucun DPE de maison
function commune(insee: string): Promise<FichierCommune | null> {
  let f = fichiers.get(insee)
  if (!f) {
    f = fetch(url(cheminCommune(insee))).then(async (r) => {
      // 404 sur GitHub Pages ; le serveur de développement renvoie la page HTML à la place
      if (r.status === 404 || r.headers.get('content-type')?.includes('text/html')) return null
      if (!r.ok) throw new Error(`Données hébergées : erreur ${r.status}`)
      return JSON.parse(await lireGzip(await r.arrayBuffer())) as FichierCommune
    })
    f.catch(() => fichiers.delete(insee))
    fichiers.set(insee, f)
  }
  return f
}

export interface ResultatMiroir {
  existants: Dpe[]
  neufs: Dpe[]
}

export async function rechercher(filters: DpeFilters, signal?: AbortSignal): Promise<ResultatMiroir> {
  const idx = await disponible()
  if (!idx) throw new Error('Données hébergées indisponibles')

  // Communes à lire : celles choisies, plus, avec un rayon, toutes celles dont le centre est
  // à moins de rayon + 3 km (un logement peut être dans le rayon sans que le centre de sa commune y soit)
  const centres: Commune[] = filters.communes
  const codes = new Set(centres.map((c) => c.code))
  if (filters.rayonKm) {
    const autour = await Promise.all(centres.map((c) => nearbyCommunes(c, filters.rayonKm! + 3)))
    autour.flat().forEach((c) => codes.add(c.code))
  }
  if (signal?.aborted) throw new DOMException('Abandon', 'AbortError')

  const lus = await Promise.all([...codes].map(commune))
  const resultat: ResultatMiroir = { existants: [], neufs: [] }
  for (const f of lus) {
    if (!f) continue
    for (const l of filtrerLignes(f.lignes, filters, idx.dict)) {
      const d = decoderLigne(l, f, idx.dict)
      if (filters.rayonKm) {
        const pt = coordonnees(l)
        if (!pt) continue
        const km = Math.min(...centres.map((c) => distanceKm(c, { lat: pt[0], lon: pt[1] })))
        if (km > filters.rayonKm) continue
        d._geo_distance = km * 1000
      }
      ;(d._source === 'neuf' ? resultat.neufs : resultat.existants).push(d)
    }
  }
  return resultat
}

// Tous les DPE de maison d'une même adresse BAN (« 35238_1310_00032 »), du plus ancien au plus récent
export async function historique(identifiantBan: string): Promise<Dpe[]> {
  const idx = await disponible()
  if (!idx) throw new Error('Données hébergées indisponibles')
  const insee = identifiantBan.split('_')[0]
  const f = await commune(insee)
  if (!f) return []
  return f.lignes
    .filter((l) => banDe(l, f.insee) === identifiantBan)
    .map((l) => decoderLigne(l, f, idx.dict))
    .sort((a, b) => (a.date_etablissement_dpe ?? '').localeCompare(b.date_etablissement_dpe ?? ''))
}
