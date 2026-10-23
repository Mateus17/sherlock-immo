import { describe, expect, it } from 'vitest'
import type { Dpe, DpeDetail } from '../../api/dpe'
import type { MarcheLocal, Vente } from '../../api/territoire'
import { analyser, type Contexte } from '../verification'

// Logement fictif
const dpe: DpeDetail = {
  numero_dpe: 'B',
  adresse_ban: '1 Rue Exemple 00000 Ville',
  type_batiment: 'maison',
  etiquette_dpe: 'E',
  surface_habitable_logement: 130,
  date_etablissement_dpe: '2026-06-10',
  date_visite_diagnostiqueur: '2026-04-20',
  type_energie_principale_chauffage: 'Gaz naturel',
}
const precedent: Dpe = {
  numero_dpe: 'A',
  type_batiment: 'maison',
  etiquette_dpe: 'F',
  surface_habitable_logement: 105,
  date_etablissement_dpe: '2026-04-24',
}

const ctx = (extra: Partial<Contexte> = {}): Contexte => ({
  dpe,
  history: [precedent, dpe],
  oldDpes: [],
  audits: [],
  surfaceAnnonce: null,
  today: new Date('2026-10-24'),
  ...extra,
})
const titres = (c: Contexte) => analyser(c).map((p) => p.titre)

describe('analyser', () => {
  it('signale une étiquette gagnée en quelques mois', () => {
    expect(titres(ctx())).toContain('Étiquette améliorée de F à E en 2 mois')
  })

  it('signale un DPE refait sans nouvelle visite', () => {
    expect(titres(ctx())).toContain('DPE refait sans nouvelle visite')
  })

  it('signale une surface qui change entre deux DPE', () => {
    expect(titres(ctx())).toContain('Surface augmentée de 105 à 130 m² entre deux DPE')
  })

  it("n'accuse pas un gain dû à la réforme de l'électricité de 2026", () => {
    const elec = { ...dpe, type_energie_principale_chauffage: 'Électricité', date_visite_diagnostiqueur: '2026-02-01' }
    const avant = { ...precedent, date_etablissement_dpe: '2025-06-01', surface_habitable_logement: 130 }
    const points = analyser(ctx({ dpe: elec, history: [avant, elec] }))
    const gain = points.find((p) => p.titre.startsWith('Étiquette améliorée'))
    expect(gain?.niveau).toBe('info')
    expect(gain?.titre).toContain('réforme de 2026')
  })

  it('compare la surface de l’annonce à celle du DPE', () => {
    expect(titres(ctx({ surfaceAnnonce: 150 }))).toContain('Surface annoncée supérieure de 15 % au DPE')
    expect(titres(ctx({ surfaceAnnonce: 131 }))).toContain('Surface cohérente avec le DPE')
  })

  it('compare la surface du DPE à celle déclarée aux impôts', () => {
    const vente: Vente = {
      id: 'v',
      date: '2023-11-03',
      nature: 'Vente',
      prix: 300000,
      type: 'Maison',
      surfaceBati: 60,
      pieces: 4,
      terrain: 400,
      parcelles: ['p'],
      adresse: '',
    }
    const marche: MarcheLocal = { ventesParcelle: [vente], comparables: [], medianePrixM2: null }
    const points = analyser(ctx({ marche }))
    expect(points.find((p) => p.titre.startsWith('Surface déclarée aux impôts'))?.niveau).toBe('alerte')
  })

  it('classe les points du plus grave au plus rassurant', () => {
    const ordre = { alerte: 0, attention: 1, info: 2, ok: 3 }
    const niveaux = analyser(ctx({ surfaceAnnonce: 131 })).map((p) => ordre[p.niveau])
    expect(niveaux).toEqual([...niveaux].sort((a, b) => a - b))
  })

  it('alerte sur le chauffage au fioul', () => {
    const fioul = { ...dpe, type_energie_principale_chauffage: 'Fioul domestique' }
    expect(titres(ctx({ dpe: fioul, history: [fioul] }))).toContain('Chauffage au fioul')
  })
})
