import { describe, expect, it } from 'vitest'
import { depuisParams, versParams, type Criteres } from '../lien'

const base: Criteres = {
  communes: ['35238', '35047'],
  rayonKm: null,
  etiquettesDpe: ['C', 'D'],
  etiquettesGes: [],
  types: ['maison'],
  inclureNeufs: true,
  surfaceMode: 'cible',
  surfaceCible: 120,
  tolerancePct: 5,
  surfaceMin: null,
  surfaceMax: null,
  consoEp: 142,
  ges: 31,
  coutMin: null,
  coutMax: null,
  dateMin: '2025-01-01',
  dateMax: null,
  dateExacte: false,
}

describe('lien partageable', () => {
  it('écrit seulement ce qui diffère du défaut', () => {
    expect(versParams(base).toString()).toBe('c=35238%2C35047&dpe=CD&s=120&tol=5&kwh=142&co2=31&du=2025-01-01')
  })

  it('relit ce qu’il a écrit', () => {
    expect(depuisParams(versParams(base))).toMatchObject(base)
  })

  it('gère la fourchette de surface et la date exacte', () => {
    const c: Criteres = { ...base, surfaceMode: 'fourchette', surfaceMin: 90, surfaceMax: 110, dateExacte: true, inclureNeufs: false }
    const back = depuisParams(versParams(c))!
    expect(back.surfaceMode).toBe('fourchette')
    expect([back.surfaceMin, back.surfaceMax]).toEqual([90, 110])
    expect(back.dateExacte).toBe(true)
    expect(back.inclureNeufs).toBe(false)
  })

  it('ignore les valeurs invalides', () => {
    const r = depuisParams(new URLSearchParams('c=35238,abc&dpe=CZ&kwh=-3&du=hier&t=chateau'))!
    expect(r.communes).toEqual(['35238'])
    expect(r.etiquettesDpe).toEqual(['C'])
    expect(r.consoEp).toBeNull()
    expect(r.dateMin).toBeNull()
    expect(r.types).toEqual(['maison'])
  })

  it('renvoie null sans commune', () => {
    expect(depuisParams(new URLSearchParams('kwh=142'))).toBeNull()
  })
})
