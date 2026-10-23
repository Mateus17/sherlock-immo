// Export des résultats affichés en CSV (séparateur « ; » et BOM pour Excel en français)

import type { Dpe } from '../api/dpe'

const COLONNES: (keyof Dpe)[] = [
  'adresse_ban',
  'complement_adresse_logement',
  'type_batiment',
  'etiquette_dpe',
  'etiquette_ges',
  'surface_habitable_logement',
  'annee_construction',
  'date_etablissement_dpe',
  'numero_dpe',
]

export function versCsv(list: Dpe[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [COLONNES.join(';'), ...list.map((d) => COLONNES.map((c) => esc(d[c])).join(';'))].join('\n')
}

export function telechargerCsv(list: Dpe[], nom = 'dpe-recherche.csv') {
  const url = URL.createObjectURL(new Blob(['﻿' + versCsv(list)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nom })
  a.click()
  URL.revokeObjectURL(url)
}
