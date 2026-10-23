// Leaflet avec l'extension de regroupement des points.
// leaflet.markercluster s'accroche à la variable globale L : on l'expose avant de le charger.
import L from 'leaflet'
;(window as unknown as { L: typeof L }).L = L
await import('leaflet.markercluster')
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'

export default L
