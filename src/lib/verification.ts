// Règles « ne pas se faire avoir » : à partir du DPE, de l'historique de l'adresse
// et des audits, on produit des points d'attention lisibles par un acheteur.

import { ETIQUETTES, type Audit, type Dpe, type DpeDetail, type Etiquette, type OldDpe } from '../api/dpe'
import { type MarcheLocal, type Parcelle, type Risques, type Urbanisme } from '../api/territoire'

export type Niveau = 'alerte' | 'attention' | 'info' | 'ok'

export interface Point {
  niveau: Niveau
  titre: string
  detail?: string
  // Question à poser au vendeur ou à l'agence, reprise dans le dossier imprimable
  question?: string
}

const REFORME_ELEC_2026 = '2026-01-01'

const rank = (e?: string) => (e ? ETIQUETTES.indexOf(e as Etiquette) : -1)
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('fr-FR') : '?')
const nb = (n: number) => n.toLocaleString('fr-FR') // 91,5 et non 91.5
const monthsBetween = (a: string, b: string) =>
  Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30.44)

// Même logement : même complément et même étage (utile pour les appartements)
function sameLogement(a: Dpe, b: Dpe) {
  const k = (d: Dpe) =>
    [d.complement_adresse_logement, d.numero_etage_appartement]
      .map((v) =>
        String(v ?? '')
          .trim()
          .toLowerCase(),
      )
      .join('|')
  return a.type_batiment !== 'appartement' || k(a) === k(b)
}

export interface Contexte {
  dpe: DpeDetail
  history: Dpe[] // DPE depuis 2021 à la même adresse, dont celui-ci
  oldDpes: OldDpe[] // DPE avant 2021 à la même adresse
  audits: Audit[]
  surfaceAnnonce: number | null
  terrainAnnonce?: number | null
  prixAnnonce?: number | null
  parcelle?: Parcelle | null
  marche?: MarcheLocal | null
  risques?: Risques | null
  urbanisme?: Urbanisme | null
  today?: Date
}

