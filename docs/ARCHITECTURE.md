# Comment c'est fait

Sherlock Immo est une application **100 % front-end**. Il n'y a ni serveur ni base de données : le navigateur interroge directement des API publiques, sans clé et ouvertes en CORS. C'est ce qui permet de l'héberger gratuitement sur GitHub Pages, et de l'installer comme une application (PWA) sur ordinateur et sur téléphone.

## Stack

| Rôle | Outil |
|---|---|
| Interface | [Vue 3](https://vuejs.org) (Composition API, `<script setup>`) + TypeScript |
| Build | [Vite](https://vite.dev) |
| Carte | [Leaflet](https://leafletjs.com) + tuiles IGN Géoplateforme |
| Installation (ordinateur, Android, iOS) | Manifest web + service worker (PWA) |
| Icônes | [sharp](https://sharp.pixelplumbing.com) (génération des PNG à partir du SVG) |

Aucune autre dépendance à l'exécution.

## Arborescence

```
src/
├── main.ts                    point d'entrée, enregistrement du service worker
├── App.vue                    formulaire, état de la recherche, mise en page
├── style.css                  thème (variables CSS clair / sombre)
├── api/
│   ├── dpe.ts                 ADEME : recherche, détail, historique, audits
│   ├── geo.ts                 API Géo : communes, communes voisines
│   └── territoire.ts          cadastre, PLU, Géorisques, DVF
├── lib/
│   ├── verification.ts        règles « points d'attention » (fonctions pures)
│   ├── annonce.ts             lecture d'une annonce collée (expressions régulières)
│   ├── lien.ts                critères ↔ paramètres d'adresse (lien partageable)
│   ├── presse-papiers.ts      copie avec repli
│   └── __tests__/             tests Vitest
└── components/
    ├── AnnoncePaste.vue       zone « coller une annonce »
    ├── CityPicker.vue         saisie des communes (+ filtre département)
    ├── NearbyCommunes.vue     liste à cocher des communes voisines
    ├── EtiquettePicker.vue    boutons A → G
    ├── ResultsMap.vue         carte Leaflet
    ├── ResultsTable.vue       tableau triable
    ├── DpeDetail.vue          fiche de vérification
    ├── DpeBadge.vue           pastille d'étiquette
    ├── InstallButton.vue      bouton « Installer l'application » (aide iOS)
    ├── SourcesPage.vue        page « Sources et outils » (#sources)
    └── ThemeToggle.vue        bouton clair / sombre
public/
├── manifest.webmanifest       description de l'application installable
├── sw.js                      service worker (ouverture hors ligne)
└── icons/icon.svg             logo, source de toutes les icônes
scripts/make-icons.mjs         génère les icônes PNG à partir du SVG
```

## Flux d'une recherche

0. Facultatif : `lireAnnonce()` transforme une annonce collée en indices, qui remplissent le formulaire. La commune est retrouvée par le code postal (ou « Ville (35) ») via l'API Géo.

1. `App.vue` transforme le formulaire en `DpeFilters` (la surface « valeur ± tolérance » devient un intervalle, les dates exactes deviennent `gte = lte`, etc.).
2. `searchDpe()` construit une requête par base (existants, et neufs si la case est cochée) et par zone. Sans rayon, toutes les communes tiennent en une requête (`code_insee_ban_in`). Avec un rayon, il faut une requête par commune, car l'API n'accepte qu'un seul `geo_distance`.
3. Les résultats sont fusionnés et dédoublonnés par numéro de DPE. Chaque ligne garde sa base d'origine (`_source`).
4. « Charger plus » suit le curseur `next` de chaque requête.
5. L'adresse de la page est mise à jour avec les critères (`versParams()`). À l'ouverture d'un lien contenant `?c=…`, `depuisParams()` relit les critères, l'app retrouve les communes par leur code INSEE puis relance la recherche.
6. L'option « un seul DPE par adresse » est appliquée côté client (`latestPerAddress`).

## Flux de la fiche

`DpeDetail.vue` lance en parallèle, et indépendamment (une panne n'empêche pas le reste de s'afficher) :

- le détail complet du DPE ;
- l'historique de l'adresse (même `identifiant_ban`, dans les deux bases) ;
- les DPE d'avant 2021 (recherche à 50 m, puis comparaison de l'adresse écrite) ;
- les audits énergétiques de l'adresse ;
- la parcelle cadastrale sous le point, **puis** les ventes DVF de sa section cadastrale ;
- le rapport Géorisques ;
- la zone du PLU sous le point et autour (carré de ±150 m).

Tout est ensuite passé à `analyser()` (`src/lib/verification.ts`), qui renvoie une liste de `Point { niveau, titre, detail }` triée par gravité. Ce sont des **fonctions pures**, sans appel réseau : faciles à lire, à tester et à enrichir.

## Sources de données

Toutes ont été vérifiées sans clé, avec CORS, et une rafale de requêtes parallèles n'a déclenché aucun refus.

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
- la date de mise à jour du jeu est lue dans `dataUpdatedAt`.

### API Géo

`https://geo.api.gouv.fr/communes?nom=…&codeDepartement=…&codePostal=…` pour l'autocomplétion. Pour les communes voisines, on interroge la commune sous 8 points du cercle afin de savoir quels départements charger (`/departements/{code}/communes`, mis en cache), puis on calcule les distances côté client.

### IGN API Carto

- `GET https://apicarto.ign.fr/api/cadastre/parcelle?geom={GeoJSON Point}` : parcelle, `contenance` (m²), `section`, contour.
- `GET https://apicarto.ign.fr/api/gpu/zone-urba?geom={GeoJSON}` : zone du PLU (`libelle`, `typezone` : U, AU, A, N…).

### Géorisques

`GET https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=lon,lat` : tout le rapport d'une adresse en un appel (`risquesNaturels`, `risquesTechnologiques`, statut pour l'adresse et pour la commune).

### DVF

`GET https://app.dvf.etalab.gouv.fr/api/mutations3/{codeInsee}/{prefixe}{section}` : toutes les ventes d'une section cadastrale (quelques centaines de Ko). Les valeurs arrivent en chaînes, avec `"nan"` et `"None"` pour les vides. Une vente occupe plusieurs lignes (une par local et par parcelle) qui répètent le prix total : `grouper()` les rassemble.

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

`npm test` (Vitest) couvre les fonctions pures : lecture d'annonce, lien partageable, règles de vérification. Les données de test sont **fictives** : n'y mettez jamais les chiffres d'un logement réel, qu'on pourrait retrouver avec l'application.

## Publication

- `.github/workflows/ci.yml` : tests, types et build sur chaque pull request.
- `.github/workflows/deploy.yml` : tests puis build à chaque push sur `main`, publication sur GitHub Pages.
- `.github/dependabot.yml` : mises à jour mensuelles et groupées des dépendances et des actions. `vite.config.ts` utilise `base: './'` : le même build fonctionne à la racine d'un domaine comme dans un sous-dossier (`/sherlock-immo/`). Le workflow injecte `VITE_REPO_URL`, affichée sur la page Sources et outils.

## Pistes

- Recherche inverse par surface de terrain : parcelles d'une commune ([cadastre Etalab](https://cadastre.data.gouv.fr), champ `contenance`) croisées avec les DPE.
- Permis de construire (Sitadel) pour vérifier une extension.
