# Changelog

Les évolutions notables de Sherlock Immo. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- **Mode simple** (par défaut) : commune, type de bien, étiquettes énergie et climat, surface. Le **mode avancé** affiche les autres critères (chiffres de l'annonce, date, communes voisines et rayon, construction et équipements). Les critères avancés restent appliqués en mode simple, avec un rappel pour les voir ou les effacer.
- Lien **Voir sur Google Maps** dans la bulle d'un point de la carte.

### Modifié

- Carte : **photo aérienne par défaut** (on y reconnaît la maison) ; le dernier fond choisi est retenu.

### Corrigé

- Données hébergées partielles (développement, construction limitée à quelques départements) : une commune hors des départements construits passe par l'API au lieu de n'afficher aucune maison.

## [1.2.0] — 2026-10-26

### Ajouté

- **Données hébergées** : les DPE de maisons (existantes et neuves) sont copiés chaque semaine avec le site, un fichier compressé par commune (5 millions de maisons, ~210 Mo pour la France). La recherche de maisons et l'historique d'adresse ne passent plus par l'API de l'ADEME : plus de quota, et une recherche plus rapide.
- Workflow hebdomadaire « Données hébergées » (dimanche) et script `npm run donnees`.
- Nouvel essai automatique en cas de quota (429) ou de raté réseau, annoncé par un bandeau.

### Modifié

- Appartements, détail d'une fiche, audits et DPE d'avant 2021 restent servis par l'API de l'ADEME.

### Corrigé

- Paris, Lyon et Marseille : la recherche couvre leurs arrondissements (la base adresse les code séparément), elle ne trouvait presque rien.

## [1.1.0] — 2026-10-24

### Ajouté

- Filtres **Construction et équipements** : période de construction, énergie de chauffage, pompe à chaleur, plain-pied, photovoltaïque, bon confort d'été (repris dans le lien partageable).
- **Questions à poser lors de la visite**, générées à partir des points d'attention.
- **Dossier imprimable** de la fiche (papier ou PDF).
- **Favoris** avec notes et prix, page « Mes favoris ».
- **Comparateur** de 2 ou 3 logements.
- Points **regroupés** sur la carte quand ils sont nombreux.

### Amélioré

- Chargement initial divisé par 2,5 : carte, fiche et pages secondaires chargées à la demande.
- Accès réseau commun : délai maximal, messages d'erreur lisibles, cache (rouvrir une fiche ne relance aucun appel).
- Requêtes moins coûteuses pour l'API de l'ADEME, qui limite le temps de calcul par utilisateur, et message clair en cas de dépassement.
- Accessibilité : clavier partout, lecteurs d'écran, Échap pour fermer la fiche ; aucun défaut à l'audit axe.
- Politique de sécurité du contenu : seuls les services publics utilisés sont joignables.

### Technique

- Code découpé en composables et composants (formulaire, fiche).
- Mise à jour : Vite 8, Vitest 5, vue-tsc 3, TypeScript 6.
- ESLint et Prettier vérifiés dans la CI ; 28 tests.
- Code de conduite et politique de sécurité.

## [1.0.0] — 2026-10-24

Première version publique.

### Retrouver le bien

- Recherche par commune (avec communes voisines à cocher et rayon), type de bien, étiquettes DPE et GES, surface (valeur ± tolérance ou fourchette) et date du DPE.
- Recherche par les chiffres de l'annonce : consommation (kWh/m²/an), émissions (kg CO₂/m²/an), dépenses annuelles d'énergie.
- Collage d'une annonce : les indices remplissent les critères automatiquement.
- Lien partageable d'une recherche.
- Logements existants et neufs, un seul DPE par adresse (option).
- Carte (plan IGN, photo aérienne), tableau triable, export CSV.

### Vérifier le bien

- Historique des DPE de l'adresse, y compris avant 2021 : étiquette améliorée rapidement, surface modifiée, DPE refait sans nouvelle visite (réforme de l'électricité de 2026 prise en compte).
- Surface comparée à l'annonce et à la surface déclarée aux impôts.
- Ventes passées (DVF) et prix au m² du quartier.
- Parcelle cadastrale, zonage PLU et zones à urbaniser à proximité.
- Risques Géorisques.
- Isolation, pertes de chaleur, équipements, facture par poste, audit énergétique chiffré.
- Liens vers la vue de rue, la photo aérienne et les photos anciennes.

### Application

- Installable (PWA) sur ordinateur, Android et iOS, thème clair et sombre.
- Page « Sources et outils ».

[1.2.0]: https://github.com/Mateus17/sherlock-immo/releases/tag/v1.2.0
[1.1.0]: https://github.com/Mateus17/sherlock-immo/releases/tag/v1.1.0
[1.0.0]: https://github.com/Mateus17/sherlock-immo/releases/tag/v1.0.0
