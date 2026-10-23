<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { getDpeDetail, type DpeDetail } from '../api/dpe'
import { useFavoris } from '../composables/useFavoris'
import { majuscule, nombre } from '../lib/format'
import DpeBadge from './DpeBadge.vue'

const props = defineProps<{ numeros: string[] }>()
const emit = defineEmits<{ fermer: [] }>()

const { favoris } = useFavoris()
const details = shallowRef<Record<string, DpeDetail | null>>({})

// Détail complet de chaque logement (isolation, chauffage…), mis en cache par le module réseau
watch(
  () => [...props.numeros],
  async (numeros) => {
    const res = await Promise.all(numeros.map((n) => getDpeDetail(n, favoris[n]?.dpe._source).catch(() => null)))
    details.value = Object.fromEntries(numeros.map((n, i) => [n, res[i]]))
  },
  { immediate: true },
)

const colonnes = computed(() =>
  props.numeros
    .map((n) => favoris[n])
    .filter(Boolean)
    .map((f) => {
      const d = details.value[f.dpe.numero_dpe]
      const s = f.dpe.surface_habitable_logement
      return { f, d, prixM2: f.prix && s ? f.prix / s : null }
    }),
)

const incomplet = computed(() => props.numeros.some((n) => n in details.value && details.value[n] === null))

// Pour chaque ligne chiffrée, on repère la meilleure valeur
const meilleur = (valeurs: (number | null | undefined)[], plusPetit = true) => {
  const v = valeurs.filter((x): x is number => typeof x === 'number')
  if (v.length < 2) return null
  return plusPetit ? Math.min(...v) : Math.max(...v)
}
const best = computed(() => ({
  conso: meilleur(colonnes.value.map((c) => c.f.dpe.conso_5_usages_par_m2_ep)),
  ges: meilleur(colonnes.value.map((c) => c.f.dpe.emission_ges_5_usages_par_m2)),
  cout: meilleur(colonnes.value.map((c) => c.f.dpe.cout_total_5_usages)),
  surface: meilleur(
    colonnes.value.map((c) => c.f.dpe.surface_habitable_logement),
    false,
  ),
  prixM2: meilleur(colonnes.value.map((c) => c.prixM2)),
}))
</script>

<template>
  <section class="comparateur" aria-labelledby="titre-comparateur">
    <div class="tete">
      <h2 id="titre-comparateur">Comparaison</h2>
      <button type="button" aria-label="Fermer la comparaison" @click="emit('fermer')">×</button>
    </div>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Critère</span></th>
            <th v-for="c in colonnes" :key="c.f.dpe.numero_dpe" scope="col">
              {{ c.f.dpe.adresse_ban ?? 'Adresse inconnue' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Étiquettes</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">
              <DpeBadge :value="c.f.dpe.etiquette_dpe" /> <DpeBadge :value="c.f.dpe.etiquette_ges" />
            </td>
          </tr>
          <tr>
            <th scope="row">Consommation</th>
            <td
              v-for="c in colonnes"
              :key="c.f.dpe.numero_dpe"
              :class="{ best: c.f.dpe.conso_5_usages_par_m2_ep === best.conso }"
            >
              {{ nombre(c.f.dpe.conso_5_usages_par_m2_ep) }} kWh/m²/an
            </td>
          </tr>
          <tr>
            <th scope="row">Émissions</th>
            <td
              v-for="c in colonnes"
              :key="c.f.dpe.numero_dpe"
              :class="{ best: c.f.dpe.emission_ges_5_usages_par_m2 === best.ges }"
            >
              {{ nombre(c.f.dpe.emission_ges_5_usages_par_m2) }} kg CO₂/m²/an
            </td>
          </tr>
          <tr>
            <th scope="row">Facture estimée</th>
            <td
              v-for="c in colonnes"
              :key="c.f.dpe.numero_dpe"
              :class="{ best: c.f.dpe.cout_total_5_usages === best.cout }"
            >
              {{ nombre(c.f.dpe.cout_total_5_usages) }} €/an
            </td>
          </tr>
          <tr>
            <th scope="row">Surface</th>
            <td
              v-for="c in colonnes"
              :key="c.f.dpe.numero_dpe"
              :class="{ best: c.f.dpe.surface_habitable_logement === best.surface }"
            >
              {{ nombre(c.f.dpe.surface_habitable_logement, 1) }} m²
            </td>
          </tr>
          <tr>
            <th scope="row">Construction</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">
              {{ c.f.dpe.annee_construction ?? c.f.dpe.periode_construction ?? '–' }}
            </td>
          </tr>
          <tr>
            <th scope="row">Chauffage</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">
              {{ c.d?.type_energie_principale_chauffage ?? c.f.dpe.type_energie_principale_chauffage ?? '–' }}
              <small v-if="c.d?.type_generateur_chauffage_principal" class="muted">{{
                c.d.type_generateur_chauffage_principal
              }}</small>
            </td>
          </tr>
          <tr>
            <th scope="row">Isolation (ensemble)</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">{{ majuscule(c.d?.qualite_isolation_enveloppe) }}</td>
          </tr>
          <tr>
            <th scope="row">Ventilation</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">{{ c.d?.type_ventilation ?? '–' }}</td>
          </tr>
          <tr>
            <th scope="row">Confort d'été</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">{{ majuscule(c.d?.indicateur_confort_ete) }}</td>
          </tr>
          <tr>
            <th scope="row">Prix de l'annonce</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe">{{ c.f.prix ? `${nombre(c.f.prix)} €` : '–' }}</td>
          </tr>
          <tr>
            <th scope="row">Prix au m²</th>
            <td
              v-for="c in colonnes"
              :key="c.f.dpe.numero_dpe"
              :class="{ best: c.prixM2 != null && c.prixM2 === best.prixM2 }"
            >
              {{ c.prixM2 ? `${nombre(c.prixM2)} €/m²` : '–' }}
            </td>
          </tr>
          <tr>
            <th scope="row">Notes</th>
            <td v-for="c in colonnes" :key="c.f.dpe.numero_dpe" class="note">{{ c.f.note || '–' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="incomplet" class="small" role="status">
      Certains détails (isolation, ventilation, confort d'été) n'ont pas pu être chargés. L'API de l'ADEME limite le
      nombre de demandes : réessayez dans une minute.
    </p>
    <p class="muted small">En vert, la meilleure valeur de chaque ligne chiffrée.</p>
  </section>
</template>

<style scoped>
.comparateur {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--accent);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.tete {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tete button {
  border: 0;
  background: none;
  font-size: 1.5em;
  line-height: 1;
}
h2 {
  margin: 0 0 12px;
  font-size: 1.2em;
}
.scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;
}
th,
td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
thead th {
  min-width: 180px;
}
tbody th {
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}
td small {
  display: block;
}
td.best {
  background: color-mix(in srgb, #2e9d5b 16%, transparent);
  font-weight: 600;
}
.note {
  white-space: pre-wrap;
}
.small {
  margin: 8px 0 0;
  font-size: 0.85em;
}
</style>