const euros = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`

function analyserTerritoire(ctx: Contexte): Point[] {
  const { dpe, parcelle, marche, risques, urbanisme, terrainAnnonce, prixAnnonce } = ctx
  const points: Point[] = []

  // --- Terrain
  if (parcelle && terrainAnnonce != null) {
    const ecart = ((terrainAnnonce - parcelle.contenance) / parcelle.contenance) * 100
    if (ecart > 10)
      points.push({
        niveau: 'attention',
        titre: `Terrain annoncé plus grand que la parcelle (${terrainAnnonce} m² contre ${parcelle.contenance} m²)`,
        question: 'Quelles sont les références cadastrales exactes de toutes les parcelles vendues ?',
        detail:
          'Le bien peut compter plusieurs parcelles (jardin séparé, part de chemin) : demandez les références cadastrales exactes du compromis.',
      })
    else if (ecart < -10)
      points.push({
        niveau: 'info',
        titre: `Parcelle plus grande que le terrain annoncé (${parcelle.contenance} m²)`,
        question: 'Une division du terrain est-elle prévue ou en cours ?',
        detail: 'Division de terrain en cours, ou parcelle partagée ? À vérifier.',
      })
    else points.push({ niveau: 'ok', titre: `Terrain cohérent avec le cadastre (${parcelle.contenance} m²)` })
  }

  // --- Ventes passées
  const derniere = marche?.ventesParcelle[0]
  if (derniere?.prix) {
    const an = derniere.date.slice(0, 4)
    let detail = `${derniere.type !== 'Autre' ? derniere.type : 'Bien'} de ${derniere.surfaceBati ?? '?'} m² bâtis déclarés, terrain ${derniere.terrain ?? '?'} m².`
    if (prixAnnonce) {
      const pv = ((prixAnnonce - derniere.prix) / derniere.prix) * 100
      const ans = Math.max(1, new Date().getFullYear() - Number(an))
      detail += ` Prix annoncé : ${pv >= 0 ? '+' : ''}${pv.toFixed(0)} % en ${ans} an${ans > 1 ? 's' : ''}. Sans gros travaux justifiés (factures), c'est une marge de négociation.`
    }
    points.push({
      niveau: prixAnnonce && (prixAnnonce - derniere.prix) / derniere.prix > 0.3 ? 'attention' : 'info',
      titre: `Dernière vente : ${euros(derniere.prix)} en ${an}`,
      question: "Quels travaux ont été réalisés depuis l'achat, avec quelles factures ?",
      detail,
    })

    // Surface déclarée aux impôts (DGFiP) vs DPE
    const fiscale = derniere.surfaceBati
    const s = dpe.surface_habitable_logement
    if (fiscale && s && s > fiscale * 1.3 && s - fiscale > 15)
      points.push({
        niveau: 'alerte',
        titre: `Surface déclarée aux impôts : ${fiscale} m², contre ${nb(s)} m² au DPE`,
        question:
          "Les agrandissements ont-ils fait l'objet d'un permis ou d'une déclaration, et la taxe foncière a-t-elle été mise à jour ?",
        detail:
          'Lors de la vente de ' +
          an +
          ', la surface bâtie connue des impôts était bien plus petite. Extension ou aménagement non déclarés (taxe foncière à régulariser, permis ?) ou surface du DPE gonflée.',
      })
  }

  // --- Prix au m² comparé au quartier
  if (marche?.medianePrixM2 && prixAnnonce && dpe.surface_habitable_logement) {
    const pm2 = prixAnnonce / dpe.surface_habitable_logement
    const ecart = ((pm2 - marche.medianePrixM2) / marche.medianePrixM2) * 100
    const base = `${euros(pm2)}/m² contre une médiane de ${euros(marche.medianePrixM2)}/m² sur ${marche.comparables.length} ventes de la section cadastrale (3 ans).`
    if (ecart > 20)
      points.push({
        niveau: 'attention',
        titre: `Prix ${ecart.toFixed(0)} % au-dessus du quartier`,
        detail: base,
        question: 'Comment le prix a-t-il été fixé ? Sur quelles ventes comparables ?',
      })
    else if (ecart < -20)
      points.push({
        niveau: 'info',
        titre: `Prix ${Math.abs(ecart).toFixed(0)} % sous le quartier`,
        detail: `${base} Pourquoi ? Travaux, nuisances, vice ?`,
      })
    else points.push({ niveau: 'ok', titre: 'Prix dans la moyenne du quartier', detail: base })
  }

  // --- Risques
  for (const r of risques?.risques ?? []) {
    const adresse = r.statutAdresse ?? ''
    const commune = r.statutCommune ?? ''
    const ici = /existant|concern/i.test(adresse) && !/non concern|non connu/i.test(adresse)
    if (r.cle === 'inondation' && ici)
      points.push({
        niveau: 'alerte',
        titre: "Risque d'inondation signalé à cette adresse",
        question: "Le bien a-t-il déjà été inondé ? Quels sinistres ont été déclarés à l'assurance ?",
        detail: "Demandez si le bien a déjà été inondé (sinistres déclarés) et le coût de l'assurance.",
      })
    else if (r.cle === 'retraitGonflementArgile' && /moyen|fort/i.test(adresse || commune))
      points.push({
        niveau: 'attention',
        titre: `Sols argileux : exposition ${(adresse || commune).replace(/^Risque Existant - /i, '')}`,
        question:
          'Des fissures sont-elles apparues ? Une expertise ou une déclaration de catastrophe naturelle a-t-elle eu lieu ?',
        detail:
          'Risque de fissures en période de sécheresse. Inspectez murs et angles ; une étude de sol est obligatoire pour construire.',
      })
    else if (r.cle === 'radon' && /important/i.test(adresse || commune))
      points.push({
        niveau: 'attention',
        titre: 'Potentiel radon élevé',
        question: 'Une mesure du radon a-t-elle déjà été faite ?',
        detail:
          "Gaz radioactif naturel : ventilation indispensable, une mesure par dosimètre coûte quelques dizaines d'euros.",
      })
    else if (r.cle === 'pollutionSols' && ici)
      points.push({
        niveau: 'alerte',
        titre: 'Site pollué ou ancien site industriel à proximité',
        question: 'Le terrain ou le voisinage ont-ils accueilli une activité industrielle ou artisanale ?',
        detail: 'Consultez le détail dans le rapport Géorisques (lien plus bas).',
      })
    else if (r.cle === 'icpe' && ici)
      points.push({
        niveau: 'attention',
        titre: 'Installation industrielle classée à proximité',
        question: 'Quelle est cette installation, et y a-t-il des nuisances (bruit, odeurs, circulation) ?',
      })
    else if (r.cle === 'nucleaire' && ici) points.push({ niveau: 'attention', titre: 'Zone de risque nucléaire' })
  }

  // --- Urbanisme
  const z = urbanisme?.zone
  if (z) {
    const t = z.typezone.toUpperCase()
    if (t.startsWith('A') && !t.startsWith('AU'))
      points.push({
        niveau: 'attention',
        titre: `Zone agricole (${z.libelle}) au PLU`,
        detail: 'Agrandissements et annexes très encadrés.',
      })
    else if (t.startsWith('N'))
      points.push({
        niveau: 'attention',
        titre: `Zone naturelle (${z.libelle}) au PLU`,
        detail: 'Constructions nouvelles très limitées.',
      })
  }
  const aUrbaniser = urbanisme?.voisines.filter((v) => v.typezone.toUpperCase().startsWith('AU')) ?? []
  if (aUrbaniser.length)
    points.push({
      niveau: 'attention',
      titre: `Zone à urbaniser à moins de 150 m (${aUrbaniser.map((v) => v.libelle).join(', ')})`,
      question: 'Quels projets de construction sont prévus sur les terrains voisins ?',
      detail: 'Des constructions (lotissement, immeubles) peuvent pousser à côté : vue et calme non garantis.',
    })

  return points
}

