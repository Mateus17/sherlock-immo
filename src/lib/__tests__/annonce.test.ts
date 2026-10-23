import { describe, expect, it } from 'vitest'
import { lireAnnonce } from '../annonce'

// Annonces fictives, rédigées comme celles des grands portails
const MAISON = `Maison 5 pièces 96 m² - Plouzané (29)
Au calme, maison de 1979 sur un terrain de 640 m².
Surface habitable : 96 m². 4 chambres.
Prix : 245 000 € honoraires inclus.
DPE : C - 142 kWh/m².an | GES : D - 31 kg CO2/m².an
Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre 1 210 € et 1 680 € par an.
Prix moyens des énergies indexés au 1er janvier 2021. DPE réalisé le 14/05/2025.
29280 Plouzané`

const APPART = `Appartement T3 de 68,5 m2 à Rennes
Classe énergie E, 265 kWhEP/m²/an. Classe climat C (32 kgCO₂eq/m²/an).
Dépenses : entre 980 euros et 1 340 euros par an. 215.000 €`

describe('lireAnnonce', () => {
  it('lit une annonce de maison complète', () => {
    expect(lireAnnonce(MAISON)).toEqual({
      type: 'maison',
      codePostal: '29280',
      ville: { nom: 'Plouzané', dep: '29' },
      surface: 96,
      terrain: 640,
      prix: 245000,
      etiquetteDpe: 'C',
      etiquetteGes: 'D',
      consoEp: 142,
      ges: 31,
      coutMin: 1210,
      coutMax: 1680,
      dateDpe: '2025-05-14',
    })
  })

  it('lit une annonce d’appartement aux formats variés', () => {
    const r = lireAnnonce(APPART)
    expect(r.type).toBe('appartement')
    expect(r.surface).toBe(68.5)
    expect(r.consoEp).toBe(265)
    expect(r.ges).toBe(32)
    expect(r.etiquetteDpe).toBe('E')
    expect(r.etiquetteGes).toBe('C')
    expect([r.coutMin, r.coutMax]).toEqual([980, 1340])
    expect(r.prix).toBe(215000)
    expect(r.terrain).toBeUndefined()
  })

  it('ne prend pas un prix pour un code postal', () => {
    expect(lireAnnonce('Petite maison à rénover, 95000 €').codePostal).toBeUndefined()
  })

  it('renvoie un objet vide sur un texte sans indice', () => {
    expect(lireAnnonce('Bonjour, merci de me rappeler.')).toEqual({})
  })
})
