/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Adresse du dépôt GitHub, injectée par le workflow de déploiement
  readonly VITE_REPO_URL?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
