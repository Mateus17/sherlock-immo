<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import {
  getAddressHistory,
  getAudits,
  getDpeDetail,
  getOldDpes,
  observatoireUrl,
  parseGeopoint,
  type Audit,
  type Dpe,
  type DpeDetail,
  type OldDpe,
  type Qualite,
} from '../api/dpe'
import {
  getMarche,
  getParcelle,
  getRisques,
  getUrbanisme,
  prixM2,
  type MarcheLocal,
  type Parcelle,
  type Risques,
  type Urbanisme,
} from '../api/territoire'
import { analyser, deperditions, liensExternes, type Niveau } from '../lib/verification'
import DpeBadge from './DpeBadge.vue'

const props = defineProps<{
  dpe: Dpe
  surfaceAnnonce: number | null
  terrainAnnonce?: number | null
  prixAnnonce?: number | null
}>()
const emit = defineEmits<{ close: []; open: [dpe: Dpe]; parcelle: [geometry: Parcelle['geometry'] | null] }>()

const detail = shallowRef<DpeDetail | null>(null)
const history = shallowRef<Dpe[]>([])
const oldDpes = shallowRef<OldDpe[]>([])
const audits = shallowRef<Audit[]>([])
const loading = ref(false)
const errors = ref<string[]>([])
const surface = ref<number | null>(props.surfaceAnnonce)
const terrain = ref<number | null>(props.terrainAnnonce ?? null)
const prix = ref<number | null>(props.prixAnnonce ?? null)
const parcelle = shallowRef<Parcelle | null>(null)
const marche = shallowRef<MarcheLocal | null>(null)
const risques = shallowRef<Risques | null>(null)
const urbanisme = shallowRef<Urbanisme | null>(null)

const numOrNull = (e: Event) => {
  const v = (e.target as HTMLInputElement).value
  return v === '' ? null : Number(v)
}
let controller: AbortController | null = null

watch(
  () => props.dpe.numero_dpe,
  async () => {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    loading.value = true
    errors.value = []
    detail.value = null
    history.value = []
    oldDpes.value = []
    audits.value = []
    parcelle.value = null
    marche.value = null
    risques.value = null
    urbanisme.value = null
    emit('parcelle', null)

    // Données autour du logement, en parallèle de la fiche ADEME
    const pt = parseGeopoint(props.dpe)
    if (pt) {
      const [lat, lon] = pt
      const typeLocal = props.dpe.type_batiment === 'appartement' ? 'Appartement' : 'Maison'
      getParcelle(lat, lon, signal)
        .then((p) => {
          if (signal.aborted) return
          parcelle.value = p
          emit('parcelle', p?.geometry ?? null)
          return p ? getMarche(p, typeLocal, signal) : null
        })
        .then((m) => {
          if (!signal.aborted && m) marche.value = m
        })
        .catch((e) => {
          if (!signal.aborted) errors.value = [...errors.value, `Cadastre / ventes indisponibles (${(e as Error).message})`]
        })
      getRisques(lat, lon, signal)
        .then((r) => !signal.aborted && (risques.value = r))
        .catch(() => !signal.aborted && (errors.value = [...errors.value, 'Géorisques indisponible']))
      getUrbanisme(lat, lon, signal)
        .then((u) => !signal.aborted && (urbanisme.value = u))
        .catch(() => !signal.aborted && (errors.value = [...errors.value, 'Urbanisme (PLU) indisponible']))
    }

    const ban = props.dpe.identifiant_ban
    // Chaque source est indépendante : une panne n'empêche pas d'afficher le reste
    const [d, h, o, a] = await Promise.allSettled([
      getDpeDetail(props.dpe.numero_dpe, props.dpe._source, signal),
      ban ? getAddressHistory(ban, signal) : Promise.resolve([]),
      getOldDpes(props.dpe, signal),
      ban ? getAudits(ban, signal) : Promise.resolve([]),
    ])
    if (signal.aborted) return
    const errs: string[] = []
    if (d.status === 'fulfilled') detail.value = d.value
    else errs.push('Détail du DPE indisponible')
    if (h.status === 'fulfilled') history.value = h.value
    else errs.push("Historique de l'adresse indisponible")
    if (o.status === 'fulfilled') oldDpes.value = o.value
    else errs.push("DPE d'avant 2021 indisponibles")
    if (a.status === 'fulfilled') audits.value = a.value
    else errs.push('Audits indisponibles')
    errors.value = [...errors.value, ...errs]
    loading.value = false
  },
  { immediate: true },
)

