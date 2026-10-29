// Lecture des données hébergées (« miroir ») : les DPE par type de bien, servis avec le site.
// Une recherche télécharge le fichier de chaque commune concernée, puis filtre dans le
// navigateur : aucun appel à l'API de l'ADEME, donc aucun quota. Si les fichiers sont absents
// (développement, fork pas encore construit) ou ne couvrent pas la recherche, l'application
// interroge l'API comme avant.

import type { Dpe, DpeFilters, TypeBatiment } from '../api/dpe'
import { codesInsee, distanceKm, nearbyCommunes, type Commune } from '../api/geo'
import {
  VERSION_FORMAT,
  banDe,
  cheminCommune,
  coordonnees,
  decoderLigne,
  filtrerLignes,
  partieDe,
  type FichierCommune,
  type IndexMiroir,
  type PartieMiroir,
} from './miroir-format'

const url = (chemin: string) => new URL(`donnees/${chemin}`, document.baseURI).href

let index: Promise<IndexMiroir | null> | null = null

export function disponible(): Promise<IndexMiroir | null> {
  index ??= fetch(url('index.json'), { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<IndexMiroir | (PartieMiroir & { version: 1 })>) : null))
    .then((i) => {
      // Format 1 : maisons seules, index à la racine ; mêmes fichiers et mêmes colonnes qu'en 2
      if (i?.version === 1) {
        const maison = i as PartieMiroir
        return { version: VERSION_FORMAT, genere_le: maison.genere_le, types: { maison: [maison] } }
      }
      return i?.version === VERSION_FORMAT ? (i as IndexMiroir) : null
    })
    .catch(() => null)
  return index
}

// Types de bien hébergés parmi ceux demandés
export async function typesHeberges(types: TypeBatiment[]): Promise<TypeBatiment[]> {
  const idx = await disponible()
  return idx ? types.filter((t) => idx.types[t]?.length) : []
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

// Fichier d'une commune ; null si la commune n'a aucun DPE de ce type
function commune(insee: string, type: TypeBatiment): Promise<FichierCommune | null> {
  const chemin = cheminCommune(insee, type)
  let f = fichiers.get(chemin)
  if (!f) {
    f = fetch(url(chemin)).then(async (r) => {
      // 404 sur GitHub Pages ; le serveur de développement renvoie la page HTML à la place
      if (r.status === 404 || r.headers.get('content-type')?.includes('text/html')) return null
      if (!r.ok) throw new Error(`Données hébergées : erreur ${r.status}`)
      return JSON.parse(await lireGzip(await r.arrayBuffer())) as FichierCommune
    })
    f.catch(() => fichiers.delete(chemin))
    fichiers.set(chemin, f)
  }
  return f
}

export interface ResultatMiroir {
  type: TypeBatiment
  existants: Dpe[]
  neufs: Dpe[]
}

// Un résultat par type demandé ; null si une des communes à lire n'est pas couverte
export async function rechercher(
  filters: DpeFilters,
  types: TypeBatiment[],
  signal?: AbortSignal,
): Promise<ResultatMiroir[] | null> {
  const idx = await disponible()
  if (!idx) throw new Error('Données hébergées indisponibles')

  // Communes à lire : celles choisies, plus, avec un rayon, toutes celles dont le centre est
  // à moins de rayon + 3 km (un logement peut être dans le rayon sans que le centre de sa commune y soit)
  const centres: Commune[] = filters.communes
  const choisies = [...centres]
  if (filters.rayonKm) {
    const autour = await Promise.all(centres.map((c) => nearbyCommunes(c, filters.rayonKm! + 3)))
    choisies.push(...autour.flat())
  }
  const codes = [...new Set(choisies.flatMap((c) => codesInsee(c.code)))]
  if (signal?.aborted) throw new DOMException('Abandon', 'AbortError')
  if (!types.every((t) => codes.every((c) => partieDe(idx, t, c)))) return null

  return Promise.all(
    types.map(async (type) => {
      const lus = await Promise.all(codes.map((c) => commune(c, type)))
      const resultat: ResultatMiroir = { type, existants: [], neufs: [] }
      for (const f of lus) {
        if (!f) continue
        const { dict } = partieDe(idx, type, f.insee)!
        for (const l of filtrerLignes(f.lignes, filters, dict)) {
          const d = decoderLigne(l, f, dict, type)
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
    }),
  )
}

// Tous les DPE d'un type à une même adresse BAN (« 35238_1310_00032 »), du plus ancien au plus
// récent ; null si ce type ou cette commune ne sont pas couverts par les données hébergées
export async function historique(identifiantBan: string, type: TypeBatiment): Promise<Dpe[] | null> {
  const idx = await disponible()
  const insee = identifiantBan.split('_')[0]
  const partie = idx && partieDe(idx, type, insee)
  if (!partie) return null
  const f = await commune(insee, type)
  if (!f) return []
  return f.lignes
    .filter((l) => banDe(l, f.insee) === identifiantBan)
    .map((l) => decoderLigne(l, f, partie.dict, type))
    .sort((a, b) => (a.date_etablissement_dpe ?? '').localeCompare(b.date_etablissement_dpe ?? ''))
}