export function analyser(ctx: Contexte): Point[] {
  const { dpe, history, oldDpes, audits, surfaceAnnonce } = ctx
  const today = ctx.today ?? new Date()
  const points: Point[] = []

  // --- Surface annoncée vs surface habitable du DPE
  if (surfaceAnnonce != null && dpe.surface_habitable_logement) {
    const s = dpe.surface_habitable_logement
    const ecart = ((surfaceAnnonce - s) / s) * 100
    if (ecart > 5)
      points.push({
        niveau: 'alerte',
        titre: `Surface annoncée supérieure de ${ecart.toFixed(0)} % au DPE`,
        question: 'Pouvez-vous fournir le mesurage de la surface habitable (loi Boutin, ou Carrez en copropriété) ?',
        detail: `${nb(surfaceAnnonce)} m² annoncés contre ${nb(s)} m² habitables. Véranda, combles, sous-sol ou garage comptés ? Demandez le métrage loi Boutin (ou Carrez en copropriété).`,
      })
    else if (ecart < -5)
      points.push({
        niveau: 'info',
        titre: `Surface annoncée inférieure de ${Math.abs(ecart).toFixed(0)} % au DPE`,
        detail: `${nb(surfaceAnnonce)} m² annoncés contre ${nb(s)} m² dans le DPE. Vérifiez que c'est bien le même logement.`,
      })
    else points.push({ niveau: 'ok', titre: 'Surface cohérente avec le DPE', detail: `${nb(s)} m² habitables.` })
  }

  // --- Validité
  if (dpe.date_fin_validite_dpe) {
    const fin = new Date(dpe.date_fin_validite_dpe)
    const mois = (fin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    if (mois < 0)
      points.push({
        niveau: 'alerte',
        titre: 'DPE expiré',
        question: 'Un nouveau DPE sera-t-il réalisé avant la promesse de vente ?',
        detail: `Fin de validité le ${fmtDate(dpe.date_fin_validite_dpe)}. Un DPE valide est obligatoire pour vendre.`,
      })
    else if (mois < 12)
      points.push({ niveau: 'info', titre: `DPE valide jusqu'au ${fmtDate(dpe.date_fin_validite_dpe)}` })
  }

  if (dpe.appartement_non_visite === 1)
    points.push({
      niveau: 'attention',
      titre: 'DPE établi sans visite du logement',
      question: 'Un DPE spécifique à ce logement, avec visite, peut-il être fourni ?',
      detail: "Calculé à partir des données de l'immeuble : il peut être éloigné de la réalité de ce logement.",
    })

  // --- Historique : DPE refaits pour le même logement
  const autres = history.filter((h) => h.numero_dpe !== dpe.numero_dpe && sameLogement(h, dpe))
  const anterieurs = autres.filter((h) => (h.date_etablissement_dpe ?? '') < (dpe.date_etablissement_dpe ?? ''))
  // On compare au DPE immédiatement précédent ; le nombre total de DPE est signalé à part
  if (anterieurs.length >= 2 && anterieurs[0].date_etablissement_dpe && dpe.date_etablissement_dpe) {
    const mois = Math.max(
      1,
      Math.round(monthsBetween(anterieurs[0].date_etablissement_dpe, dpe.date_etablissement_dpe)),
    )
    points.push({
      niveau: 'attention',
      titre: `${anterieurs.length + 1} DPE pour ce logement en ${mois} mois`,
      question: 'Pourquoi plusieurs DPE ont-ils été réalisés en si peu de temps ?',
      detail: `Étiquettes successives : ${[...anterieurs, dpe].map((h) => h.etiquette_dpe ?? '?').join(' → ')}. Pourquoi autant de diagnostics ?`,
    })
  }
  for (const h of anterieurs.slice(-1)) {
    if (!h.date_etablissement_dpe || !dpe.date_etablissement_dpe) continue
    const delta = rank(h.etiquette_dpe) - rank(dpe.etiquette_dpe)
    const mois = monthsBetween(h.date_etablissement_dpe, dpe.date_etablissement_dpe)
    if (delta > 0) {
      // Au 1er janvier 2026, le coefficient de l'électricité est passé de 2,3 à 1,9 :
      // un logement chauffé à l'électricité gagne souvent une lettre sans travaux
      const reformeElec =
        /lectricit/i.test(dpe.type_energie_principale_chauffage ?? '') &&
        h.date_etablissement_dpe < REFORME_ELEC_2026 &&
        dpe.date_etablissement_dpe >= REFORME_ELEC_2026
      if (reformeElec) {
        points.push({
          niveau: 'info',
          titre: `Étiquette améliorée de ${h.etiquette_dpe} à ${dpe.etiquette_dpe}, probablement par la réforme de 2026`,
          detail: `DPE précédent du ${fmtDate(h.date_etablissement_dpe)}. Depuis le 1er janvier 2026, l'électricité est moins pénalisée dans le calcul : le gain peut venir de là, pas de travaux.`,
        })
        continue
      }
      const court = mois < 24
      points.push({
        niveau: court ? 'alerte' : 'info',
        titre: `Étiquette améliorée de ${h.etiquette_dpe} à ${dpe.etiquette_dpe} en ${Math.max(1, Math.round(mois))} mois`,
        question: "Quels travaux expliquent l'amélioration de l'étiquette ? Pouvez-vous fournir les factures ?",
        detail: court
          ? `DPE du ${fmtDate(h.date_etablissement_dpe)} : ${h.etiquette_dpe}. Demandez les factures des travaux réalisés entre-temps ; sans travaux, un DPE refait jusqu'à obtenir une meilleure note est un signal d'alarme.`
          : `DPE du ${fmtDate(h.date_etablissement_dpe)} : ${h.etiquette_dpe}. Des travaux ont pu être faits : demandez les factures.`,
      })
    } else if (delta < 0) {
      points.push({
        niveau: 'info',
        titre: `Étiquette dégradée de ${h.etiquette_dpe} à ${dpe.etiquette_dpe}`,
        detail: `DPE précédent du ${fmtDate(h.date_etablissement_dpe)}. Les règles de calcul ont changé en 2021 puis en 2024 ; l'écart peut venir de là.`,
      })
    } else if (mois < 6) {
      points.push({
        niveau: 'info',
        titre: 'DPE refait à moins de 6 mois',
        detail: `Précédent du ${fmtDate(h.date_etablissement_dpe)}, même étiquette ${h.etiquette_dpe}.`,
      })
    }
  }
  // Nouveau DPE sans nouvelle visite : mêmes relevés, résultat différent
  const prec = anterieurs.at(-1)
  if (
    prec?.date_etablissement_dpe &&
    dpe.date_visite_diagnostiqueur &&
    dpe.date_visite_diagnostiqueur <= prec.date_etablissement_dpe &&
    (prec.etiquette_dpe !== dpe.etiquette_dpe || prec.surface_habitable_logement !== dpe.surface_habitable_logement)
  )
    points.push({
      niveau: 'alerte',
      titre: 'DPE refait sans nouvelle visite',
      question: "Qu'est-ce qui a été corrigé entre les deux DPE, sans nouvelle visite du diagnostiqueur ?",
      detail: `Visite du ${fmtDate(dpe.date_visite_diagnostiqueur)}, avant le DPE précédent du ${fmtDate(prec.date_etablissement_dpe)} (${prec.etiquette_dpe}, ${prec.surface_habitable_logement != null ? nb(prec.surface_habitable_logement) : '?'} m²). Mêmes relevés, résultat différent : demandez au diagnostiqueur ce qui a été corrigé.`,
    })

  // Surface qui change d'un DPE à l'autre : plus de m² fait baisser les kWh/m², donc l'étiquette
  const precedent = anterieurs.at(-1)
  if (precedent?.surface_habitable_logement && dpe.surface_habitable_logement) {
    const s0 = precedent.surface_habitable_logement
    const s1 = dpe.surface_habitable_logement
    const ecart = ((s1 - s0) / s0) * 100
    if (Math.abs(ecart) > 5)
      points.push({
        niveau: ecart > 0 ? 'alerte' : 'attention',
        titre: `Surface ${ecart > 0 ? 'augmentée' : 'réduite'} de ${nb(s0)} à ${nb(s1)} m² entre deux DPE`,
        question: 'Quelle est la surface habitable exacte, et pourquoi a-t-elle changé entre les deux DPE ?',
        detail:
          ecart > 0
            ? `DPE du ${fmtDate(precedent.date_etablissement_dpe)}. Une surface plus grande fait mécaniquement baisser les kWh/m² et améliore l'étiquette. Extension réelle (permis, factures) ou surface gonflée ?`
            : `DPE du ${fmtDate(precedent.date_etablissement_dpe)}. Vérifiez quelle surface est la bonne.`,
      })
  }

  const posterieurs = autres.filter((h) => (h.date_etablissement_dpe ?? '') > (dpe.date_etablissement_dpe ?? ''))
  if (posterieurs.length)
    points.push({
      niveau: 'attention',
      titre: 'Un DPE plus récent existe pour ce logement',
      question: 'Pouvez-vous fournir le DPE le plus récent ?',
      detail: `Le plus récent date du ${fmtDate(posterieurs.at(-1)!.date_etablissement_dpe)} (${posterieurs.at(-1)!.etiquette_dpe}). C'est lui qui fait foi.`,
    })

  if (oldDpes.length) {
    const dernier = oldDpes.at(-1)!
    points.push({
      niveau: 'info',
      titre: `${oldDpes.length} DPE d'avant 2021 à cette adresse`,
      detail: `Dernier : ${dernier.classe_consommation_energie} le ${fmtDate(dernier.date_etablissement_dpe)}. L'ancienne méthode n'est pas comparable lettre pour lettre.`,
    })
  }

  // --- Location et valeur : calendrier de la loi Climat et résilience (métropole)
  const e = dpe.etiquette_dpe
  if (e === 'G')
    points.push({
      niveau: 'alerte',
      titre: 'Passoire thermique (G) : interdit à la location depuis 2025',
      question: "Pouvez-vous fournir l'audit énergétique obligatoire ? Le prix tient-il compte des travaux ?",
      detail:
        "Vente : audit énergétique obligatoire. Le prix doit intégrer de gros travaux ; c'est un argument de négociation.",
    })
  else if (e === 'F')
    points.push({
      niveau: 'alerte',
      titre: 'Passoire thermique (F) : interdit à la location en 2028',
      question: "Pouvez-vous fournir l'audit énergétique obligatoire ? Le prix tient-il compte des travaux ?",
      detail: 'Vente : audit énergétique obligatoire. Le prix doit intégrer les travaux.',
    })
  else if (e === 'E')
    points.push({
      niveau: 'attention',
      titre: 'Classe E : interdit à la location en 2034',
      question: "Pouvez-vous fournir l'audit énergétique ? Des travaux d'isolation sont-ils envisagés ?",
      detail: 'Pèse sur la revente à moyen terme. Audit obligatoire à la vente depuis 2025.',
    })

  // --- Audits : coût chiffré des travaux
  for (const a of audits.slice(0, 1)) {
    const finale = a.etapes
      .filter((x) => x.etape_travaux === 'étape finale' && x.couts_cumules_travaux)
      .sort((x, y) => (x.couts_cumules_travaux ?? 0) - (y.couts_cumules_travaux ?? 0))[0]
    if (finale)
      points.push({
        niveau: 'info',
        titre: `Audit énergétique : ${finale.couts_cumules_travaux!.toLocaleString('fr-FR')} € de travaux pour atteindre ${finale.classe_bilan_dpe}`,
        detail: `Audit du ${fmtDate(a.date)}. Détail des scénarios plus bas.`,
      })
  }

  // --- Chauffage
  const energie = dpe.type_energie_principale_chauffage ?? ''
  if (/fioul/i.test(energie))
    points.push({
      niveau: 'alerte',
      titre: 'Chauffage au fioul',
      question:
        'Quel âge a la chaudière ? Quelle est la consommation réelle de fioul par an ? La cuve est-elle enterrée ?',
      detail:
        'Installer une chaudière fioul neuve est interdit depuis 2022 : à remplacer par une autre énergie (pompe à chaleur, bois…). Prévoir aussi la cuve.',
    })
  else if (/gpl|propane|butane|charbon/i.test(energie))
    points.push({
      niveau: 'attention',
      titre: `Chauffage ${energie.toLowerCase()}`,
      detail: 'Énergie chère et carbonée.',
    })
  else if (/gaz/i.test(energie))
    points.push({
      niveau: 'info',
      titre: 'Chauffage au gaz',
      detail: "Prix volatils ; vérifier l'âge de la chaudière.",
      question: 'Quel âge a la chaudière, et quand a-t-elle été entretenue pour la dernière fois ?',
    })

  // --- Isolation
  const parois: [string, string | undefined][] = [
    ['murs', dpe.qualite_isolation_murs],
    ['plancher bas', dpe.qualite_isolation_plancher_bas],
    ['combles perdus', dpe.qualite_isolation_plancher_haut_comble_perdu],
    ['combles aménagés', dpe.qualite_isolation_plancher_haut_comble_amenage],
    ['toit terrasse', dpe.qualite_isolation_plancher_haut_toit_terrasse],
    ['menuiseries', dpe.qualite_isolation_menuiseries],
  ]
  const faibles = parois.filter(([, q]) => q === 'insuffisante').map(([n]) => n)
  if (faibles.length)
    points.push({
      niveau: 'attention',
      titre: `Isolation insuffisante : ${faibles.join(', ')}`,
      question:
        "Des devis d'isolation ont-ils été demandés ? Quand l'isolation a-t-elle été refaite pour la dernière fois ?",
      detail: 'Postes de travaux probables. Voir la répartition des pertes de chaleur plus bas.',
    })
  else if (parois.some(([, q]) => q)) points.push({ niveau: 'ok', titre: 'Aucune paroi jugée insuffisante' })

  if (dpe.indicateur_confort_ete === 'insuffisant')
    points.push({
      niveau: 'attention',
      titre: "Confort d'été insuffisant",
      detail: 'Risque de surchauffe en été.',
      question: 'Quelle température fait-il dans les chambres en été ? Y a-t-il des volets ou une protection solaire ?',
    })

  if (/ouverture des fen/i.test(dpe.type_ventilation ?? ''))
    points.push({
      niveau: 'attention',
      titre: 'Pas de ventilation (aération par les fenêtres)',
      question: "Y a-t-il des traces d'humidité ou de moisissures ? Une VMC est-elle prévue ?",
      detail: "Risque d'humidité et de moisissures, surtout après isolation. Une VMC sera à prévoir.",
    })

  if (dpe.presence_production_pv === 1) points.push({ niveau: 'ok', titre: 'Panneaux photovoltaïques' })

  points.push(...analyserTerritoire(ctx))

  const ordre: Record<Niveau, number> = { alerte: 0, attention: 1, info: 2, ok: 3 }
  return points.sort((a, b) => ordre[a.niveau] - ordre[b.niveau])
}

// Répartition des pertes de chaleur, triée de la plus grosse à la plus petite
export function deperditions(d: DpeDetail): { label: string; value: number; pct: number }[] {
  const items = [
    { label: 'Murs', value: d.deperditions_murs },
    { label: 'Toiture / plafonds', value: d.deperditions_planchers_hauts },
    { label: 'Planchers bas', value: d.deperditions_planchers_bas },
    { label: 'Fenêtres', value: d.deperditions_baies_vitrees },
    { label: 'Portes', value: d.deperditions_portes },
    { label: 'Ponts thermiques', value: d.deperditions_ponts_thermiques },
    { label: "Renouvellement d'air", value: d.deperditions_renouvellement_air },
  ].filter((x): x is { label: string; value: number } => typeof x.value === 'number' && x.value > 0)
  const total = items.reduce((s, x) => s + x.value, 0)
  return items.map((x) => ({ ...x, pct: total ? (x.value / total) * 100 : 0 })).sort((a, b) => b.value - a.value)
}

export function liensExternes(lat: number, lon: number) {
  return [
    {
      label: 'Vue de rue (Panoramax, couverture partielle)',
      url: `https://api.panoramax.xyz/#focus=map&map=19/${lat}/${lon}`,
    },
    {
      label: 'Vue de rue (Google)',
      url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
    },
    {
      label: 'Photo aérienne (Géoportail)',
      url: `https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=19&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`,
    },
    {
      label: 'Comparer avec 1950-1965 (extensions)',
      url: `https://remonterletemps.ign.fr/comparer?lon=${lon}&lat=${lat}&z=18&layer1=ORTHOIMAGERY.ORTHOPHOTOS&layer2=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965&mode=doubleMap`,
    },
  ]
}
