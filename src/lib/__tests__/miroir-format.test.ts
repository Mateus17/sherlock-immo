import { describe, expect, it } from 'vitest'
import type { DpeFilters } from '../../api/dpe'
import {
  banDe,
  cheminCommune,
  decoderLigne,
  encoderLigne,
  filtrerLignes,
  type Dictionnaires,
  type LigneAdeme,
} from '../miroir-format'

// Maison fictive, au format renvoyé par l'API de l'ADEME
const brut: LigneAdeme = {
  numero_dpe: '2600E0000000X',
  date_etablissement_dpe: '2026-03-02',
  date_visite_diagnostiqueur: '2026-02-27',
  etiquette_dpe: 'C',
  etiquette_ges: 'D',
  surface_habitable_logement: 96,
  annee_construction: 1979,
  periode_construction: '1978-1982',
  conso_5_usages_par_m2_ep: 141.5,
  emission_ges_5_usages_par_m2: 31,
  cout_total_5_usages: 1450,
  type_energie_principale_chauffage: 'Électricité',
  type_generateur_chauffage_principal: 'PAC air/eau installée après 2017',
  nombre_niveau_logement: 1,
  presence_production_pv: 0,
  indicateur_confort_ete: 'bon',
  adresse_ban: '12 Rue des Exemples 29280 Plouzané',
  code_postal_ban: '29280',
  code_insee_ban: '29212',
  nom_commune_ban: 'Plouzané',
  identifiant_ban: '29212_0420_00012',
  _geopoint: '48.3812345678,-4.6198765432',
}
const fichier = { insee: '29212', nom: 'Plouzané' }

const filtres = (f: Partial<DpeFilters> = {}): DpeFilters => ({
  communes: [],
  rayonKm: null,
  etiquettesDpe: [],
  etiquettesGes: [],
  types: ['maison'],
  surfaceMin: null,
  surfaceMax: null,
  dateMin: null,
  dateMax: null,
  consoEp: null,
  ges: null,
  coutMin: null,
  coutMax: null,
  inclureNeufs: true,
  periodes: [],
  energies: [],
  pompeAChaleur: false,
  plainPied: false,
  avecPhotovoltaique: false,
  confortEteBon: false,
  ...f,
})

describe('format des données hébergées', () => {
  it('restitue le DPE après encodage, adresse et identifiant compris', () => {
    const dict: Dictionnaires = { periodes: [], energies: [], ete: [] }
    const d = decoderLigne(encoderLigne(brut, 'existant', dict), fichier, dict)
    expect(d).toMatchObject({
      numero_dpe: '2600E0000000X',
      adresse_ban: '12 Rue des Exemples 29280 Plouzané',
      identifiant_ban: '29212_0420_00012',
      periode_construction: '1978-1982',
      type_energie_principale_chauffage: 'Électricité',
      conso_5_usages_par_m2_ep: 141.5,
      _geopoint: '48.38123,-4.61988',
      _source: 'existant',
      type_batiment: 'maison',
    })
    expect(dict.periodes).toEqual(['1978-1982'])
  })

  it('garde telles quelles une adresse et un identifiant de forme inattendue', () => {
    const dict: Dictionnaires = { periodes: [], energies: [], ete: [] }
    const bizarre = { ...brut, adresse_ban: 'Lieu-dit Kerexemple', identifiant_ban: 'autre_format' }
    const l = encoderLigne(bizarre, 'neuf', dict)
    const d = decoderLigne(l, fichier, dict)
    expect(d.adresse_ban).toBe('Lieu-dit Kerexemple')
    expect(d.identifiant_ban).toBe('autre_format')
    expect(banDe(l, '29212')).toBe('autre_format')
    expect(d._source).toBe('neuf')
  })

  it('applique les filtres comme l’API', () => {
    const dict: Dictionnaires = { periodes: [], energies: [], ete: [] }
    const l = [encoderLigne(brut, 'existant', dict)]
    const garde = (f: Partial<DpeFilters>) => filtrerLignes(l, filtres(f), dict).length === 1
    expect(garde({})).toBe(true)
    expect(garde({ consoEp: 142 })).toBe(true) // 141,5 affiché « 142 » sur l'annonce
    expect(garde({ consoEp: 140 })).toBe(false)
    expect(garde({ etiquettesDpe: ['C', 'D'] })).toBe(true)
    expect(garde({ etiquettesDpe: ['A'] })).toBe(false)
    expect(garde({ surfaceMin: 90, surfaceMax: 100 })).toBe(true)
    expect(garde({ dateMin: '2026-03-03' })).toBe(false)
    expect(garde({ periodes: ['1978-1982'] })).toBe(true)
    expect(garde({ energies: ['gaz'] })).toBe(false)
    expect(garde({ energies: ['electricite'] })).toBe(true)
    expect(garde({ pompeAChaleur: true, plainPied: true, confortEteBon: true })).toBe(true)
    expect(garde({ avecPhotovoltaique: true })).toBe(false)
    expect(garde({ inclureNeufs: false })).toBe(true)
  })

  it('range chaque commune dans le dossier de son type et de son département', () => {
    expect(cheminCommune('35238', 'maison')).toBe('maisons/35/35238.json.gz')
    expect(cheminCommune('2A004', 'appartement')).toBe('appartements/2A/2A004.json.gz')
    expect(cheminCommune('97411', 'immeuble')).toBe('immeubles/974/97411.json.gz')
  })

  it("garde l'étage et le type d'un appartement", () => {
    const dict: Dictionnaires = { periodes: [], energies: [], ete: [] }
    const appart = { ...brut, numero_etage_appartement: 3, complement_adresse_logement: 'Bât. B' }
    const d = decoderLigne(encoderLigne(appart, 'existant', dict), fichier, dict, 'appartement')
    expect(d.type_batiment).toBe('appartement')
    expect(d.numero_etage_appartement).toBe(3)
    expect(d.complement_adresse_logement).toBe('Bât. B')
  })
})
