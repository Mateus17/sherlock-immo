<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { EVENEMENT_ATTENTE, type DetailAttente } from '../lib/http'

// Bandeau affiché pendant qu'un service limité (ADEME) nous demande d'attendre
const restant = ref(0)
const service = ref('')
let minuterie: ReturnType<typeof setInterval> | undefined

function onAttente(e: Event) {
  const { detail } = e as CustomEvent<DetailAttente>
  service.value = detail.service
  restant.value = detail.secondes
  clearInterval(minuterie)
  minuterie = setInterval(() => {
    restant.value = Math.max(0, restant.value - 1)
    if (!restant.value) clearInterval(minuterie)
  }, 1000)
}

onMounted(() => window.addEventListener(EVENEMENT_ATTENTE, onAttente))
onBeforeUnmount(() => {
  window.removeEventListener(EVENEMENT_ATTENTE, onAttente)
  clearInterval(minuterie)
})
</script>

<template>
  <p v-if="restant" class="attente" role="status">
    {{ service }} est très sollicité : nouvel essai automatique dans {{ restant }} s…
  </p>
</template>

<style scoped>
.attente {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 1300;
  transform: translateX(-50%);
  max-width: calc(100% - 32px);
  margin: 0;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--accent-2);
  box-shadow: var(--shadow);
}
</style>
