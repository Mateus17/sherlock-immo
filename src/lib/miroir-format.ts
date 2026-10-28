// Format des données hébergées (« miroir ») : les DPE de maisons, un fichier par commune.
// Partagé entre le script qui construit les fichiers (scripts/donnees/) et l'application.
//
// Fichier d'une commune : donnees/maisons/{departement}/{insee}.json.gz
//   { "insee": "35238", "nom": "Rennes", "lignes": [[...], ...] }
// Chaque ligne est un tableau dans l'ordre de COLONNES. Les textes répétitifs (période,
// énergie, confort d'été) sont remplacés par leur position dans les dictionnaires de
// donnees/index.json. L'adresse est stockée sans « code postal + commune », reconstitués
// à la lecture. Mesuré : environ 42 octets par maison une fois compressé.

import { ENERGIES, type Dpe, type DpeFilters, type Etiquette, type Source } from '../api/dpe'

export const VERSION_FORMAT = 1

export const COLONNES = [
  'numero',
  'date',
  'visite',
  'dpe',
  'ges',
  'surface',
  'annee',
  'periode', // index dans dict.periodes
  'conso',
  'emission',
  'cout',
  'energie', // index dans dict.energies
  'pac', // 1 si le générateur principal est une pompe à chaleur
  'niveaux',
  'pv',
  'ete', // index dans dict.ete
  'rue', // adresse sans « code postal commune »
  'cp',
  'ban', // identifiant BAN sans le préfixe « insee_ »
  'complement',
  'lat',
  'lon',
  'source', // 0 = logement existant, 1 = neuf
] as const

export type Ligne = (string | number | null)[]

export interface Dictionnaires {
  periodes: string[]
  energies: string[]
  ete: string[]
}

export interface IndexMiroir {
  version: number
  genere_le: string // date de construction des fichiers
  maj_ademe: string | null // date de mise à jour de la base ADEME au moment de la construction
  lignes: number
  communes: number
  // Départements construits ; absent = toute la France. Une construction partielle
  // (développement, workflow lancé sur quelques départements) n'en couvre que certains.
  departements?: string[]
  dict: Dictionnaires
}

export interface FichierCommune {
  insee: string
  nom: string
  lignes: Ligne[]
}

const I = Object.fromEntries(COLONNES.map((c, i) => [c, i])) as Record<(typeof COLONNES)[number], number>

// Dossier d'un département : 2 caractères, 3 pour l'outre-mer (971…976)
export const departementDe = (insee: string) => (insee.startsWith('97') ? insee.slice(0, 3) : insee.slice(0, 2))
export const cheminCommune = (insee: string) => `maisons/${departementDe(insee)}/${insee}.json.gz`

// --- Construction (script Node) -------------------------------------------------------------

export interface LigneAdeme {
  numero_dpe: string
  date_etablissement_dpe?: string
  date_visite_diagnostiqueur?: string
  etiquette_dpe?: string
  etiquette_ges?: string
  surface_habitable_logement?: number
  annee_construction?: number
  periode_construction?: string
  conso_5_usages_par_m2_ep?: number
  emission_ges_5_usages_par_m2?: number
  cout_total_5_usages?: number
  type_energie_principale_chauffage?: string
  type_generateur_chauffage_principal?: string
  nombre_niveau_logement?: number
  presence_production_pv?: number
  indicateur_confort_ete?: string
  adresse_ban?: string
  code_postal_ban?: string
  code_insee_ban?: string
  nom_commune_ban?: string
  identifiant_ban?: string
  complement_adresse_logement?: string
  _geopoint?: string
}

// Champs à demander à l'API pour construire le miroir
export const CHAMPS_ADEME: (keyof LigneAdeme)[] = [
  'numero_dpe',
  'date_etablissement_dpe',
  'date_visite_diagnostiqueur',
  'etiquette_dpe',
  'etiquette_ges',
  'surface_habitable_logement',
  'annee_construction',
  'periode_construction',
  'conso_5_usages_par_m2_ep',
  'emission_ges_5_usages_par_m2',
  'cout_total_5_usages',
  'type_energie_principale_chauffage',
  'type_generateur_chauffage_principal',
  'nombre_niveau_logement',
  'presence_production_pv',
  'indicateur_confort_ete',
  'adresse_ban',
  'code_postal_ban',
  'code_insee_ban',
  'nom_commune_ban',
  'identifiant_ban',
  'complement_adresse_logement',
  '_geopoint',
]

