<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from '../lib/leaflet'
import { DPE_COLORS, observatoireUrl, parseGeopoint, type Dpe, type Etiquette } from '../api/dpe'
import type { Commune } from '../api/geo'

const props = defineProps<{
  results: Dpe[]
  communes: Commune[]
  rayonKm: number | null
  selectedId: string | null
  parcelle?: object | null // GeoJSON du contour cadastral
}>()
const emit = defineEmits<{ select: [id: string] }>()

const el = ref<HTMLElement>()
let map: L.Map
let resizeObserver: ResizeObserver | undefined
// Points regroupés tant qu'on n'est pas assez zoomé pour les distinguer
const markersLayer = L.markerClusterGroup({
  chunkedLoading: true,
  showCoverageOnHover: false,
  disableClusteringAtZoom: 16,
  maxClusterRadius: 45,
  iconCreateFunction: (cluster) => {
    const n = cluster.getChildCount()
    const taille = n < 10 ? 32 : n < 100 ? 38 : 46
    return L.divIcon({
      html: `<span>${n}</span>`,
      className: 'groupe-dpe',
      iconSize: [taille, taille],
    })
  },
})
const zonesLayer = L.layerGroup()
const parcelleLayer = L.layerGroup()
const markers = new Map<string, L.CircleMarker>()

// Plan IGN via la Géoplateforme : open data, sans clé ni quota
const PLAN_IGN =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png' +
  '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
const ORTHO =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg' +
  '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

// Routes avec leur nom, et noms de lieux : transparents, pour la photo aérienne (zoom 6 à 18)
const surcouche = (couche: string) =>
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  `&LAYER=${couche}&STYLE=normal&FORMAT=image/png` +
  '&TILEMATRIXSET=PM_6_18&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

// Même seuil que la mise en page téléphone (App.vue)
const petitEcran = matchMedia('(max-width: 860px)')

const CLE_FOND = 'sherlock-immo:fond-carte'
const CLE_RUES = 'sherlock-immo:noms-rues'

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null // stockage indisponible : réglages par défaut
  }
}
function ecrire(cle: string, v: string) {
  try {
    localStorage.setItem(cle, v)
  } catch {
    // stockage indisponible : le choix vaut pour cette carte seulement
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

// Bulle d'un point : étiquette en grand, adresse, chiffres clés et liens
function popupHtml(d: Dpe) {
  const pt = parseGeopoint(d)
  // « 12 Rue X 35000 Rennes » → rue / « 35000 Rennes »
  const adresse = d.adresse_ban ?? 'Adresse inconnue'
  const m = adresse.match(/^(.*?)\s+(\d{5}\s.*)$/)
  const [rue, ville] = m ? [m[1], m[2]] : [adresse, '']
  const etiquette = (e: Etiquette | undefined, nom: string) =>
    e ? `<span class="pop-etiq" style="background:${DPE_COLORS[e]}" title="${nom} ${e}">${e}</span>` : ''
  const chips = [
    d.surface_habitable_logement != null ? `${d.surface_habitable_logement.toLocaleString('fr-FR')} m²` : '',
    d.conso_5_usages_par_m2_ep != null ? `${Math.round(d.conso_5_usages_par_m2_ep)} kWh/m²/an` : '',
    d.etiquette_ges ? `GES ${d.etiquette_ges}` : '',
    d.annee_construction ? `${d.annee_construction}` : (d.periode_construction ?? ''),
  ].filter(Boolean)
  const date = d.date_etablissement_dpe ? new Date(d.date_etablissement_dpe).toLocaleDateString('fr-FR') : null
  const genre = [d.type_batiment, d._source === 'neuf' ? 'neuf' : ''].filter(Boolean).join(' · ')
  return `
    <div class="pop">
      <div class="pop-tete">
        ${etiquette(d.etiquette_dpe, 'DPE') || '<span class="pop-etiq pop-vide">?</span>'}
        <div class="pop-adresse">
          <strong>${escapeHtml(rue)}</strong>
          ${ville ? `<span>${escapeHtml(ville)}</span>` : ''}
          ${d.complement_adresse_logement ? `<small>${escapeHtml(d.complement_adresse_logement)}</small>` : ''}
        </div>
      </div>
      ${chips.length ? `<div class="pop-chips">${chips.map((c) => `<span>${escapeHtml(c)}</span>`).join('')}</div>` : ''}
      <div class="pop-meta">${escapeHtml(genre)}${date ? ` · DPE du ${date}` : ''}</div>
      <button type="button" class="pop-fiche">Ouvrir la fiche</button>
      <div class="pop-liens">
        <a href="${observatoireUrl(d.numero_dpe)}" target="_blank" rel="noopener">Fiche DPE ↗</a>
        ${
          // Point exact de l'adresse (coordonnées BAN), plus fiable qu'une recherche par texte
          pt
            ? `<a href="https://www.google.com/maps/search/?api=1&amp;query=${pt[0]},${pt[1]}" target="_blank" rel="noopener">Google Maps ↗</a>`
            : ''
        }
      </div>
    </div>`
}

function renderMarkers() {
  markersLayer.clearLayers()
  markers.clear()
  for (const d of props.results) {
    const pt = parseGeopoint(d)
    if (!pt) continue
    const color = d.etiquette_dpe ? DPE_COLORS[d.etiquette_dpe] : '#888'
    const m = L.circleMarker(pt, { radius: 7, color: '#222', weight: 1, fillColor: color, fillOpacity: 0.9 })
      .bindPopup(popupHtml(d), {
        className: 'popup-dpe',
        minWidth: 240,
        maxWidth: 300,
        autoPanPaddingTopLeft: [48, 10],
      })
      // Sur ordinateur, la fiche s'ouvre à côté de la bulle. Sur téléphone, elle couvrirait
      // l'écran : la bulle s'affiche seule, et son bouton « Ouvrir la fiche » prend le relais.
      .on('click', () => {
        if (!petitEcran.matches) emit('select', d.numero_dpe)
      })
      .on('popupopen', (e) => {
        e.popup
          .getElement()
          ?.querySelector('.pop-fiche')
          ?.addEventListener('click', () => emit('select', d.numero_dpe))
      })
    m.addTo(markersLayer)
    markers.set(d.numero_dpe, m)
  }
}

function renderZones() {
  zonesLayer.clearLayers()
  if (!props.rayonKm) return
  for (const c of props.communes) {
    L.circle([c.lat, c.lon], {
      radius: props.rayonKm * 1000,
      color: '#3b6fd8',
      weight: 1,
      dashArray: '4 4',
      fill: false,
      interactive: false,
    }).addTo(zonesLayer)
  }
}

function fit() {
  const pts = [...markers.values()].map((m) => m.getLatLng())
  if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 16 })
  else if (props.communes.length)
    map.fitBounds(L.latLngBounds(props.communes.map((c) => [c.lat, c.lon])), { maxZoom: 12 })
}

