import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// Politique de sécurité du contenu : la page ne peut appeler que les services publics
// utilisés (voir docs/ARCHITECTURE.md). Ajoutée au build seulement : en développement,
// elle bloquerait le rechargement à chaud de Vite.
const API = [
  'https://data.ademe.fr',
  'https://geo.api.gouv.fr',
  'https://apicarto.ign.fr',
  'https://georisques.gouv.fr',
  'https://www.georisques.gouv.fr',
  'https://app.dvf.etalab.gouv.fr',
]
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Leaflet et les liaisons :style de Vue posent des styles en ligne
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://data.geopf.fr",
  `connect-src 'self' ${API.join(' ')}`,
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function securite(): Plugin {
  return {
    name: 'sherlock-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  }
}

export default defineConfig({
  // Chemins relatifs : le build fonctionne servi depuis n'importe quel dossier
  base: './',
  plugins: [vue(), securite()],
})
