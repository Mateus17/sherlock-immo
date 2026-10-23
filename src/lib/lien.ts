// Critères de recherche ↔ paramètres d'adresse, pour partager une recherche par lien.
// Format court et lisible : ?c=35238,35047&dpe=CD&s=120&tol=5&kwh=142&co2=31
// Seules les valeurs différentes du défaut sont écrites.

import {
  ENERGIES,
  ETIQUETTES,
  PERIODES,
  type Energie,
  type Etiquette,
  type Periode,
  type TypeBatiment,
} from '../api/dpe'

export interface Criteres {
  communes: string[] // codes INSEE
  rayonKm: number | null
  etiquettesDpe: Etiquette[]
  etiquettesGes: Etiquette[]
  types: TypeBatiment[]
  inclureNeufs: boolean
  surfaceMode: 'cible' | 'fourchette'
  surfaceCible: number | null
  tolerancePct: number
  surfaceMin: number | null
  surfaceMax: number | null
  consoEp: number | null
  ges: number | null
  coutMin: number | null
  coutMax: number | null
  dateMin: string | null
  dateMax: string | null
  dateExacte: boolean
  periodes: Periode[]
  energies: Energie[]
  pompeAChaleur: boolean
  plainPied: boolean
  avecPhotovoltaique: boolean
  confortEteBon: boolean
}

const TYPES: TypeBatiment[] = ['maison', 'appartement', 'immeuble']
const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function versParams(c: Criteres): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v))
  }
  set('c', c.communes.join(','))
  set('r', c.rayonKm)
  set('dpe', c.etiquettesDpe.join(''))
  set('ges', c.etiquettesGes.join(''))
  if (c.types.join(',') !== 'maison') set('t', c.types.join(','))
  if (!c.inclureNeufs) set('neuf', 0)
  if (c.surfaceMode === 'cible') {
    set('s', c.surfaceCible)
    if (c.surfaceCible != null) set('tol', c.tolerancePct)
  } else {
    set('smin', c.surfaceMin)
    set('smax', c.surfaceMax)
  }
  set('kwh', c.consoEp)
  set('co2', c.ges)
  set('cmin', c.coutMin)
  set('cmax', c.coutMax)
  set('du', c.dateMin)
  if (c.dateExacte) set('exact', 1)
  else set('au', c.dateMax)
  set('per', c.periodes.join(','))
  set('en', c.energies.join(','))
  if (c.pompeAChaleur) set('pac', 1)
  if (c.plainPied) set('pp', 1)
  if (c.avecPhotovoltaique) set('pv', 1)
  if (c.confortEteBon) set('ete', 1)
  return p
}

// Lecture tolérante : un paramètre invalide est ignoré, jamais une erreur
export function depuisParams(p: URLSearchParams): Partial<Criteres> | null {
  const codes = (p.get('c') ?? '').split(',').filter((x) => /^(\d{5}|2[AB]\d{3})$/i.test(x))
  if (!codes.length) return null
  const num = (k: string) => {
    const v = p.get(k)
    const n = v === null || v === '' ? NaN : Number(v)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const lettres = (k: string) =>
    [...new Set((p.get(k) ?? '').toUpperCase().split(''))].filter((x): x is Etiquette =>
      (ETIQUETTES as readonly string[]).includes(x),
    )
  const out: Partial<Criteres> = { communes: codes, etiquettesDpe: lettres('dpe'), etiquettesGes: lettres('ges') }
  out.rayonKm = num('r')
  const types = (p.get('t') ?? '').split(',').filter((x): x is TypeBatiment => TYPES.includes(x as TypeBatiment))
  out.types = types.length ? types : ['maison']
  out.inclureNeufs = p.get('neuf') !== '0'
  if (p.has('smin') || p.has('smax')) {
    out.surfaceMode = 'fourchette'
    out.surfaceCible = null
    out.surfaceMin = num('smin')
    out.surfaceMax = num('smax')
  } else {
    out.surfaceMode = 'cible'
    out.surfaceCible = num('s')
    out.surfaceMin = null
    out.surfaceMax = null
    const tol = num('tol')
    if (tol != null) out.tolerancePct = Math.min(30, tol)
  }
  out.consoEp = num('kwh')
  out.ges = num('co2')
  out.coutMin = num('cmin')
  out.coutMax = num('cmax')
  out.dateExacte = p.get('exact') === '1'
  out.dateMin = isDate(p.get('du')) ? p.get('du') : null
  out.dateMax = !out.dateExacte && isDate(p.get('au')) ? p.get('au') : null
  const liste = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean)
  out.periodes = liste('per').filter((x): x is Periode => (PERIODES as readonly string[]).includes(x))
  out.energies = liste('en').filter((x): x is Energie => x in ENERGIES)
  out.pompeAChaleur = p.get('pac') === '1'
  out.plainPied = p.get('pp') === '1'
  out.avecPhotovoltaique = p.get('pv') === '1'
  out.confortEteBon = p.get('ete') === '1'
  return out
}
