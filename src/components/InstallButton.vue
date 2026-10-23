<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Chrome / Edge / Android : le navigateur propose l'installation via cet événement
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferred = ref<BeforeInstallPromptEvent | null>(null)
const showIosHelp = ref(false)

const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
// iOS n'a pas d'invite d'installation : il faut passer par le menu Partager de Safari
const isIos =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const installed = ref(standalone)

function onPrompt(e: Event) {
  e.preventDefault()
  deferred.value = e as BeforeInstallPromptEvent
}
function onInstalled() {
  installed.value = true
  deferred.value = null
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
  window.removeEventListener('appinstalled', onInstalled)
})

async function install() {
  if (deferred.value) {
    await deferred.value.prompt()
    const { outcome } = await deferred.value.userChoice
    if (outcome === 'accepted') installed.value = true
    deferred.value = null
  } else if (isIos) {
    showIosHelp.value = !showIosHelp.value
  }
}
</script>

<template>
  <div v-if="!installed && (deferred || isIos)" class="install">
    <button type="button" class="install-btn" @click="install">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>
      Installer l'application
    </button>
    <p v-if="showIosHelp" class="ios-help">
      Dans Safari, touchez
      <svg viewBox="0 0 24 24" aria-label="Partager"><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5v10h14V11h-1" /></svg>
      <strong>Partager</strong>, puis <strong>« Sur l'écran d'accueil »</strong>.
    </p>
  </div>
</template>

<style scoped>
.install {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.install-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -3px;
}
.ios-help {
  margin: 0;
  max-width: 320px;
  font-size: 0.9em;
  text-align: center;
  color: var(--muted);
}
</style>
