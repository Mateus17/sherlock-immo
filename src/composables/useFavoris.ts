// Favoris : logements mis de côté, avec une note et le prix de l'annonce.
// Stockés dans le navigateur uniquement.

import { computed, reactive, watch } from 'vue'
import type { Dpe } from '../api/dpe'

const STORAGE_KEY = 'sherlock-immo:favoris'
export const MAX_COMPARAISON = 3

export interface Favori {
  dpe: Dpe // instantané du DPE au moment de l'ajout
  note: string
  prix: number | null
  ajouteLe: string // AAAA-MM-JJ
}

function charger(): Record<string, Favori> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const favoris = reactive<Record<string, Favori>>(charger())
watch(favoris, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    // stockage indisponible : les favoris ne survivront pas à la fermeture de la page
  }
})

// Sélection pour le comparateur (non mémorisée)
const selection = reactive<string[]>([])

const liste = computed(() => Object.values(favoris).sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe)))

function estFavori(numero: string) {
  return numero in favoris
}

function basculer(d: Dpe, prix: number | null = null) {
  if (estFavori(d.numero_dpe)) retirer(d.numero_dpe)
  else favoris[d.numero_dpe] = { dpe: { ...d }, note: '', prix, ajouteLe: new Date().toISOString().slice(0, 10) }
}

function retirer(numero: string) {
  delete favoris[numero]
  const i = selection.indexOf(numero)
  if (i >= 0) selection.splice(i, 1)
}

function basculerSelection(numero: string) {
  const i = selection.indexOf(numero)
  if (i >= 0) selection.splice(i, 1)
  else if (selection.length < MAX_COMPARAISON) selection.push(numero)
}

export function useFavoris() {
  return { favoris, liste, selection, estFavori, basculer, retirer, basculerSelection }
}