onMounted(() => {
  map = L.map(el.value!, { preferCanvas: true }).setView([46.6, 2.5], 6)
  const fonds = {
    'Photo aérienne': L.tileLayer(ORTHO, { maxZoom: 19, attribution: '© IGN Géoplateforme' }),
    'Plan IGN': L.tileLayer(PLAN_IGN, { maxZoom: 19, attribution: '© IGN Géoplateforme' }),
  }
  // Photo aérienne par défaut (on y reconnaît la maison) ; le dernier fond choisi est retenu
  const memo = lire(CLE_FOND)
  const choisi = memo && memo in fonds ? (memo as keyof typeof fonds) : 'Photo aérienne'
  fonds[choisi].addTo(map)
  // Au-dessus du fond quel qu'il soit (zIndex), affichés par défaut
  const options = { minZoom: 6, maxNativeZoom: 18, maxZoom: 19, zIndex: 10 }
  const rues = L.layerGroup([
    L.tileLayer(surcouche('TRANSPORTNETWORKS.ROADS'), { ...options, opacity: 0.8 }),
    L.tileLayer(surcouche('GEOGRAPHICALNAMES.NAMES'), options),
  ])
  if (lire(CLE_RUES) !== '0') rues.addTo(map)
  L.control.layers(fonds, { 'Noms des rues': rues }).addTo(map)
  map.on('baselayerchange', (e) => ecrire(CLE_FOND, e.name))
  map.on('popupopen', () => el.value?.classList.add('bulle-ouverte'))
  map.on('popupclose', () => el.value?.classList.remove('bulle-ouverte'))
  map.on('overlayadd', (e) => e.layer === rues && ecrire(CLE_RUES, '1'))
  map.on('overlayremove', (e) => e.layer === rues && ecrire(CLE_RUES, '0'))
  // Le conteneur change de taille (grille, tableau qui apparaît) : Leaflet doit recalculer
  resizeObserver = new ResizeObserver(() => map.invalidateSize())
  resizeObserver.observe(el.value!)
  zonesLayer.addTo(map)
  parcelleLayer.addTo(map)
  markersLayer.addTo(map)
  renderZones()
  renderMarkers()
  fit()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
})

watch(
  () => props.results,
  (next, prev) => {
    renderMarkers()
    // Pas de recentrage lors d'un « Charger plus »
    if (!prev || !prev.length || next[0]?.numero_dpe !== prev[0]?.numero_dpe) fit()
  },
)
watch(() => [props.communes, props.rayonKm], renderZones)
watch(
  () => props.parcelle,
  (geom) => {
    parcelleLayer.clearLayers()
    if (!geom) return
    L.geoJSON(geom as GeoJSON.GeoJsonObject, {
      style: { color: '#e5398f', weight: 3, fillOpacity: 0.12, dashArray: '6 4' },
      interactive: false,
    }).addTo(parcelleLayer)
  },
)
watch(
  () => props.selectedId,
  (id) => {
    const m = id ? markers.get(id) : undefined
    if (!m) return
    // Le point peut être caché dans un groupe : on zoome jusqu'à lui
    markersLayer.zoomToShowLayer(m, () => {
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 16))
      m.openPopup()
    })
  },
)
</script>

<template>
  <div
    ref="el"
    class="map"
    role="region"
    aria-label="Carte des résultats (la liste ci-dessous donne les mêmes logements au clavier)"
  ></div>
</template>

<style>
/* Groupes de points (non scopé : Leaflet crée ces éléments hors du composant) */
.groupe-dpe {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-strong) 85%, transparent);
  border: 3px solid color-mix(in srgb, #fff 70%, transparent);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
  color: #fff;
  font-weight: 700;
  font-size: 0.85em;
}
</style>

<style scoped>
.map {
  height: 100%;
  min-height: 300px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
</style>
