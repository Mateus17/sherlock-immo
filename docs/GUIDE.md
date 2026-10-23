# Guide d'utilisation

Ce guide part d'une annonce immobilière et va jusqu'à la vérification du bien.

## 1. Relever les indices de l'annonce

Une annonce doit légalement afficher plusieurs informations utiles. Notez-les :

| Sur l'annonce | Champ dans Sherlock Immo |
|---|---|
| Ville ou code postal | **Localisation** |
| Maison / appartement | **Type de bien** |
| Surface habitable | **Surface habitable** |
| Lettre énergie (A à G) et lettre climat | **Étiquettes DPE / GES** |
| Consommation en kWh/m²/an | **Chiffres de l'annonce → Énergie** |
| Émissions en kg CO₂/m²/an | **Chiffres de l'annonce → Climat** |
| « Montant estimé des dépenses annuelles d'énergie : entre X € et Y € » | **Dépenses annuelles d'énergie** |
| Date du DPE (parfois indiquée) | **Date du DPE** |

Les chiffres en kWh et en kg CO₂ sont **de loin les plus efficaces**. Une lettre seule correspond à des centaines de logements, ces deux chiffres à quelques-uns, souvent un seul.

**Le plus rapide :** cliquez sur **« Coller une annonce pour remplir les critères »** et collez tout le texte de l'annonce (titre, description, encadré énergie). Sherlock Immo repère les indices ci-dessus, les reporte dans les critères et garde le prix et le terrain pour la fiche. Vérifiez ce qui a été rempli, puis lancez la recherche. Le texte n'est envoyé nulle part.

## 2. Indiquer où chercher

- Tapez une ville ou un code postal. S'il existe plusieurs communes du même nom, ajoutez le numéro de département : `Saint-Martin 79`.
- Une liste **« Communes autour de… »** apparaît : cochez les villages voisins si l'annonce reste vague (« à 10 min de… »).
- La case **« Chercher aussi dans un rayon »** élargit la recherche à un cercle autour de chaque commune.

## 3. Choisir les critères

Commencez large, puis resserrez :

1. Ville + chiffres énergie et climat. Souvent, ça suffit.
2. S'il reste plusieurs résultats : ajoutez la **surface**. En mode « Valeur ± tolérance », la jauge à 0 % cherche la valeur exacte (100 m² trouve aussi 100,3 m²). Laissez quelques pourcents de marge, les annonces arrondissent.
3. Puis la **date du DPE** (« Du » seul = après cette date, « Au » seul = avant, les deux = entre).
4. Le bloc **Construction et équipements** (replié par défaut) affine encore : période de construction, énergie de chauffage, pompe à chaleur, plain-pied, panneaux photovoltaïques, bon confort d'été. Une case non cochée ne filtre rien.

Par défaut, la recherche inclut les logements neufs et ne montre qu'**un seul DPE par adresse** (le plus récent).

## 4. Lire les résultats

- Chaque point sur la carte a la couleur de son étiquette énergie. Quand ils sont nombreux, les points proches sont regroupés dans une pastille qui indique leur nombre : zoomez ou cliquez dessus pour les séparer. Le fond **Photo aérienne** (bouton en haut à droite de la carte) aide à reconnaître la maison des photos de l'annonce.
- Le tableau se trie par colonne. **Exporter CSV** récupère la liste.
- **← Nouvelle recherche** revient au formulaire en gardant vos critères.
- **Partager** copie un lien vers cette recherche (sur téléphone, ouvre le menu de partage). La personne qui l'ouvre retombe sur les mêmes résultats. Le lien contient les critères, pas d'adresse.

## 5. Vérifier le bien : la fiche

Cliquez sur un résultat pour ouvrir sa fiche.

### Comparer avec l'annonce

Saisissez la **surface**, le **terrain** et le **prix** de l'annonce : les points d'attention se mettent à jour (écart de surface, terrain plus grand que la parcelle, prix au-dessus du quartier, plus-value du vendeur).

### Points d'attention

Ils sont classés du plus grave au plus rassurant :

- 🔴 **Alerte** : incohérence forte à éclaircir avant d'aller plus loin. Par exemple, une surface au DPE bien supérieure à celle déclarée aux impôts, ou une étiquette gagnée en quelques mois sans nouvelle visite.
- 🟡 **Attention** : point à vérifier pendant la visite ou à négocier (isolation, ventilation, zone constructible à côté…).
- 🔵 **Info** : contexte utile (dernière vente, audit, chauffage).
- 🟢 **OK** : point vérifié et cohérent.

Un signal n'est pas une preuve. Il vous donne la question à poser : « Quels travaux expliquent le passage de F à E ? », « Pourquoi 140 m² au DPE et 90 m² aux impôts ? ».

### Questions de visite et dossier

La section **Questions à poser lors de la visite** reprend les points d'attention sous forme de questions, plus quelques incontournables. **Imprimer le dossier** (en tête de fiche) produit une version papier ou PDF de la fiche, avec ces questions : de quoi l'emporter à la visite.

### Le reste de la fiche

- **Par où part la chaleur** : les postes de travaux les plus rentables.
- **Isolation**, **Équipements**, **Facture par poste** : l'état du logement selon le diagnostiqueur.
- **Audit énergétique** : quand il existe (obligatoire pour vendre une maison F ou G), le coût chiffré des travaux, étape par étape.
- **Terrain et urbanisme** : surface cadastrale, contour tracé sur la carte, zone du PLU et zones à urbaniser à proximité.
- **Ventes passées** : prix et date des ventes de la parcelle, prix médian au m² des ventes du même type dans le quartier.
- **Risques** : synthèse Géorisques, avec le lien vers le rapport officiel complet.
- **Historique de l'adresse** : tous les DPE, y compris ceux d'avant 2021.
- **Voir sur place** : vue de rue, photo aérienne, comparaison avec les photos des années 1950-1965.

## 6. Mettre de côté et comparer

- **☆** (dans le tableau ou en tête de fiche) ajoute le logement à **Mes favoris**.
- Sur la page **Mes favoris** (lien en haut de page), notez le prix de l'annonce et vos impressions, rouvrez la fiche, ou cochez 2 ou 3 logements puis **Comparer la sélection** : un tableau côte à côte met en vert la meilleure valeur de chaque ligne.
- Favoris et notes restent dans ce navigateur : ils ne sont envoyés nulle part, et ne passent pas d'un appareil à l'autre.

## 7. Installer sur téléphone

1. Ouvrez l'application dans Safari (iPhone) ou Chrome (Android).
2. *Partager → Sur l'écran d'accueil* (iPhone) ou *menu ⋮ → Installer l'application* (Android).

L'icône ouvre Sherlock Immo en plein écran. Une connexion internet reste nécessaire pour les recherches.

## Questions fréquentes

**Aucun résultat ?** Le logement n'a peut-être pas de DPE depuis juillet 2021, ou les chiffres de l'annonce sont arrondis différemment. Retirez un critère à la fois, en commençant par la surface.

**Plusieurs résultats à la même adresse ?** Ce sont plusieurs DPE du même immeuble, ou des DPE refaits. Décochez « Un seul DPE par adresse » pour tout voir.

**« Trop de demandes d'un coup, réessayez… »** L'API de l'ADEME limite le temps de calcul par utilisateur. Patientez une minute : les fiches déjà ouvertes restent en mémoire.

**Mes recherches sont-elles enregistrées quelque part ?** Seulement dans votre navigateur (derniers critères, favoris, notes, thème). Les requêtes partent directement vers les services publics, sans passer par un serveur Sherlock Immo.
