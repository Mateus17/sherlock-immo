# Contribuer à Sherlock Immo

Merci de votre intérêt ! Toute aide est bienvenue : signaler un bug, proposer une idée, corriger une faute, ajouter une règle de vérification.

## Signaler un problème ou proposer une idée

Ouvrez une [issue](../../issues) en indiquant :

- ce que vous avez fait (critères de recherche, commune) ;
- ce que vous attendiez, et ce qui s'est passé ;
- le navigateur ou l'appareil.

**N'indiquez pas l'adresse d'un logement précis** dans une issue publique. Décrivez le cas avec des valeurs approchées (« maison classée E, environ 130 m², dans une commune de 20 000 habitants »).

## Lancer le projet

```bash
git clone https://github.com/Mateus17/sherlock-immo.git
cd sherlock-immo
npm install
npm run dev
```

Avant de proposer une modification :

```bash
npm test        # tests unitaires (Vitest)
npm run build   # vérifie les types (vue-tsc) puis construit
```

La même vérification tourne automatiquement sur chaque pull request.

## Principes du projet

- **Pour l'acheteur.** Chaque fonctionnalité doit aider quelqu'un qui cherche un logement à mieux comprendre ce qu'il achète.
- **Données publiques uniquement**, interrogées depuis le navigateur. Une nouvelle source doit être :
  - sans clé d'API ni compte ;
  - sans quota bloquant pour un usage normal ;
  - accessible en CORS (vérifiable avec `curl -I -H "Origin: http://localhost:5173" <url>`, qui doit renvoyer un en-tête `access-control-allow-origin`).
- **Pas de serveur.** Le site doit rester déployable comme simples fichiers statiques.
- **Des signaux, pas des verdicts.** Un point d'attention explique ce qui a été constaté et quelle question poser. Il n'accuse personne.
- **Sobre.** Pas de pistage, pas de publicité, pas de dépendance lourde sans bonne raison.

## Conventions de code

- Vue 3 `<script setup lang="ts">`, TypeScript strict.
- Interface et commentaires **en français**. Les identifiants de code reprennent les noms des API (`etiquette_dpe`, `surface_habitable_logement`…).
- Les appels réseau vont dans `src/api/`, la logique d'analyse dans `src/lib/` (fonctions pures).
- Les commentaires expliquent le **pourquoi** (une contrainte d'API, un seuil, un piège), pas ce que fait la ligne.
- Couleurs via les variables CSS de `src/style.css`, pour garder les thèmes clair et sombre.

## Ajouter une règle de vérification

1. Ajoutez la condition dans `analyser()` ou `analyserTerritoire()` (`src/lib/verification.ts`).
2. Choisissez le niveau : `alerte` (incohérence forte), `attention` (à vérifier ou à négocier), `info`, `ok`.
3. Rédigez un `titre` factuel et un `detail` qui dit quoi demander ou vérifier.
4. Ajoutez un test dans `src/lib/__tests__/verification.test.ts`, avec un logement **fictif**.
5. Si la règle repose sur un seuil ou sur un texte de loi, indiquez la source en commentaire et ajoutez-la au tableau de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#règles-de-vérification).

## Proposer une modification

1. Créez une branche depuis `main`.
2. Faites des commits courts et explicites.
3. Ouvrez une pull request qui explique le besoin, la solution et comment vous l'avez testée (captures d'écran bienvenues pour l'interface).

En contribuant, vous acceptez que votre code soit publié sous [licence MIT](LICENSE).
