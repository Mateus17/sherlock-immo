# Sécurité

## Signaler une faille

Merci de **ne pas ouvrir d'issue publique** pour une faille de sécurité. Utilisez le [signalement privé de GitHub](../../security/advisories/new) (onglet *Security* → *Report a vulnerability*).

Indiquez si possible la page ou le fichier concerné, comment reproduire le problème, et son impact. Vous recevrez une première réponse sous une semaine.

## Périmètre

Sherlock Immo est un site statique : pas de serveur, pas de compte, pas de base de données. Les points sensibles sont donc :

- le code exécuté dans le navigateur (injection de contenu venant d'une API, par exemple dans les infobulles de la carte) ;
- la politique de sécurité du contenu (`vite.config.ts`), qui limite les domaines joignables ;
- les données gardées dans le navigateur (critères, favoris, notes), qui ne doivent jamais partir ailleurs ;
- les dépendances (mises à jour par Dependabot).

Les données affichées viennent de services publics (ADEME, IGN, Géorisques, DVF) : une erreur dans ces données relève de leur producteur, pas d'une faille de Sherlock Immo.
