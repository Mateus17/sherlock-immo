import { beforeEach, describe, expect, it } from 'vitest'
import { defaults, useCriteres } from '../useCriteres'

const { form, reset, avancesActifs, effacerAvances } = useCriteres()

describe('critères avancés', () => {
  beforeEach(() => reset({}))

  it('compte les critères avancés actifs, pas ceux du mode simple', () => {
    form.etiquettesDpe = ['C']
    form.etiquettesGes = ['D']
    form.surfaceCible = 96
    expect(avancesActifs.value).toBe(0)
    form.consoEp = 142
    form.coutMin = 1200
    form.coutMax = 1700
    form.pompeAChaleur = true
    expect(avancesActifs.value).toBe(3)
  })

  it('efface les critères avancés sans toucher aux autres ni au mode', () => {
    form.avance = true
    form.etiquettesDpe = ['C']
    form.ges = 31
    form.inclureNeufs = false
    effacerAvances()
    expect(avancesActifs.value).toBe(0)
    expect(form.inclureNeufs).toBe(defaults.inclureNeufs)
    expect(form.etiquettesDpe).toEqual(['C'])
    expect(form.avance).toBe(true)
  })

  it('garde le mode à la réinitialisation', () => {
    form.avance = true
    reset()
    expect(form.avance).toBe(true)
  })
})
