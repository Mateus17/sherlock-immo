<script setup lang="ts">
defineProps<{ updatedAt: string | null }>()

const repoUrl = import.meta.env.VITE_REPO_URL

interface Ligne {
  nom: string
  usage: string
  producteur: string
  url: string
}

const donnees: Ligne[] = [
  {
    nom: 'DPE des logements existants',
    usage: 'Recherche principale : étiquettes, surface, consommation, adresse.',
    producteur: 'ADEME',
    url: 'https://data.ademe.fr/datasets/dpe03existant',
  },
  {
    nom: 'DPE des logements neufs',
    usage: 'Logements construits depuis juillet 2021.',
    producteur: 'ADEME',
    url: 'https://data.ademe.fr/datasets/g3cgx7jb3cmys5voxz1mrm22',
  },
  {
    nom: "DPE d'avant juillet 2021",
    usage: "Historique de l'adresse (ancienne méthode de calcul).",
    producteur: 'ADEME',
    url: 'https://data.ademe.fr/datasets/dpe-france',
  },
  {
    nom: 'Audits énergétiques',
    usage: 'Scénarios de travaux chiffrés, étape par étape.',
    producteur: 'ADEME',
    url: 'https://data.ademe.fr/datasets/ync2epx48x9azbdnggbygqp0',
  },
  {
    nom: 'Demandes de valeurs foncières (DVF)',
    usage: 'Ventes passées, surface déclarée aux impôts, prix au m² du quartier.',
    producteur: 'DGFiP, via Etalab',
    url: 'https://app.dvf.etalab.gouv.fr/',
  },
  {
    nom: 'Cadastre (API Carto)',
    usage: 'Parcelle sous le logement : surface et contour.',
    producteur: 'IGN',
    url: 'https://apicarto.ign.fr/api/doc/',
  },
  {
    nom: "Géoportail de l'urbanisme",
    usage: 'Zone du PLU et zones à urbaniser à proximité.',
    producteur: 'IGN',
    url: 'https://www.geoportail-urbanisme.gouv.fr/',
  },
  {
    nom: 'Géorisques',
    usage: 'Inondation, argiles, radon, sols pollués, installations industrielles.',
    producteur: 'Ministère de la Transition écologique, BRGM',
    url: 'https://www.georisques.gouv.fr/doc-api',
  },
  {
    nom: 'API Géo',
    usage: 'Recherche des communes et des communes voisines.',
    producteur: 'Etalab',
    url: 'https://geo.api.gouv.fr/',
  },
  {
    nom: 'Plan IGN et photographies aériennes',
    usage: 'Fonds de carte.',
    producteur: 'IGN (Géoplateforme)',
    url: 'https://geoservices.ign.fr/',
  },
]

const consultation = [
  {
    nom: 'Observatoire DPE-Audit',
    usage: 'Le DPE complet officiel, à partir de son numéro.',
    url: 'https://observatoire-dpe-audit.ademe.fr/',
  },
  { nom: 'Panoramax', usage: 'Vues de rue libres et collaboratives.', url: 'https://panoramax.fr/' },
  { nom: 'Google Street View', usage: 'Vues de rue.', url: 'https://www.google.com/maps' },
  { nom: 'Géoportail', usage: 'Photo aérienne récente.', url: 'https://www.geoportail.gouv.fr/' },
  {
    nom: 'Remonter le temps (IGN)',
    usage: 'Photos aériennes anciennes, pour repérer une extension.',
    url: 'https://remonterletemps.ign.fr/',
  },
]

const logiciels = [
  { nom: 'Vue.js', usage: 'Interface', url: 'https://vuejs.org/' },
  { nom: 'Vite', usage: 'Construction du site', url: 'https://vite.dev/' },
  { nom: 'TypeScript', usage: 'Langage', url: 'https://www.typescriptlang.org/' },
  { nom: 'Leaflet', usage: 'Carte interactive', url: 'https://leafletjs.com/' },
  { nom: 'sharp', usage: 'Génération des icônes', url: 'https://sharp.pixelplumbing.com/' },
  { nom: 'GitHub Pages', usage: 'Hébergement', url: 'https://pages.github.com/' },
]
</script>

