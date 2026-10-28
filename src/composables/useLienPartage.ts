// Lien partageable : les critères dans l'adresse de la page.

import { ref } from 'vue'
import { getCommune, type Commune } from '../api/geo'
import { depuisParams, versParams } from '../lib/lien'
import { copier } from '../lib/presse-papiers'
import { defaults, useCriteres } from './useCriteres'

const lienCopie = ref(false)
const { form, criteres, avancesActifs } = useCriteres()

function url() {
  return `${location.origin}${location.pathname}?${versParams(criteres())}`
}

// Met l'adresse de la page à jour après une recherche (favoris du navigateur, retour arrière)
function memoriser() {
  history.replaceState(null, '', `${location.pathname}?${versParams(criteres())}${location.hash}`)
}

function oublier() {
  history.replaceState(null, '', location.pathname + location.hash)
}

async function partager() {
  // Sur téléphone, la feuille de partage du système ; ailleurs, copie du lien
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    navigator.share({ title: 'Recherche Sherlock Immo', url: url() }).catch(() => {})
    return
  }
  if (await copier(url())) {
    lienCopie.value = true
    setTimeout(() => (lienCopie.value = false), 2500)
  }
}

// Ouvre une recherche reçue par lien : renvoie true si des critères ont été appliqués
async function ouvrir(): Promise<boolean> {
  const partage = depuisParams(new URLSearchParams(location.search))
  if (!partage?.communes) return false
  const communes = (await Promise.all(partage.communes.map((c) => getCommune(c).catch(() => null)))).filter(
    (c): c is Commune => !!c,
  )
  if (!communes.length) return false
  const { rayonKm, ...reste } = partage
  Object.assign(form, {
    ...defaults,
    ...reste,
    communes,
    alentours: rayonKm != null,
    rayonKm: rayonKm ?? defaults.rayonKm,
    avance: form.avance,
  })
  if (avancesActifs.value) form.avance = true
  return true
}

export function useLienPartage() {
  return { lienCopie, partager, ouvrir, memoriser, oublier }
}