const points = computed(() =>
  detail.value
    ? analyser({
        dpe: detail.value,
        history: history.value,
        oldDpes: oldDpes.value,
        audits: audits.value,
        surfaceAnnonce: surface.value,
        terrainAnnonce: terrain.value,
        prixAnnonce: prix.value,
        parcelle: parcelle.value,
        marche: marche.value,
        risques: risques.value,
        urbanisme: urbanisme.value,
      })
    : [],
)

const pertes = computed(() => (detail.value ? deperditions(detail.value) : []))

const isolation = computed(() => {
  const d = detail.value
  if (!d) return []
  return (
    [
      ['Murs', d.qualite_isolation_murs],
      ['Plancher bas', d.qualite_isolation_plancher_bas],
      ['Combles perdus', d.qualite_isolation_plancher_haut_comble_perdu],
      ['Combles aménagés', d.qualite_isolation_plancher_haut_comble_amenage],
      ['Toit terrasse', d.qualite_isolation_plancher_haut_toit_terrasse],
      ['Fenêtres et portes', d.qualite_isolation_menuiseries],
      ['Ensemble', d.qualite_isolation_enveloppe],
    ] as [string, Qualite | undefined][]
  ).filter(([, q]) => q)
})

const couts = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    ['Chauffage', d.cout_chauffage],
    ['Eau chaude', d.cout_ecs],
    ['Climatisation', d.cout_refroidissement],
    ['Éclairage', d.cout_eclairage],
    ['Auxiliaires', d.cout_auxiliaires],
  ].filter((x): x is [string, number] => typeof x[1] === 'number' && x[1] > 0)
})

// Scénarios d'audit regroupés (une étape, plusieurs étapes…), étapes dans l'ordre
const scenarios = computed(() => {
  const a = audits.value[0]
  if (!a) return []
  const ordre = (e?: string) =>
    e === 'état initial' ? 0 : e === 'étape première' ? 1 : e?.startsWith('étape intermédiaire') ? 2 + Number(e.slice(-1) || 0) : 9
  const groups = new Map<string, typeof a.etapes>()
  for (const e of a.etapes) {
    if (e.etape_travaux === 'état initial') continue
    const k = e.categorie_scenario ?? 'Scénario'
    groups.set(k, [...(groups.get(k) ?? []), e])
  }
  return [...groups.entries()].map(([nom, etapes]) => ({
    nom,
    etapes: etapes.sort((x, y) => ordre(x.etape_travaux) - ordre(y.etape_travaux)),
  }))
})

// Zones voisines qui changent la donne : à urbaniser, agricoles, naturelles
const zonesSensibles = computed(() => urbanisme.value?.voisines.filter((z) => !/^U/i.test(z.typezone)) ?? [])

const liens = computed(() => {
  const pt = parseGeopoint(props.dpe)
  return pt ? liensExternes(pt[0], pt[1]) : []
})

const ICONES: Record<Niveau, string> = { alerte: '⚠', attention: '!', info: 'i', ok: '✓' }

const n = (v?: number, digits = 0) =>
  v == null ? '–' : v.toLocaleString('fr-FR', { maximumFractionDigits: digits })
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('fr-FR') : '–')
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '–')
</script>

