<p align="center">
  <img src="public/icons/icon-192.png" width="96" height="96" alt="" />
</p>

<h1 align="center">Sherlock Immo</h1>

<p align="center">
  Retrouvez la maison d'une annonce immobilière, puis vérifiez tout ce que l'annonce ne dit pas.<br />
  Gratuit, open source, sans compte, uniquement avec les données publiques françaises.
</p>

<p align="center">
  <a href="https://mateus17.github.io/sherlock-immo/"><strong>Ouvrir l'application</strong></a>
  · <a href="docs/GUIDE.md">Guide d'utilisation</a>
  · <a href="docs/ARCHITECTURE.md">Comment c'est fait</a>
  · <a href="CONTRIBUTING.md">Contribuer</a>
</p>

---

## Pourquoi

Une annonce affiche une ville, une surface et les chiffres du DPE, mais rarement l'adresse. Pour savoir si la maison vaut le déplacement, il faut souvent demander à l'agence ou visiter.

Or ces chiffres sont publics. Depuis 2021, chaque DPE est enregistré par l'ADEME avec son adresse. Sherlock Immo s'en sert pour retrouver le bien, puis croise d'autres bases publiques pour répondre aux questions d'un acheteur : le DPE est-il crédible ? La surface est-elle juste ? Le prix est-il cohérent ? Y a-t-il un risque caché ?

## Ce que fait l'application

**Retrouver le bien**

- Par **commune** (plusieurs possibles, avec les communes voisines à cocher), **étiquettes DPE et GES**, **surface habitable** (valeur ± tolérance) et **date du DPE**.
- Par les **chiffres exacts de l'annonce** : consommation (kWh/m²/an), émissions (kg CO₂/m²/an) et dépenses annuelles d'énergie. Ce sont les critères les plus efficaces : deux chiffres suffisent souvent pour tomber sur une seule maison.
- Résultats sur une carte (plan ou photo aérienne IGN) et dans un tableau, avec export CSV.

**Vérifier le bien** (fiche détaillée)

- **Historique des DPE de l'adresse** : étiquette améliorée en quelques mois, surface qui change d'un DPE à l'autre, DPE refait sans nouvelle visite, DPE d'avant 2021.
- **Surface** du DPE comparée à celle de l'annonce et à la **surface déclarée aux impôts** lors de la dernière vente.
- **Ventes passées** de la parcelle (prix payé par le vendeur) et **prix au m² du quartier**.
- **Terrain** : surface cadastrale et contour de la parcelle.
- **Travaux** : qualité d'isolation paroi par paroi, répartition des pertes de chaleur, chauffage, ventilation, et l'**audit énergétique** chiffré quand il existe.
- **Risques** (inondation, argiles, radon, sols pollués…) et **urbanisme** (zone du PLU, zones constructibles à proximité).
- Liens vers la vue de rue, la photo aérienne et les photos aériennes anciennes (pour repérer une extension).

Chaque point d'attention est un **signal**, pas une preuve : il indique quelle question poser au vendeur ou à l'agence.

## Utiliser l'application

- **Dans le navigateur** : [mateus17.github.io/sherlock-immo](https://mateus17.github.io/sherlock-immo/)
- **Sur iPhone** : ouvrez le lien dans Safari, puis *Partager → Sur l'écran d'accueil*.
- **Sur Android** : ouvrez le lien dans Chrome, puis *Installer l'application*.
- **Sur Mac ou PC** : dans Chrome ou Edge, cliquez sur **« Installer l'application »** (sur la page d'accueil ou dans la barre d'adresse). Elle s'ouvre ensuite dans sa propre fenêtre, depuis le Dock ou le menu Démarrer.

Le [guide d'utilisation](docs/GUIDE.md) détaille comment passer d'une annonce à une adresse, puis lire la fiche.

## Données utilisées

Tout est interrogé directement depuis votre navigateur. Il n'y a ni serveur, ni compte, ni clé d'API, et rien de ce que vous cherchez n'est enregistré ailleurs que dans votre navigateur.

| Données | Producteur | Licence |
|---|---|---|
| DPE logements existants, neufs, d'avant 2021, audits énergétiques | [ADEME](https://data.ademe.fr) | Licence Ouverte 2.0 |
| Ventes immobilières (DVF) | DGFiP, via l'[application DVF d'Etalab](https://app.dvf.etalab.gouv.fr) | Licence Ouverte 2.0 |
| Cadastre, zonage d'urbanisme | IGN, [API Carto](https://apicarto.ign.fr) | Licence Ouverte 2.0 |
| Risques | [Géorisques](https://www.georisques.gouv.fr) | Licence Ouverte 2.0 |
| Communes | [API Géo](https://geo.api.gouv.fr) | Licence Ouverte 2.0 |
| Fonds de carte | [IGN Géoplateforme](https://geoservices.ign.fr) | Licence Ouverte 2.0 |

Sherlock Immo n'est affilié à aucun de ces organismes.

## Limites

- Seuls les logements ayant eu un DPE depuis juillet 2021 sont retrouvables. Une maison jamais diagnostiquée récemment n'apparaîtra pas.
- L'adresse du DPE est celle saisie par le diagnostiqueur, puis géocodée : elle peut être approximative.
- Les ventes (DVF) couvrent les cinq dernières années et ne comptent ni les ventes en Alsace-Moselle ni celles à Mayotte.
- Les estimations (facture d'énergie, coût des travaux) sont celles des diagnostics, pas des devis.
- Ce n'est pas un conseil juridique ni financier. Vérifiez auprès des professionnels concernés (notaire, diagnostiqueur) avant toute décision.

## Développement

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérification des types + build statique dans dist/
```

L'organisation du code, les API et les règles de vérification sont décrites dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Icônes

Le logo est un SVG unique, `public/icons/icon.svg`. `npm run icons` en génère les déclinaisons PNG (Android, iOS, favicon).

### Publication

Chaque push sur `main` construit le site et le publie sur GitHub Pages ([workflow](.github/workflows/deploy.yml)). Comme tous les chemins sont relatifs, le dossier `dist/` fonctionne aussi tel quel sur n'importe quel hébergement statique (Netlify, Cloudflare Pages…).

## Contribuer

Les retours, idées et corrections sont bienvenus : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE). Les données restent soumises à la licence de leurs producteurs (voir le tableau ci-dessus).
