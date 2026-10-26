# Comment c'est fait

Sherlock Immo est une application **100 % front-end**. Il n'y a ni serveur ni base de données : le navigateur interroge directement des API publiques, sans clé et ouvertes en CORS. C'est ce qui permet de l'héberger gratuitement sur GitHub Pages, et de l'installer comme une application (PWA) sur ordinateur et sur téléphone.

## Stack

| Rôle | Outil |
|---|---|
| Interface | [Vue 3](https://vuejs.org) (Composition API, `<script setup>`) + TypeScript |
| Build | [Vite](https://vite.dev) |
| Carte | [Leaflet](https://leafletjs.com) + [leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) + tuiles IGN Géoplateforme |
| Installation (ordinateur, Android, iOS) | Manifest web + service worker (PWA) |
| Icônes | [sharp](https://sharp.pixelplumbing.com) (génération des PNG à partir du SVG) |
| Qualité | Vitest (+ happy-dom), ESLint, Prettier, vue-tsc, axe-core (audit d'accessibilité) |

Aucune autre dépendance à l'exécution.

## Arborescence

```
src/
├── main.ts                    point d'entrée, enregistrement du service worker
├── App.vue                    mise en page, pages (#sources, #favoris), chargement à la demande
├── style.css                  thème (variables CSS clair / sombre), accessibilité
├── styles/
│   ├── formulaire.css         formulaire de recherche (colonne et page d'accueil)
│   └── fiche.css              fiche d'un logement, version imprimable
├── composables/               état partagé, sans dépendance à un composant
│   ├── useCriteres.ts         critères du formulaire (mémorisés), conversion en filtres d'API
│   ├── useRecherche.ts        résultats, pagination, sélection, fiche ouverte
│   ├── useAnnonce.ts          annonce collée → critères
│   ├── useLienPartage.ts      critères ↔ adresse de la page, bouton Partager
│   ├── useFiche.ts            chargement de toutes les données d'une fiche
│   └── useFavoris.ts          favoris, notes, sélection du comparateur (navigateur)
├── api/
│   ├── dpe.ts                 ADEME : recherche, détail, historique, audits
│   ├── geo.ts                 API Géo : communes, communes voisines
│   └── territoire.ts          cadastre, PLU, Géorisques, DVF
├── lib/                       fonctions pures, testées
│   ├── http.ts                accès réseau : délai maximal, erreurs lisibles, cache
│   ├── verification.ts        règles « points d'attention » et questions de visite
│   ├── annonce.ts             lecture d'une annonce collée (expressions régulières)
│   ├── lien.ts                critères ↔ paramètres d'adresse
│   ├── leaflet.ts             Leaflet + regroupement des points
│   ├── export-csv.ts, format.ts, saisie.ts, presse-papiers.ts
│   └── __tests__/             tests Vitest
└── components/
    ├── filtres/               un composant par bloc du formulaire (+ SearchForm)
    ├── fiche/                 une section de fiche par composant
    ├── DpeDetail.vue          fiche : assemble les sections, favori, impression
    ├── FavorisPage.vue        page « Mes favoris » (#favoris)
    ├── Comparateur.vue        comparaison de 2 ou 3 favoris
    ├── ResultsBar.vue         compteur, partage, export
    ├── ResultsMap.vue         carte (chargée à la demande)
    ├── ResultsTable.vue       tableau triable et accessible au clavier
    ├── AnnoncePaste.vue, CityPicker.vue, NearbyCommunes.vue, EtiquettePicker.vue
    ├── DpeBadge.vue, InstallButton.vue, SourcesPage.vue, ThemeToggle.vue
public/
├── manifest.webmanifest       description de l'application installable
├── sw.js                      service worker (ouverture hors ligne)
├── og.png                     image d'aperçu des liens partagés
└── icons/icon.svg             logo, source de toutes les icônes
scripts/make-icons.mjs         génère les icônes PNG et og.png à partir du SVG
```

Les composables tiennent un **état unique au niveau du module** (`useCriteres`, `useRecherche`, `useFavoris`) : chaque composant qui les appelle lit et modifie le même état, sans passer de props sur plusieurs niveaux. `useFiche` est l'exception : il crée un état par fiche ouverte.

## Flux d'une recherche

0. Facultatif : `lireAnnonce()` transforme une annonce collée en indices, qui remplissent le formulaire. La commune est retrouvée par le code postal (ou « Ville (35) ») via l'API Géo.

1. `useCriteres().toFilters()` transforme le formulaire en `DpeFilters` (la surface « valeur ± tolérance » devient un intervalle, les dates exactes deviennent `gte = lte`, etc.).
2. `searchDpe()` construit une requête par base (existants, et neufs si la case est cochée) et par zone. Sans rayon, toutes les communes tiennent en une requête (`code_insee_ban_in`). Avec un rayon, il faut une requête par commune, car l'API n'accepte qu'un seul `geo_distance`.
3. Les résultats sont fusionnés et dédoublonnés par numéro de DPE. Chaque ligne garde sa base d'origine (`_source`).
4. « Charger plus » suit le curseur `next` de chaque requête.
5. L'adresse de la page est mise à jour avec les critères (`versParams()`). À l'ouverture d'un lien contenant `?c=…`, `depuisParams()` relit les critères, l'app retrouve les communes par leur code INSEE puis relance la recherche.
6. L'option « un seul DPE par adresse » est appliquée côté client (`latestPerAddress`).

## Flux de la fiche

`useFiche()` lance en parallèle, et indépendamment (une panne n'empêche pas le reste de s'afficher) :

- le détail complet du DPE ;
- l'historique de l'adresse (même `identifiant_ban`, dans les deux bases) ;
- les DPE d'avant 2021 (recherche à 50 m, puis comparaison de l'adresse écrite) ;
- les audits énergétiques de l'adresse ;
- la parcelle cadastrale sous le point, **puis** les ventes DVF de sa section cadastrale ;
- le rapport Géorisques ;
- la zone du PLU sous le point et autour (carré de ±150 m).

Tout est ensuite passé à `analyser()` (`src/lib/verification.ts`), qui renvoie une liste de `Point { niveau, titre, detail, question }` triée par gravité. Les `question` alimentent la section « Questions à poser lors de la visite » du dossier imprimable. Ce sont des **fonctions pures**, sans appel réseau : faciles à lire, à tester et à enrichir.

## Données hébergées (maisons, sans quota)

L'API de l'ADEME limite le temps de calcul par utilisateur. Pour que la recherche de **maisons** n'en dépende pas, le site embarque sa propre copie des DPE de maisons (existantes et neuves), reconstruite chaque semaine.

**Construction** (`scripts/donnees/construire.ts`, lancé par `.github/workflows/donnees.yml` le dimanche à 3 h 17 UTC) :

1. Pour chaque département, télécharge les maisons page par page (10 000 lignes, `count=false`), en attendant quand l'API répond 429. Environ 2 h pour la France.
2. Encode chaque DPE en ligne compacte (`src/lib/miroir-format.ts`) : textes répétitifs remplacés par des numéros, adresse sans « code postal + commune ». Environ **42 octets par maison compressée, ~215 Mo pour la France**, sous la limite de 1 Go de GitHub Pages.
3. Écrit un fichier par commune, `donnees/maisons/{département}/{insee}.json.gz`, et `donnees/index.json` (dictionnaires, dates, volumes).
4. Range l'archive `donnees.tar` dans la release **« donnees »** (pas dans git : le dépôt ne grossit pas), commite `donnees-version.json` (garde les tâches planifiées actives, GitHub les coupant après 60 jours sans activité) puis appelle `deploy.yml`.

**Déploiement** (`deploy.yml`) : après le build, télécharge l'archive de la release et l'extrait dans `dist/`. Sans archive (fork tout neuf), le site fonctionne via l'API.

**Lecture** (`src/lib/miroir.ts`) : `disponible()` lit `donnees/index.json`. Si présent, `searchDpe()` sert les maisons depuis les fichiers de commune (filtres appliqués dans le navigateur par `filtrerLignes()`, mêmes règles que l'API) et l'historique d'adresse d'une maison aussi. Les appartements, le détail d'une fiche, les audits et les DPE d'avant 2021 restent sur l'API (3 petites requêtes par fiche, en cache). Recherche par rayon : fichiers des communes dont le centre est à moins de rayon + 3 km, puis tri des logements à la distance exacte. Un `.gz` est décompressé dans le navigateur (`DecompressionStream`) sauf si le serveur l'a déjà fait (signature `1f 8b`).

Vérifications faites : mêmes résultats que l'API (81 sur 81 pour une recherche à Rennes ; 2 058 sur 2 059 dans un rayon de 10 km, l'écart étant un logement à la limite).

Pour développer : `npm run donnees -- --departements 35` construit un département dans `public/donnees/` (ignoré par git), servi par `npm run dev`.

## Accès réseau

Tous les appels passent par `getJson()` (`src/lib/http.ts`) :

- **délai maximal** de 20 s, puis message « … ne répond pas » ;
- **nouvel essai** après un raté réseau ponctuel, et après un quota dépassé (429) : attente de 20 puis 40 s, annoncée par un bandeau (`AttenteQuota.vue`, événement `sherlock:attente`) ;
- **erreurs nommées** par service, affichées dans la fiche sans bloquer les autres sections ;
- **cache** en mémoire et en `sessionStorage` (1 h, réponses de moins de 150 000 caractères) : rouvrir une fiche ne relance aucun appel. Un échec n'est jamais mis en cache ;
- un abandon côté appelant (nouvelle recherche, fiche fermée) ne coupe pas un téléchargement partagé par une autre partie de l'app.

## Sources de données

Toutes sont sans clé et ouvertes en CORS. La **politique de sécurité du contenu** (`vite.config.ts`, ajoutée au build) n'autorise que ces domaines : une nouvelle source doit y être ajoutée.

### ADEME (data-fair)

Base : `https://data.ademe.fr/data-fair/api/v1/datasets/{id}/lines`

| Jeu | `id` |
|---|---|
| DPE logements existants (depuis juillet 2021) | `dpe03existant` |
| DPE logements neufs (depuis juillet 2021) | `g3cgx7jb3cmys5voxz1mrm22` |
| DPE avant juillet 2021 | `dpe-france` |
| Audits énergétiques | `ync2epx48x9azbdnggbygqp0` |

Filtres utilisés : `{champ}_eq`, `_in`, `_gte`, `_lte`, `geo_distance=lon,lat,10km`, `sort`, `select`, `size` (max 10 000). Points à savoir :

- un `select` contenant un champ absent du jeu renvoie une **erreur 400**. La base des neufs n'a pas `qualite_isolation_plancher_haut_comble_perdu` ni `qualite_isolation_plancher_haut_toit_terrasse` ;
- la consommation et les émissions ont parfois une décimale (186,5) alors que l'annonce affiche un entier : la recherche prend une fenêtre de ±0,5 ;
- la date de mise à jour du jeu est lue dans `dataUpdatedAt` ;
- **l'API limite le temps de calcul cumulé par utilisateur** : au-delà, elle répond `429` avec `Retry-After` (environ 40 s). Compter le total exact des résultats est l'opération la plus coûteuse : les recherches utilisent `count=estimate` (exact jusqu'à un seuil, estimé au-delà) et les autres appels `count=false` ;
- le type de générateur (« PAC air/eau installée après 2017 »…) est un libellé libre : le filtre pompe à chaleur utilise une recherche par préfixe, `qs=type_generateur_chauffage_principal:PAC*` ;
- l'année de construction manque pour environ 40 % des DPE de maisons, la période (`periode_construction`) est toujours renseignée : le filtre utilise donc les périodes.

### API Géo

`https://geo.api.gouv.fr/communes?nom=…&codeDepartement=…&codePostal=…` pour l'autocomplétion. Pour les communes voisines, on interroge la commune sous 8 points du cercle afin de savoir quels départements charger (`/departements/{code}/communes`, mis en cache), puis on calcule les distances côté client.

### IGN API Carto

- `GET https://apicarto.ign.fr/api/cadastre/parcelle?geom={GeoJSON Point}` : parcelle, `contenance` (m²), `section`, contour.
- `GET https://apicarto.ign.fr/api/gpu/zone-urba?geom={GeoJSON}` : zone du PLU (`libelle`, `typezone` : U, AU, A, N…).

### Géorisques

`GET https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=lon,lat` : tout le rapport d'une adresse en un appel (`risquesNaturels`, `risquesTechnologiques`, statut pour l'adresse et pour la commune).

### DVF

`GET https://app.dvf.etalab.gouv.fr/api/mutations3/{codeInsee}/{prefixe}{section}` : toutes les ventes d'une section cadastrale (quelques centaines de Ko). Les valeurs arrivent en chaînes, avec `"nan"` et `"None"` pour les vides. Une vente occupe plusieurs lignes (une par local et par parcelle) qui répètent le prix total : `grouperVentes()` les rassemble (testée dans `__tests__/dvf.test.ts`).

Les fichiers bruts `files.data.gouv.fr/geo-dvf/…` ne sont **pas** utilisables depuis un navigateur : ils redirigent vers un stockage sans en-têtes CORS.

## Règles de vérification

Les seuils sont dans `src/lib/verification.ts`, commentés. En résumé :

| Règle | Déclencheur |
|---|---|
| Surface annoncée ≠ DPE | écart > 5 % |
| Étiquette améliorée | par rapport au DPE précédent ; alerte si moins de 24 mois |
| Réforme électricité 2026 | gain de lettre d'un logement chauffé à l'électricité entre un DPE d'avant et un d'après le 1er janvier 2026 : simple info |
| Surface changée entre deux DPE | écart > 5 % |
| DPE refait sans nouvelle visite | visite antérieure à la date du DPE précédent, avec un résultat différent |
| Surface déclarée aux impôts | surface DPE > 1,3 × surface bâtie DVF et plus de 15 m² d'écart |
| Prix vs quartier | écart > 20 % avec la médiane des ventes du même type dans la section (3 ans, ventes de 300 à 20 000 €/m²) |
| Terrain annoncé ≠ parcelle | écart > 10 % |
| Interdiction de louer | G depuis 2025, F en 2028, E en 2034 (métropole) |

Pour ajouter une règle : écrire la condition dans `analyser()` (ou `analyserTerritoire()`), pousser un `Point`, et décrire le seuil ici.

## Installation (PWA)

- `public/manifest.webmanifest` : nom, couleurs, icônes (`any` et `maskable` pour Android), affichage `standalone`. Chrome et Edge proposent alors l'installation sur ordinateur et sur Android.
- `InstallButton.vue` intercepte `beforeinstallprompt` pour afficher un bouton dans la page. iOS n'a pas cet événement : le bouton y explique le geste *Partager → Sur l'écran d'accueil*.
- Balises `apple-mobile-web-app-*` et `apple-touch-icon` (180 px, sans transparence) dans `index.html` pour iOS.
- `public/sw.js` : réseau d'abord, cache en secours, uniquement pour les fichiers de l'application (jamais pour les API ni les tuiles). Incrémenter `CACHE` quand on modifie le service worker.
- Le service worker n'est enregistré qu'en contexte sécurisé (HTTPS ou localhost).
- `body` utilise `env(safe-area-inset-*)` pour l'encoche des iPhone.

## Logo

`public/icons/icon.svg` : une loupe dont l'anneau reprend les sept couleurs de l'étiquette énergie, avec une maison dans la lentille. `npm run icons` (`scripts/make-icons.mjs`) en tire les PNG : 192 et 512 px, une variante `maskable` (motif réduit à 80 % sur fond plein), l'icône iOS (fond carré plein) et le favicon 32 px.

## Tests

`npm test` (Vitest) couvre les fonctions pures : lecture d'annonce, lien partageable, règles de vérification, accès réseau (cache, délais, erreurs, avec `happy-dom`), regroupement des ventes DVF. Les données de test sont **fictives** : n'y mettez jamais les chiffres d'un logement réel, qu'on pourrait retrouver avec l'application.

## Publication

- `.github/workflows/ci.yml` : ESLint, Prettier, tests, types et build sur chaque pull request.
- `.github/workflows/deploy.yml` : tests puis build à chaque push sur `main`, publication sur GitHub Pages.
- `.github/dependabot.yml` : mises à jour mensuelles et groupées des dépendances et des actions. `vite.config.ts` utilise `base: './'` : le même build fonctionne à la racine d'un domaine comme dans un sous-dossier (`/sherlock-immo/`). Le workflow injecte `VITE_REPO_URL`, affichée sur la page Sources et outils.

## Accessibilité

- Tout est utilisable au clavier : tri des colonnes, ouverture d'une fiche depuis le tableau, Échap pour la fermer, saisie des communes au modèle *combobox*.
- La carte n'est pas indispensable : le tableau donne les mêmes logements.
- Audit avec axe-core (voir CONTRIBUTING) : aucun défaut sur l'accueil, les résultats, la fiche (thèmes clair et sombre), les favoris et la page Sources.

## Pistes

- Recherche inverse par surface de terrain : parcelles d'une commune ([cadastre Etalab](https://cadastre.data.gouv.fr), champ `contenance`) croisées avec les DPE.
- Permis de construire (Sitadel) pour vérifier une extension.