function indexDans(liste: string[], v: string | undefined): number | null {
  if (v == null) return null
  let i = liste.indexOf(v)
  if (i < 0) i = liste.push(v) - 1
  return i
}

const arrondi5 = (n: number) => Math.round(n * 1e5) / 1e5

export function encoderLigne(r: LigneAdeme, source: Source, dict: Dictionnaires): Ligne {
  const insee = r.code_insee_ban ?? ''
  const suffixe = ` ${r.code_postal_ban} ${r.nom_commune_ban}`
  const adresse = r.adresse_ban ?? ''
  // « ! » en tête : adresse ou identifiant gardés tels quels (forme inattendue, rien à reconstituer)
  const rue = adresse.endsWith(suffixe) ? adresse.slice(0, -suffixe.length) : adresse && `!${adresse}`
  const ban = r.identifiant_ban ?? ''
  const [lat, lon] = r._geopoint ? r._geopoint.split(',').map(Number) : [NaN, NaN]
  const ligne: Ligne = new Array(COLONNES.length).fill(null)
  ligne[I.numero] = r.numero_dpe
  ligne[I.date] = r.date_etablissement_dpe ?? null
  ligne[I.visite] = r.date_visite_diagnostiqueur ?? null
  ligne[I.dpe] = r.etiquette_dpe ?? null
  ligne[I.ges] = r.etiquette_ges ?? null
  ligne[I.surface] = r.surface_habitable_logement ?? null
  ligne[I.annee] = r.annee_construction ?? null
  ligne[I.periode] = indexDans(dict.periodes, r.periode_construction)
  ligne[I.conso] = r.conso_5_usages_par_m2_ep ?? null
  ligne[I.emission] = r.emission_ges_5_usages_par_m2 ?? null
  ligne[I.cout] = r.cout_total_5_usages ?? null
  ligne[I.energie] = indexDans(dict.energies, r.type_energie_principale_chauffage)
  ligne[I.pac] = (r.type_generateur_chauffage_principal ?? '').startsWith('PAC') ? 1 : 0
  ligne[I.niveaux] = r.nombre_niveau_logement ?? null
  ligne[I.pv] = r.presence_production_pv ?? null
  ligne[I.ete] = indexDans(dict.ete, r.indicateur_confort_ete)
  ligne[I.rue] = rue || null
  ligne[I.cp] = r.code_postal_ban ?? null
  ligne[I.ban] = ban.startsWith(`${insee}_`) ? ban.slice(insee.length + 1) : ban ? `!${ban}` : null
  ligne[I.complement] = r.complement_adresse_logement ?? null
  ligne[I.lat] = Number.isFinite(lat) ? arrondi5(lat) : null
  ligne[I.lon] = Number.isFinite(lon) ? arrondi5(lon) : null
  ligne[I.source] = source === 'neuf' ? 1 : 0
  // Les valeurs nulles en fin de ligne sont inutiles : on les retire
  while (ligne.length && ligne[ligne.length - 1] === null) ligne.pop()
  return ligne
}

// --- Lecture (application) ------------------------------------------------------------------

const val = <T>(l: Ligne, c: (typeof COLONNES)[number]) => (l[I[c]] ?? undefined) as T | undefined

