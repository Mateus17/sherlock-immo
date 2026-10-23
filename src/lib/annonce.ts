// Lecture d'une annonce immobilière collée telle quelle : on y repère les indices
// que la loi impose (DPE, consommation, émissions, fourchette de dépenses) et ceux
// qui servent à la recherche (ville, surface, terrain, prix, type de bien).

import type { Etiquette, TypeBatiment } from '../api/dpe'

export interface IndicesAnnonce {
  type?: TypeBatiment
  codePostal?: string
  ville?: { nom: string; dep?: string }
  surface?: number
  terrain?: number
  prix?: number
  etiquetteDpe?: Etiquette
  etiquetteGes?: Etiquette
  consoEp?: number
  ges?: number
  coutMin?: number
  coutMax?: number
  dateDpe?: string // AAAA-MM-JJ
}

// « 1 234 », « 1.234 », « 1 234 » (espaces insécables) ou « 98,5 » → nombre
function nombre(s: string): number {
  const t = s.replace(/[\s  ]/g, '')
  // Point suivi de 3 chiffres = séparateur de milliers ; virgule = décimale
  const n = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(',', '.')
  return Number(n)
}

const NB = String.raw`(\d{1,3}(?:[\s  .]\d{3})+|\d+(?:[.,]\d+)?)`

export function lireAnnonce(texte: string): IndicesAnnonce {
  const t = texte.replace(/\r/g, '')
  const out: IndicesAnnonce = {}
  const m = (re: RegExp) => t.match(re)

  // Type de bien
  if (/\b(maison|villa|longère|pavillon|corps de ferme|propriété)\b/i.test(t)) out.type = 'maison'
  else if (/\b(appartement|studio|duplex|t[1-6]\b|f[1-6]\b)/i.test(t)) out.type = 'appartement'

  // Consommation : « 142 kWh/m².an », « 142 kWhEP/m²/an »
  const conso = m(/(\d{1,4}(?:[.,]\d)?)\s*kWh\s*(?:e\.?p\.?)?\s*\/\s*m\s*[²2]?\s*[./]?\s*an/i)
  if (conso) out.consoEp = nombre(conso[1])

  // Émissions : « 31 kg CO2/m².an », « 31 kgCO₂eq/m²/an »
  const ges = m(/(\d{1,3}(?:[.,]\d)?)\s*kg\s*(?:éq\.?|eq\.?)?\s*CO\s*[2₂]/i)
  if (ges) out.ges = nombre(ges[1])

  // Lettres : « DPE : D », « Classe énergie D », « GES : B »
  const lDpe = m(/(?:classe\s+(?:énergie|energie|énergétique)|étiquette\s+(?:énergie|energie)|\bDPE)\s*[:\-–]?\s*(?:classe\s*)?\(?([A-G])\b/i)
  if (lDpe) out.etiquetteDpe = lDpe[1].toUpperCase() as Etiquette
  const lGes = m(/(?:\bGES|classe\s+climat|émissions?\s+de\s+gaz[^:\n]{0,30})\s*[:\-–]?\s*(?:classe\s*)?\(?([A-G])\b/i)
  if (lGes) out.etiquetteGes = lGes[1].toUpperCase() as Etiquette

  // Dépenses d'énergie : « entre 1 160 € et 1 600 € par an »
  const cout = m(new RegExp(String.raw`entre\s+${NB}\s*(?:€|euros?)?\s+et\s+${NB}\s*(?:€|euros?)`, 'i'))
  if (cout) {
    out.coutMin = nombre(cout[1])
    out.coutMax = nombre(cout[2])
  }

  // Terrain : « terrain de 800 m² », « parcelle de 1 200 m2 »
  const terrain = m(new RegExp(String.raw`(?:terrain|parcelle|jardin)[^\d\n]{0,25}${NB}\s*m\s*[²2]`, 'i'))
  if (terrain) out.terrain = nombre(terrain[1])

  // Surface habitable : priorité à une mention explicite, sinon la première surface hors terrain
  const habitable = m(new RegExp(String.raw`(?:surface\s+habitable|habitables?|surface)[^\d\n]{0,20}${NB}\s*m\s*[²2]`, 'i'))
  if (habitable) out.surface = nombre(habitable[1])
  else {
    for (const x of t.matchAll(new RegExp(String.raw`${NB}\s*m\s*[²2](?!\s*[./]?\s*an)`, 'gi'))) {
      const v = nombre(x[1])
      if (v !== out.terrain && v >= 9 && v < 1000) {
        out.surface = v
        break
      }
    }
  }

  // Prix : le plus grand montant en euros, hors fourchette de dépenses
  const montants = [...t.matchAll(new RegExp(String.raw`${NB}\s*(?:€|euros?)`, 'gi'))]
    .map((x) => nombre(x[1]))
    .filter((v) => v >= 10_000 && v !== out.coutMin && v !== out.coutMax)
  if (montants.length) out.prix = Math.max(...montants)

  // Localisation : code postal, ou « Ville (35) »
  // Cinq chiffres isolés, sauf s'ils sont suivis d'un montant en euros (« 95000 € »)
  const cp = m(/(?<![\d.,]|\d[\s\u00a0\u202f])(\d{5})(?![\d.,]|\s*(?:€|euros?))/i)
  if (cp && Number(cp[1].slice(0, 2)) > 0) out.codePostal = cp[1]
  const villeDep = m(/([A-ZÀ-Ý][\p{L}'’-]+(?:[ -][\p{L}'’-]+){0,4})\s*\((\d{2,3}|2[AB])\)/u)
  if (villeDep) out.ville = { nom: villeDep[1].trim(), dep: villeDep[2] }

  // Date du DPE : « DPE réalisé le 12/03/2025 »
  const date = m(/(?:DPE|diagnostic)[^\n]{0,60}?(\d{2})\/(\d{2})\/(\d{4})/i)
  if (date) out.dateDpe = `${date[3]}-${date[2]}-${date[1]}`

  return out
}