<template>
  <aside class="detail">
    <header>
      <div>
        <h2>{{ dpe.adresse_ban ?? 'Adresse inconnue' }}</h2>
        <p class="muted">
          {{ cap(dpe.type_batiment) }}
          <template v-if="dpe.complement_adresse_logement"> · {{ dpe.complement_adresse_logement }}</template>
          · {{ n(dpe.surface_habitable_logement, 1) }} m²
          <template v-if="dpe.annee_construction || dpe.periode_construction">
            · {{ dpe.annee_construction ?? dpe.periode_construction }}
          </template>
        </p>
      </div>
      <button type="button" class="close" aria-label="Fermer la fiche" @click="emit('close')">×</button>
    </header>

    <div class="labels">
      <div>
        <DpeBadge :value="dpe.etiquette_dpe" />
        <span><strong>{{ n(dpe.conso_5_usages_par_m2_ep) }}</strong> kWh/m²/an</span>
      </div>
      <div>
        <DpeBadge :value="dpe.etiquette_ges" />
        <span><strong>{{ n(dpe.emission_ges_5_usages_par_m2) }}</strong> kg CO₂/m²/an</span>
      </div>
      <div>
        <span class="euro">€</span>
        <span><strong>{{ n(dpe.cout_total_5_usages) }}</strong> €/an estimés</span>
      </div>
    </div>

    <p v-if="loading" class="muted">Chargement de la fiche…</p>
    <p v-for="e in errors" :key="e" class="error">{{ e }}</p>

    <section>
      <h3>Comparer avec l'annonce</h3>
      <div class="compare">
        <label>
          <span>Surface</span>
          <input :value="surface ?? ''" type="number" min="0" step="0.1" placeholder="m²" @input="surface = numOrNull($event)" />
        </label>
        <label>
          <span>Terrain</span>
          <input :value="terrain ?? ''" type="number" min="0" placeholder="m²" @input="terrain = numOrNull($event)" />
        </label>
        <label>
          <span>Prix</span>
          <input :value="prix ?? ''" type="number" min="0" step="1000" placeholder="€" @input="prix = numOrNull($event)" />
        </label>
      </div>
    </section>

    <section v-if="points.length">
      <h3>Points d'attention</h3>
      <ul class="points">
        <li v-for="(p, i) in points" :key="i" :class="p.niveau">
          <span class="icon" aria-hidden="true">{{ ICONES[p.niveau] }}</span>
          <div>
            <strong>{{ p.titre }}</strong>
            <p v-if="p.detail">{{ p.detail }}</p>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="pertes.length">
      <h3>Par où part la chaleur</h3>
      <ul class="bars">
        <li v-for="p in pertes" :key="p.label">
          <span class="bar-label">{{ p.label }}</span>
          <span class="bar"><span :style="{ width: `${p.pct}%` }"></span></span>
          <span class="bar-value">{{ p.pct.toFixed(0) }} %</span>
        </li>
      </ul>
    </section>

    <section v-if="isolation.length">
      <h3>Isolation</h3>
      <dl class="grid">
        <template v-for="[label, q] in isolation" :key="label">
          <dt>{{ label }}</dt>
          <dd><span class="quality" :data-q="q">{{ q }}</span></dd>
        </template>
      </dl>
    </section>

    <section v-if="detail">
      <h3>Équipements</h3>
      <dl class="grid">
        <dt>Chauffage</dt>
        <dd>
          {{ detail.type_energie_principale_chauffage ?? '–' }}
          <small v-if="detail.type_generateur_chauffage_principal" class="muted">
            {{ detail.type_generateur_chauffage_principal }}
          </small>
        </dd>
        <dt>Eau chaude</dt>
        <dd>
          {{ detail.type_energie_principale_ecs ?? '–' }}
          <small v-if="detail.type_generateur_chauffage_principal_ecs" class="muted">
            {{ detail.type_generateur_chauffage_principal_ecs }}
          </small>
        </dd>
        <dt>Ventilation</dt>
        <dd>{{ detail.type_ventilation ?? '–' }}</dd>
        <template v-if="detail.type_generateur_froid">
          <dt>Climatisation</dt>
          <dd>{{ detail.type_generateur_froid }}</dd>
        </template>
        <dt>Photovoltaïque</dt>
        <dd>
          {{ detail.presence_production_pv === 1 ? 'Oui' : 'Non' }}
          <small v-if="detail.production_electricite_pv_kwhep_par_an" class="muted">
            {{ n(detail.production_electricite_pv_kwhep_par_an) }} kWhep/an
          </small>
        </dd>
        <dt>Confort d'été</dt>
        <dd>{{ cap(detail.indicateur_confort_ete) }}</dd>
        <template v-if="detail.nombre_niveau_logement">
          <dt>Niveaux</dt>
          <dd>{{ detail.nombre_niveau_logement }}</dd>
        </template>
        <template v-if="detail.hauteur_sous_plafond">
          <dt>Hauteur sous plafond</dt>
          <dd>{{ n(detail.hauteur_sous_plafond, 2) }} m</dd>
        </template>
      </dl>
    </section>

    <section v-if="couts.length">
      <h3>Facture estimée par poste</h3>
      <dl class="grid">
        <template v-for="[label, v] in couts" :key="label">
          <dt>{{ label }}</dt>
          <dd>{{ n(v) }} €/an</dd>
        </template>
      </dl>
      <p class="muted small">Estimation conventionnelle du DPE, pas une facture réelle : demandez les factures du vendeur.</p>
    </section>

    <section v-if="scenarios.length">
      <h3>Audit énergétique : travaux chiffrés</h3>
      <p class="muted small">Audit {{ audits[0].numero }} du {{ fmtDate(audits[0].date) }}.</p>
      <div v-for="s in scenarios" :key="s.nom" class="scenario">
        <h4>{{ cap(s.nom) }}</h4>
        <ol>
          <li v-for="e in s.etapes" :key="e.etape_travaux">
            <div class="step-head">
              <DpeBadge :value="e.classe_bilan_dpe" />
              <strong>{{ cap(e.etape_travaux) }}</strong>
              <span v-if="e.cout_travaux">{{ n(e.cout_travaux) }} €</span>
              <span v-if="e.couts_cumules_travaux && e.couts_cumules_travaux !== e.cout_travaux" class="muted">
                (cumul {{ n(e.couts_cumules_travaux) }} €)
              </span>
            </div>
            <p v-if="e.travaux_realises" class="small">{{ e.travaux_realises }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section v-if="parcelle">
      <h3>Terrain et urbanisme</h3>
      <dl class="grid">
        <dt>Parcelle</dt>
        <dd>{{ parcelle.section }} {{ parcelle.numero }} <small class="muted">{{ parcelle.idu }}</small></dd>
        <dt>Surface cadastrale</dt>
        <dd>{{ n(parcelle.contenance) }} m²</dd>
        <template v-if="urbanisme?.zone">
          <dt>Zone du PLU</dt>
          <dd>
            {{ urbanisme.zone.libelle }}
            <small v-if="urbanisme.zone.libelong" class="muted">{{ urbanisme.zone.libelong }}</small>
            <a v-if="urbanisme.zone.reglement" :href="urbanisme.zone.reglement" target="_blank" rel="noopener" class="small">
              Règlement ↗
            </a>
          </dd>
        </template>
        <template v-if="zonesSensibles.length">
          <dt>À moins de 150 m</dt>
          <dd>
            <span v-for="z in zonesSensibles" :key="z.libelle" class="zone-tag">
              {{ z.libelle }}<small v-if="z.libelong" class="muted"> {{ z.libelong }}</small>
            </span>
          </dd>
        </template>
      </dl>
      <p class="muted small">Contour de la parcelle tracé sur la carte. Un bien peut s'étendre sur plusieurs parcelles.</p>
    </section>

    <section v-if="marche">
      <h3>Ventes passées (DVF)</h3>
      <p v-if="!marche.ventesParcelle.length" class="muted small">Aucune vente de cette parcelle depuis 2021.</p>
      <ul class="sales">
        <li v-for="v in marche.ventesParcelle" :key="v.id">
          <span class="date">{{ fmtDate(v.date) }}</span>
          <strong>{{ v.prix ? `${n(v.prix)} €` : '–' }}</strong>
          <span class="small muted">
            {{ v.type !== 'Autre' ? v.type : 'Lot' }}
            <template v-if="v.surfaceBati"> · {{ n(v.surfaceBati) }} m² bâtis</template>
            <template v-if="v.pieces"> · {{ v.pieces }} p.</template>
            <template v-if="v.terrain"> · terrain {{ n(v.terrain) }} m²</template>
          </span>
        </li>
      </ul>
      <template v-if="marche.medianePrixM2">
        <p class="small">
          Prix médian dans la section cadastrale :
          <strong>{{ n(marche.medianePrixM2) }} €/m²</strong>
          <span class="muted">({{ marche.comparables.length }} ventes, 3 ans)</span>
          <template v-if="prix && dpe.surface_habitable_logement">
            · annonce : <strong>{{ n(prix / dpe.surface_habitable_logement) }} €/m²</strong>
          </template>
        </p>
        <details class="small">
          <summary>Voir les ventes comparables</summary>
          <ul class="sales">
            <li v-for="v in marche.comparables.slice(0, 30)" :key="v.id">
              <span class="date">{{ fmtDate(v.date) }}</span>
              <span>{{ n(v.prix ?? undefined) }} €</span>
              <span class="muted">{{ n(v.surfaceBati ?? undefined) }} m² · {{ n(prixM2(v) ?? undefined) }} €/m² · {{ v.adresse }}</span>
            </li>
          </ul>
        </details>
      </template>
      <p class="muted small">Surfaces « bâties » déclarées aux impôts, souvent proches de la surface habitable.</p>
    </section>

    <section v-if="risques">
      <h3>Risques (Géorisques)</h3>
      <ul class="risks">
        <li v-for="r in risques.risques" :key="r.cle">
          <span>{{ r.libelle }}</span>
          <small class="muted">{{ r.statutAdresse && !/non connu/i.test(r.statutAdresse) ? r.statutAdresse : `Commune : ${r.statutCommune ?? '?'}` }}</small>
        </li>
      </ul>
      <a :href="risques.rapportUrl" target="_blank" rel="noopener" class="small">Rapport complet Géorisques ↗</a>
    </section>

    <section>
      <h3>Historique de l'adresse</h3>
      <p v-if="!history.length && !oldDpes.length && !loading" class="muted small">Aucun autre DPE trouvé.</p>
      <ul class="timeline">
        <li v-for="h in [...history].reverse()" :key="h.numero_dpe" :class="{ current: h.numero_dpe === dpe.numero_dpe }">
          <span class="date">{{ fmtDate(h.date_etablissement_dpe) }}</span>
          <DpeBadge :value="h.etiquette_dpe" />
          <span class="small">
            {{ n(h.conso_5_usages_par_m2_ep) }} kWh · {{ n(h.surface_habitable_logement, 1) }} m²
            <template v-if="h.complement_adresse_logement"> · {{ h.complement_adresse_logement }}</template>
          </span>
          <button v-if="h.numero_dpe !== dpe.numero_dpe" type="button" class="link" @click="emit('open', h)">
            Voir
          </button>
          <span v-else class="muted small">ce DPE</span>
        </li>
        <li v-for="o in [...oldDpes].reverse()" :key="o.numero_dpe" class="old">
          <span class="date">{{ fmtDate(o.date_etablissement_dpe) }}</span>
          <span class="old-badge">{{ o.classe_consommation_energie }}</span>
          <span class="small">
            {{ n(o.consommation_energie) }} kWh · {{ n(o.surface_thermique_lot, 1) }} m²
            <span class="muted">· ancienne méthode</span>
          </span>
        </li>
      </ul>
    </section>

    <section v-if="liens.length">
      <h3>Voir sur place</h3>
      <ul class="links">
        <li v-for="l in liens" :key="l.url">
          <a :href="l.url" target="_blank" rel="noopener">{{ l.label }} ↗</a>
        </li>
        <li>
          <a :href="observatoireUrl(dpe.numero_dpe)" target="_blank" rel="noopener">DPE complet (ADEME) ↗</a>
        </li>
      </ul>
    </section>

    <section v-if="detail">
      <h3>Le DPE</h3>
      <dl class="grid">
        <dt>Numéro</dt>
        <dd>{{ detail.numero_dpe }}</dd>
        <dt>Établi le</dt>
        <dd>{{ fmtDate(detail.date_etablissement_dpe) }}</dd>
        <dt>Visite</dt>
        <dd>{{ fmtDate(detail.date_visite_diagnostiqueur) }}</dd>
        <dt>Valide jusqu'au</dt>
        <dd>{{ fmtDate(detail.date_fin_validite_dpe) }}</dd>
        <dt>Méthode</dt>
        <dd>{{ cap(detail.methode_application_dpe) }}</dd>
        <template v-if="detail.numero_dpe_remplace">
          <dt>Remplace</dt>
          <dd>
            <a :href="observatoireUrl(detail.numero_dpe_remplace)" target="_blank" rel="noopener">
              {{ detail.numero_dpe_remplace }} ↗
            </a>
          </dd>
        </template>
      </dl>
    </section>
  </aside>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 18px 24px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 0.92em;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
h2 {
  margin: 0;
  font-size: 1.15em;
}
header p {
  margin: 4px 0 0;
}
.close {
  border: 0;
  background: none;
  font-size: 1.6em;
  line-height: 1;
  padding: 0 4px;
}
h3 {
  margin: 0 0 8px;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
h4 {
  margin: 8px 0 4px;
  font-size: 0.95em;
}
section p {
  margin: 0;
}
.small {
  font-size: 0.88em;
}
.error {
  margin: 0;
  color: #c62828;
}
.labels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.labels > div {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9em;
  line-height: 1.25;
}
.euro {
  display: inline-grid;
  place-items: center;
  width: 1.6em;
  height: 1.6em;
  flex: none;
  border-radius: 4px;
  background: var(--border);
  font-weight: 700;
}
.compare {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.compare label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9em;
}
.compare input {
  width: 100%;
  min-width: 0;
}
.sales,
.risks {
  list-style: none;
  margin: 0 0 6px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sales li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.sales .date {
  min-width: 78px;
  font-variant-numeric: tabular-nums;
}
.risks li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.zone-tag {
  display: block;
}
details summary {
  cursor: pointer;
  margin: 4px 0;
}
.points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.points li {
  --c: #6b7280;
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border-left: 3px solid var(--c);
  border-radius: 6px;
  background: color-mix(in srgb, var(--c) 9%, transparent);
}
.points li.alerte {
  --c: #d7221f;
}
.points li.attention {
  --c: #f0b40f;
}
.points li.info {
  --c: var(--accent);
}
.points li.ok {
  --c: #2e9d5b;
}
.points .icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 1.4em;
  height: 1.4em;
  border-radius: 50%;
  background: var(--c);
  color: #fff;
  font-size: 0.8em;
  font-weight: 700;
}
.points p {
  margin-top: 2px;
  color: var(--muted);
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bars li {
  display: grid;
  grid-template-columns: 130px 1fr 40px;
  align-items: center;
  gap: 8px;
}
.bar {
  height: 10px;
  border-radius: 5px;
  background: var(--border);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: #eb8235;
  border-radius: 5px;
}
.bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  margin: 0;
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
}
dd small {
  display: block;
}
.quality {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.9em;
  background: var(--border);
}
.quality[data-q='insuffisante'] {
  background: color-mix(in srgb, #d7221f 22%, transparent);
}
.quality[data-q='moyenne'] {
  background: color-mix(in srgb, #f0b40f 25%, transparent);
}
.quality[data-q='bonne'],
.quality[data-q='très bonne'] {
  background: color-mix(in srgb, #2e9d5b 22%, transparent);
}
.scenario ol {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.timeline li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
}
.timeline li.current {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.timeline .date {
  min-width: 78px;
  font-variant-numeric: tabular-nums;
}
.timeline .small {
  flex: 1;
}
.old-badge {
  display: inline-block;
  width: 1.6em;
  line-height: 1.6em;
  text-align: center;
  border-radius: 4px;
  border: 1px dashed var(--muted);
  font-weight: 700;
}
.link {
  border: 0;
  background: none;
  color: var(--accent);
  padding: 0;
  text-decoration: underline;
}
.links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