export function decoderLigne(l: Ligne, f: Pick<FichierCommune, 'insee' | 'nom'>, dict: Dictionnaires): Dpe {
  const rue = val<string>(l, 'rue')
  const cp = val<string>(l, 'cp')
  const ban = val<string>(l, 'ban')
  const lat = val<number>(l, 'lat')
  const lon = val<number>(l, 'lon')
  const periode = val<number>(l, 'periode')
  const energie = val<number>(l, 'energie')
  return {
    numero_dpe: l[I.numero] as string,
    date_etablissement_dpe: val(l, 'date'),
    date_visite_diagnostiqueur: val(l, 'visite'),
    etiquette_dpe: val<Etiquette>(l, 'dpe'),
    etiquette_ges: val<Etiquette>(l, 'ges'),
    type_batiment: 'maison',
    surface_habitable_logement: val(l, 'surface'),
    annee_construction: val(l, 'annee'),
    periode_construction: periode != null ? dict.periodes[periode] : undefined,
    conso_5_usages_par_m2_ep: val(l, 'conso'),
    emission_ges_5_usages_par_m2: val(l, 'emission'),
    cout_total_5_usages: val(l, 'cout'),
    type_energie_principale_chauffage: energie != null ? dict.energies[energie] : undefined,
    adresse_ban: rue?.startsWith('!')
      ? rue.slice(1)
      : rue
        ? `${rue} ${cp ?? ''} ${f.nom}`.replace(/\s+/g, ' ').trim()
        : undefined,
    nom_commune_ban: f.nom,
    code_postal_ban: cp,
    identifiant_ban: ban ? reconstituerBan(ban, f.insee) : undefined,
    complement_adresse_logement: val(l, 'complement'),
    _geopoint: lat != null && lon != null ? `${lat},${lon}` : undefined,
    _source: val<number>(l, 'source') === 1 ? 'neuf' : 'existant',
  }
}

// Mêmes règles que les filtres envoyés à l'API (voir buildParams dans api/dpe.ts)
const ARRONDI = 0.5

export function filtrerLignes(lignes: Ligne[], f: DpeFilters, dict: Dictionnaires): Ligne[] {
  const energies = new Set(f.energies.flatMap((e) => ENERGIES[e].valeurs as readonly string[]))
  const periodes = new Set<string>(f.periodes)
  const entre = (v: number | undefined, min: number | null, max: number | null) =>
    (min == null || (v != null && v >= min)) && (max == null || (v != null && v <= max))
  return lignes.filter((l) => {
    if (!f.inclureNeufs && val<number>(l, 'source') === 1) return false
    if (f.etiquettesDpe.length && !f.etiquettesDpe.includes(val<Etiquette>(l, 'dpe')!)) return false
    if (f.etiquettesGes.length && !f.etiquettesGes.includes(val<Etiquette>(l, 'ges')!)) return false
    if (!entre(val(l, 'surface'), f.surfaceMin, f.surfaceMax)) return false
    const date = val<string>(l, 'date')
    if (f.dateMin && !(date && date >= f.dateMin)) return false
    if (f.dateMax && !(date && date <= f.dateMax)) return false
    if (f.consoEp != null && !entre(val(l, 'conso'), f.consoEp - ARRONDI, f.consoEp + ARRONDI)) return false
    if (f.ges != null && !entre(val(l, 'emission'), f.ges - ARRONDI, f.ges + ARRONDI)) return false
    if (!entre(val(l, 'cout'), f.coutMin, f.coutMax)) return false
    if (periodes.size) {
      const p = val<number>(l, 'periode')
      if (p == null || !periodes.has(dict.periodes[p])) return false
    }
    if (energies.size) {
      const e = val<number>(l, 'energie')
      if (e == null || !energies.has(dict.energies[e])) return false
    }
    if (f.pompeAChaleur && val<number>(l, 'pac') !== 1) return false
    if (f.plainPied && val<number>(l, 'niveaux') !== 1) return false
    if (f.avecPhotovoltaique && val<number>(l, 'pv') !== 1) return false
    if (f.confortEteBon) {
      const e = val<number>(l, 'ete')
      if (e == null || dict.ete[e] !== 'bon') return false
    }
    return true
  })
}

export const coordonnees = (l: Ligne): [number, number] | null => {
  const lat = val<number>(l, 'lat')
  const lon = val<number>(l, 'lon')
  return lat != null && lon != null ? [lat, lon] : null
}
const reconstituerBan = (b: string, insee: string) => (b.startsWith('!') ? b.slice(1) : `${insee}_${b}`)
export const banDe = (l: Ligne, insee: string) => {
  const b = val<string>(l, 'ban')
  return b ? reconstituerBan(b, insee) : undefined
}
