<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DPE_COLORS, observatoireUrl, parseGeopoint, type Dpe } from '../api/dpe'
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
const markersLayer = L.layerGroup()
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function popupHtml(d: Dpe) {
  const lines = [
    `<strong>${escapeHtml(d.adresse_ban ?? 'Adresse inconnue')}</strong>`,
    d.complement_adresse_logement ? escapeHtml(d.complement_adresse_logement) : '',
    `DPE <b>${d.etiquette_dpe ?? '–'}</b> · GES <b>${d.etiquette_ges ?? '–'}</b> · ${d.surface_habitable_logement ?? '?'} m²`,
    `${d.type_batiment ?? ''} ${d.annee_construction ? `· ${d.annee_construction}` : ''}`,
    `<a href="${observatoireUrl(d.numero_dpe)}" target="_blank" rel="noopener">Voir le DPE ↗</a>`,
  ]
  return lines.filter(Boolean).join('<br>')
}

function renderMarkers() {
  markersLayer.clearLayers()
  markers.clear()
  for (const d of props.results) {
    const pt = parseGeopoint(d)
    if (!pt) continue
    const color = d.etiquette_dpe ? DPE_COLORS[d.etiquette_dpe] : '#888'
    const m = L.circleMarker(pt, { radius: 7, color: '#222', weight: 1, fillColor: color, fillOpacity: 0.9 })
      .bindPopup(popupHtml(d))
      .on('click', () => emit('select', d.numero_dpe))
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
  const plan = L.tileLayer(PLAN_IGN, { maxZoom: 19, attribution: '© IGN Géoplateforme' }).addTo(map)
  const ortho = L.tileLayer(ORTHO, { maxZoom: 19, attribution: '© IGN Géoplateforme' })
  L.control.layers({ 'Plan IGN': plan, 'Photo aérienne': ortho }).addTo(map)
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
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 16))
    m.openPopup()
  },
)
</script>

<template>
  <div ref="el" class="map"></div>
</template>

<style scoped>
.map {
  height: 100%;
  min-height: 300px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
</style>
