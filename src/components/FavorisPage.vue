<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef } from 'vue'
import type { Dpe } from '../api/dpe'
import { MAX_COMPARAISON, useFavoris } from '../composables/useFavoris'
import { date, nombre } from '../lib/format'
import { nombreOuNull } from '../lib/saisie'
import Comparateur from './Comparateur.vue'
import DpeBadge from './DpeBadge.vue'

const DpeDetail = defineAsyncComponent(() => import('./DpeDetail.vue'))

const { liste, selection, retirer, basculerSelection } = useFavoris()

const ouvert = shallowRef<Dpe | null>(null)
const comparer = ref(false)
const peutComparer = computed(() => selection.length >= 2)
</script>

<template>
  <main class="favoris">
    <a href="#" class="back">← Retour à la recherche</a>
    <header>
      <h1>Mes favoris</h1>
      <p class="muted">
        Les logements mis de côté, avec vos notes. Ils restent dans ce navigateur uniquement : ils ne sont envoyés nulle
        part.
      </p>
    </header>

    <p v-if="!liste.length" class="vide">
      Aucun favori pour l'instant. Dans les résultats ou dans une fiche, touchez l'étoile ☆ pour mettre un logement de
      côté.
    </p>

    <template v-else>
      <div class="barre">
        <span class="muted">
          Cochez 2 ou {{ MAX_COMPARAISON }} logements pour les comparer ({{ selection.length }}/{{ MAX_COMPARAISON }}).
        </span>
        <button type="button" class="primary" :disabled="!peutComparer" @click="comparer = true">
          Comparer la sélection
        </button>
      </div>

      <Comparateur v-if="comparer && peutComparer" :numeros="selection" @fermer="comparer = false" />

      <ul class="cartes">
        <li v-for="f in liste" :key="f.dpe.numero_dpe" :class="{ choisi: selection.includes(f.dpe.numero_dpe) }">
          <div class="tete">
            <label class="check">
              <input
                type="checkbox"
                :checked="selection.includes(f.dpe.numero_dpe)"
                :disabled="!selection.includes(f.dpe.numero_dpe) && selection.length >= MAX_COMPARAISON"
                :aria-label="`Comparer ${f.dpe.adresse_ban ?? 'ce logement'}`"
                @change="basculerSelection(f.dpe.numero_dpe)"
              />
            </label>
            <div class="titre">
              <strong>{{ f.dpe.adresse_ban ?? 'Adresse inconnue' }}</strong>
              <small class="muted">
                {{ nombre(f.dpe.surface_habitable_logement, 1) }} m² ·
                {{ f.dpe.annee_construction ?? f.dpe.periode_construction ?? '?' }} · ajouté le {{ date(f.ajouteLe) }}
              </small>
            </div>
            <span class="badges">
              <DpeBadge :value="f.dpe.etiquette_dpe" />
              <DpeBadge :value="f.dpe.etiquette_ges" />
            </span>
          </div>
          <div class="champs">
            <label>
              <span>Prix de l'annonce</span>
              <input
                :value="f.prix ?? ''"
                type="number"
                min="0"
                step="1000"
                placeholder="€"
                @input="f.prix = nombreOuNull($event)"
              />
            </label>
            <label class="note">
              <span>Notes</span>
              <textarea v-model="f.note" rows="2" placeholder="Visite le…, façade, voisinage, questions…"></textarea>
            </label>
          </div>
          <div class="actions">
            <button type="button" @click="ouvert = f.dpe">Ouvrir la fiche</button>
            <button type="button" @click="retirer(f.dpe.numero_dpe)">Retirer</button>
          </div>
        </li>
      </ul>
    </template>

    <div v-if="ouvert" class="fiche-overlay" @click.self="ouvert = null">
      <DpeDetail :dpe="ouvert" :surface-annonce="null" @close="ouvert = null" @open="ouvert = $event" />
    </div>
  </main>
</template>

<style scoped>
.favoris {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 56px;
}
.back {
  display: inline-block;
  margin-bottom: 20px;
  text-decoration: none;
  font-weight: 600;
}
h1 {
  margin: 0;
  font-size: 2em;
  font-weight: 800;
  letter-spacing: -0.02em;
}
header {
  margin-bottom: 24px;
}
.vide {
  padding: 24px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  text-align: center;
}
.barre {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.cartes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.cartes li {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.cartes li.choisi {
  border-color: var(--accent);
}
.tete {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.titre {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.badges {
  display: flex;
  gap: 4px;
}
.champs {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
}
.champs label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9em;
}
.champs input,
.champs textarea {
  width: 100%;
  min-width: 0;
}
textarea {
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: inherit;
  font: inherit;
  resize: vertical;
}
.actions {
  display: flex;
  gap: 8px;
}
.check {
  padding-top: 2px;
}
.fiche-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: rgb(0 0 0 / 0.35);
}
.fiche-overlay > :deep(.detail) {
  width: min(520px, 100%);
  height: 100%;
  border-radius: 0;
}
</style>
