import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Chemins relatifs : le build fonctionne servi depuis n'importe quel dossier
  base: './',
  plugins: [vue()],
})
