# Changelog

Les évolutions notables de Sherlock Immo. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

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

[1.0.0]: https://github.com/Mateus17/sherlock-immo/releases/tag/v1.0.0
