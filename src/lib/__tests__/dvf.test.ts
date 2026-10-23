import { describe, expect, it } from 'vitest'
import { grouperVentes, prixM2, type DvfRow } from '../../api/territoire'

// Lignes fictives au format de l'API DVF : chaînes, « nan » et « None » pour les vides
const ligne = (p: Partial<DvfRow>): DvfRow => ({
  id_mutation: 'M1',
  date_mutation: '2024-05-02',
  nature_mutation: 'Vente',
  valeur_fonciere: '250000.0',
  id_parcelle: '00000000AB0001',
  type_local: 'Maison',
  surface_reelle_bati: '100.0',
  nombre_pieces_principales: '5.0',
  surface_terrain: '600.0',
  adresse_numero: '3.0',
  adresse_nom_voie: 'RUE DES EXEMPLES',
  ...p,
})

describe('grouperVentes', () => {
  it('regroupe les lignes d’une même vente sans compter le prix deux fois', () => {
    const [v] = grouperVentes([
      ligne({}),
      ligne({ type_local: 'Dépendance', surface_reelle_bati: 'nan', nombre_pieces_principales: '0.0' }),
    ])
    expect(v).toMatchObject({ id: 'M1', prix: 250000, type: 'Maison', surfaceBati: 100, pieces: 5, terrain: 600 })
    expect(v.adresse).toBe('3 RUE DES EXEMPLES')
    expect(prixM2(v)).toBe(2500)
  })

  it('additionne les terrains de parcelles différentes, une seule fois chacune', () => {
    const [v] = grouperVentes([
      ligne({ id_parcelle: 'P1', surface_terrain: '600.0' }),
      ligne({ id_parcelle: 'P1', type_local: 'Dépendance', surface_terrain: '600.0' }),
      ligne({ id_parcelle: 'P2', type_local: 'None', surface_terrain: '150.0', surface_reelle_bati: 'nan' }),
    ])
    expect(v.terrain).toBe(750)
    expect(v.parcelles).toEqual(['P1', 'P2'])
  })

  it('classe « Autre » une vente de plusieurs logements, sans prix au m²', () => {
    const [v] = grouperVentes([ligne({}), ligne({ type_local: 'Appartement' })])
    expect(v.type).toBe('Autre')
    expect(v.pieces).toBeNull()
  })

  it('traite les valeurs vides de l’API', () => {
    const [v] = grouperVentes([ligne({ valeur_fonciere: 'None', surface_terrain: 'nan', surface_reelle_bati: 'nan' })])
    expect(v.prix).toBeNull()
    expect(v.terrain).toBeNull()
    expect(prixM2(v)).toBeNull()
  })
})
