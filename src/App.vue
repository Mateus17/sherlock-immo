<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { getDatasetUpdatedAt } from './api/dpe'
import AnnoncePaste from './components/AnnoncePaste.vue'
import SearchForm from './components/filtres/SearchForm.vue'
import InstallButton from './components/InstallButton.vue'
import ResultsBar from './components/ResultsBar.vue'
import ResultsTable from './components/ResultsTable.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import { useAnnonce } from './composables/useAnnonce'
import { useCriteres } from './composables/useCriteres'
import { useFavoris } from './composables/useFavoris'
import { useLienPartage } from './composables/useLienPartage'
import { useRecherche } from './composables/useRecherche'
import './styles/formulaire.css'

// Chargés à la demande : Leaflet, la fiche et la page Sources ne pèsent pas sur l'accueil
const ResultsMap = defineAsyncComponent(() => import('./components/ResultsMap.vue'))
const DpeDetail = defineAsyncComponent(() => import('./components/DpeDetail.vue'))
const SourcesPage = defineAsyncComponent(() => import('./components/SourcesPage.vue'))
const FavorisPage = defineAsyncComponent(() => import('./components/FavorisPage.vue'))

const { form, toFilters } = useCriteres()
const recherche = useRecherche()
const { loading, error, searched, hasResults, displayed, selectedId, detailDpe, parcelleGeom, shownRayon } = recherche
const { annonce, bilan, appliquer } = useAnnonce()
const lien = useLienPartage()
const { liste: favoris } = useFavoris()

const updatedAt = ref<string | null>(null)

async function search() {
  if (!form.communes.length) return
  await recherche.search(toFilters())
  if (!recherche.error.value) lien.memoriser()
  window.scrollTo({ top: 0 })
}

// Retour à l'accueil, critères conservés
function nouvelleRecherche() {
  recherche.clear()
  lien.oublier()
}

// La surface saisie dans les critères sert de point de comparaison dans la fiche
const surfaceAnnonce = computed(() => (form.surfaceMode === 'cible' ? form.surfaceCible : null))

// Pages secondaires : simples ancres (#sources, #favoris), sans routeur
const pageDepuisAncre = () =>
  location.hash === '#sources' ? 'sources' : location.hash === '#favoris' ? 'favoris' : 'app'
const page = ref(pageDepuisAncre())
const onHash = () => {
  page.value = pageDepuisAncre()
  window.scrollTo({ top: 0 })
}

onMounted(async () => {
  window.addEventListener('hashchange', onHash)
  if (await lien.ouvrir()) search()
  updatedAt.value = await getDatasetUpdatedAt()
})
</script>

<template>
  <ThemeToggle />
  <SourcesPage v-if="page === 'sources'" :updated-at="updatedAt" />
  <FavorisPage v-else-if="page === 'favoris'" />
  <main v-else class="layout" :class="{ landing: !hasResults }">
    <aside class="filters" aria-label="Critères de recherche">
      <header>
        <div class="brand">
          <img class="logo" src="/icons/icon.svg" alt="" width="40" height="40" />
          <h1>Sherlock <span>Immo</span></h1>
        </div>
        <p class="tagline muted">Retrouvez la maison d'une annonce, puis vérifiez ce que l'annonce ne dit pas.</p>
        <p v-if="!hasResults && error" class="status error" role="alert">Erreur : {{ error }}</p>
        <p v-else-if="!hasResults && searched && !loading" class="status" role="status">
          Aucun DPE ne correspond. Élargissez la surface, la zone ou ajoutez des étiquettes.
        </p>
        <nav class="liens" aria-label="Pages">
          <a href="#favoris" class="lien-favoris"
            >★ Mes favoris<template v-if="favoris.length"> ({{ favoris.length }})</template></a
          >
        </nav>
        <InstallButton v-if="!hasResults" class="install" />
      </header>

      <AnnoncePaste class="paste-box" :bilan="bilan" @indices="appliquer" />

      <SearchForm :loading="loading" @submit="search" />

      <footer class="muted">
        <a href="#sources">Sources et outils</a>
        · Données publiques
        <template v-if="updatedAt">(DPE à jour au {{ new Date(updatedAt).toLocaleDateString('fr-FR') }})</template>
        · Open source
      </footer>
    </aside>

    <section v-if="hasResults" class="results" aria-label="Résultats">
      <ResultsBar @nouvelle="nouvelleRecherche" />

      <div class="body" :class="{ 'with-detail': detailDpe }">
        <div class="panes">
          <ResultsMap
            class="map-pane"
            :results="displayed"
            :communes="form.communes"
            :rayon-km="shownRayon"
            :selected-id="selectedId"
            :parcelle="parcelleGeom"
            @select="recherche.select"
          />
          <ResultsTable class="table-pane" :results="displayed" :selected-id="selectedId" @select="recherche.select" />
        </div>
        <DpeDetail
          v-if="detailDpe"
          class="detail-pane"
          :dpe="detailDpe"
          :surface-annonce="surfaceAnnonce"
          :terrain-annonce="annonce.terrain"
          :prix-annonce="annonce.prix"
          @close="recherche.closeDetail"
          @open="recherche.openDetail"
          @parcelle="parcelleGeom = $event"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  grid-template-rows: minmax(0, 1fr);
  height: 100vh;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--surface);
}
h1 {
  margin: 0;
  font-size: 1.4em;
  font-weight: 800;
}
header p {
  margin: 4px 0 0;
}
footer {
  margin-top: auto;
  font-size: 0.8em;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand h1 span {
  color: var(--accent-2);
}
.logo {
  width: 28px;
  height: 28px;
  flex: none;
}
/* Colonne de filtres : juste le logo et le nom, sur une ligne */
.layout:not(.landing) .tagline {
  display: none;
}
.status {
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.status.error {
  background: color-mix(in srgb, #c62828 12%, transparent);
}

.results {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  gap: 12px;
}
.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.body.with-detail {
  grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
}
.detail-pane {
  min-height: 0;
}
.panes {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.panes > * {
  min-height: 0;
}

/* Accueil : formulaire pleine page */
.landing {
  display: block;
  height: auto;
  min-height: 100vh;
}
.landing .filters {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
  gap: 28px;
  overflow: visible;
  border: 0;
  background: transparent;
}
/* Logo, nom, accroche et installation sur une seule ligne centrée */
.landing header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 18px;
  text-align: center;
}
.landing .logo {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent));
}
.landing .tagline {
  margin: 0;
}
.lien-favoris {
  font-weight: 600;
  text-decoration: none;
  color: var(--accent-2);
}
.layout:not(.landing) .liens {
  margin-top: 6px;
}
.landing header .status {
  flex-basis: 100%;
}
.landing .paste-box:not(.open) {
  text-align: center;
}
.landing h1 {
  font-size: 1.7em;
  letter-spacing: -0.02em;
}
.landing footer {
  text-align: center;
}

@media (min-width: 1280px) {
  .landing .filters {
    max-width: 1360px;
  }
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
  }
  .filters {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .panes {
    grid-template-rows: 360px auto;
  }
  .body.with-detail {
    grid-template-columns: 1fr;
  }
  /* Résultats sur téléphone : les filtres laissent la place, « Nouvelle recherche » y ramène */
  .layout:not(.landing) .filters {
    display: none;
  }
  /* Sur téléphone, la fiche passe en plein écran par-dessus les résultats */
  .detail-pane {
    position: fixed;
    inset: 0;
    z-index: 1200;
    border-radius: 0;
    padding-top: calc(16px + env(safe-area-inset-top));
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }
}
</style>