<template>
  <main class="sources">
    <a href="#" class="back">← Retour à la recherche</a>

    <header>
      <div class="brand">
        <img src="/icons/icon.svg" alt="" width="56" height="56" />
        <h1>Sources et outils</h1>
      </div>
      <p class="muted">
        Sherlock Immo ne possède aucune donnée : tout vient de services publics, interrogés directement depuis votre
        navigateur. Voici lesquels, et à quoi ils servent.
      </p>
    </header>

    <section>
      <h2>Données publiques</h2>
      <p class="muted small">
        Toutes publiées sous
        <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" target="_blank" rel="noopener"
          >Licence Ouverte 2.0</a
        >.
        <template v-if="updatedAt">
          Base des DPE mise à jour le {{ new Date(updatedAt).toLocaleDateString('fr-FR') }}.</template
        >
      </p>
      <ul class="cards">
        <li v-for="d in donnees" :key="d.nom">
          <a :href="d.url" target="_blank" rel="noopener">{{ d.nom }} ↗</a>
          <p>{{ d.usage }}</p>
          <small class="muted">{{ d.producteur }}</small>
        </li>
      </ul>
    </section>

    <section>
      <h2>Pour aller voir sur place</h2>
      <p class="muted small">Ouverts dans un nouvel onglet depuis la fiche d'un logement.</p>
      <ul class="cards">
        <li v-for="c in consultation" :key="c.nom">
          <a :href="c.url" target="_blank" rel="noopener">{{ c.nom }} ↗</a>
          <p>{{ c.usage }}</p>
        </li>
      </ul>
    </section>

    <section>
      <h2>Logiciels libres utilisés</h2>
      <ul class="chips">
        <li v-for="l in logiciels" :key="l.nom">
          <a :href="l.url" target="_blank" rel="noopener">{{ l.nom }}</a>
          <span class="muted">{{ l.usage }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h2>Vie privée</h2>
      <ul class="plain">
        <li>Pas de compte, pas de publicité, pas de mesure d'audience.</li>
        <li>Vos derniers critères de recherche et le thème choisi restent dans votre navigateur.</li>
        <li>
          Les recherches partent directement vers les services ci-dessus, qui voient donc votre adresse IP comme pour
          n'importe quel site.
        </li>
      </ul>
    </section>

    <section>
      <h2>Le projet</h2>
      <p>
        Sherlock Immo est un logiciel libre sous licence MIT, développé par et pour des acheteurs.
        <template v-if="repoUrl">
          Code source, documentation et suggestions :
          <a :href="repoUrl" target="_blank" rel="noopener">{{ repoUrl.replace('https://', '') }} ↗</a>
        </template>
      </p>
      <p class="muted small">
        Les informations affichées sont des indices tirés des données publiques, pas un avis juridique ni financier.
        Sherlock Immo n'est affilié à aucun des organismes cités.
      </p>
    </section>
  </main>
</template>

<style scoped>
.sources {
  max-width: 980px;
  margin: 0 auto;
  padding: 40px 24px 56px;
}
.back {
  display: inline-block;
  margin-bottom: 20px;
  text-decoration: none;
  font-weight: 600;
}
header {
  margin-bottom: 28px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
h1 {
  margin: 0;
  font-size: 2em;
  font-weight: 800;
  letter-spacing: -0.02em;
}
header p {
  max-width: 680px;
  font-size: 1.05em;
}
section {
  margin-bottom: 32px;
}
h2 {
  margin: 0 0 6px;
  font-size: 1.15em;
}
.small {
  font-size: 0.9em;
  margin: 0 0 12px;
}
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.cards li {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.cards a {
  font-weight: 600;
  text-decoration: none;
}
.cards p {
  margin: 6px 0 4px;
}
.chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips li {
  display: flex;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
}
.chips a {
  font-weight: 600;
  text-decoration: none;
}
.plain {
  margin: 0;
  padding-left: 18px;
}
.plain li {
  margin-bottom: 4px;
}
</style>
