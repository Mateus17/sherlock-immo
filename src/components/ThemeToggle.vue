<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sherlock-immo:theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

// Sans choix enregistré, on suit le système (y compris s'il change en cours de route)
const explicit = ref<Theme | null>(saved())
const system = ref<Theme>(media.matches ? 'dark' : 'light')
const onSystemChange = (e: MediaQueryListEvent) => (system.value = e.matches ? 'dark' : 'light')
media.addEventListener('change', onSystemChange)
onBeforeUnmount(() => media.removeEventListener('change', onSystemChange))

const current = ref<Theme>(explicit.value ?? system.value)
watch([explicit, system], () => (current.value = explicit.value ?? system.value))

watch(
  explicit,
  (t) => {
    if (t) document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
  },
  { immediate: true },
)

function toggle() {
  explicit.value = current.value === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(STORAGE_KEY, explicit.value)
  } catch {
    // stockage indisponible : le choix vaut pour la session
  }
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :title="current === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
    :aria-label="current === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
    @click="toggle"
  >
    <!-- Soleil en mode sombre (pour revenir au clair), lune en mode clair -->
    <svg v-if="current === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 1100;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
}
.theme-toggle:hover {
  border-color: var(--accent);
}
svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
