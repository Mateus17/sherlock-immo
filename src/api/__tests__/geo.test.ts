import { describe, expect, it } from 'vitest'
import { codesInsee } from '../geo'

describe('codesInsee', () => {
  it('ajoute les arrondissements de Paris, Lyon et Marseille', () => {
    expect(codesInsee('75056')).toHaveLength(21)
    expect(codesInsee('75056')).toContain('75120')
    expect(codesInsee('69123')).toEqual(['69123', ...Array.from({ length: 9 }, (_, i) => String(69381 + i))])
    expect(codesInsee('13055').at(-1)).toBe('13216')
  })

  it('laisse les autres communes telles quelles', () => {
    expect(codesInsee('29212')).toEqual(['29212'])
  })
})
