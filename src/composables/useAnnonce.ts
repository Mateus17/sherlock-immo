// Annonce collée : ses indices remplissent les critères ; prix et terrain
// sont gardés de côté pour la comparaison dans la fiche.

import { reactive, ref } from 'vue'
import { searchCommunes, type Commune } from '../api/geo'
import type { IndicesAnnonce } from '../lib/annonce'
import { useCriteres } from './useCriteres'

const annonce = reactive<{ prix: number | null; terrain: number | null }>({ prix: null, terrain: null })
const bilan = ref<string[] | null>(null)

const { form, reset, avancesActifs } = useCriteres()

async function communesDeLAnnonce(i: IndicesAnnonce): Promise<Commune[]> {
  try {
    if (i.codePostal) {
      const list = await searchCommunes({ nom: '', codePostal: i.codePostal })
      // Un code postal peut couvrir plusieurs communes : on garde celle nommée dans l'annonce
      const nom = i.ville?.nom.toLowerCase()
      const meme = nom ? list.filter((c) => c.nom.toLowerCase() === nom) : []
      return meme.length ? meme : list
    }
    if (i.ville) return (await searchCommunes({ nom: i.ville.nom, dep: i.ville.dep })).slice(0, 1)
  } catch {
    // API Géo indisponible : l'utilisateur saisira la commune
  }
  return []
}

async function appliquer(i: IndicesAnnonce) {
  // On repart des valeurs par défaut pour ne pas mélanger deux annonces
  reset()
  const faits: string[] = []
  if (i.type) {
    form.types = [i.type]
    faits.push(i.type)
  }
  if (i.surface != null) {
    form.surfaceMode = 'cible'
    form.surfaceCible = i.surface
    faits.push(`${i.surface} m²`)
  }
  if (i.etiquetteDpe) {
    form.etiquettesDpe = [i.etiquetteDpe]
    faits.push(`DPE ${i.etiquetteDpe}`)
  }
  if (i.etiquetteGes) {
    form.etiquettesGes = [i.etiquetteGes]
    faits.push(`GES ${i.etiquetteGes}`)
  }
  if (i.consoEp != null) {
    form.consoEp = i.consoEp
    faits.push(`${i.consoEp} kWh/m²/an`)
  }
  if (i.ges != null) {
    form.ges = i.ges
    faits.push(`${i.ges} kg CO₂/m²/an`)
  }
  if (i.coutMin != null && i.coutMax != null) {
    form.coutMin = i.coutMin
    form.coutMax = i.coutMax
    faits.push("dépenses d'énergie")
  }
  if (i.dateDpe) {
    form.dateExacte = true
    form.dateMin = i.dateDpe
    form.dateMax = null
    faits.push('date du DPE')
  }
  annonce.prix = i.prix ?? null
  annonce.terrain = i.terrain ?? null
  if (i.prix) faits.push('prix (pour la fiche)')
  if (i.terrain) faits.push('terrain (pour la fiche)')
  const communes = await communesDeLAnnonce(i)
  if (communes.length) {
    form.communes = communes
    faits.unshift(communes.map((c) => c.nom).join(', '))
  }
  // Chiffres de l'annonce (kWh, CO₂, dépenses…) : ils ne se voient qu'en mode avancé
  if (avancesActifs.value) form.avance = true
  bilan.value = faits
}

export function useAnnonce() {
  return { annonce, bilan, appliquer }
}
