<script setup lang="ts">
import { ref } from 'vue'
import { lireAnnonce, type IndicesAnnonce } from '../lib/annonce'

defineProps<{ bilan: string[] | null }>()
const emit = defineEmits<{ indices: [indices: IndicesAnnonce] }>()

const open = ref(false)
const texte = ref('')
const vide = ref(false)

function analyser() {
  const indices = lireAnnonce(texte.value)
  vide.value = Object.keys(indices).length === 0
  if (!vide.value) emit('indices', indices)
}
</script>

<template>
  <section class="paste" :class="{ open }">
    <button v-if="!open" type="button" class="toggle" @click="open = true">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="3" width="8" height="4" rx="1" />
        <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      </svg>
      Coller une annonce pour remplir les critères
    </button>
    <template v-else>
      <label for="annonce">Collez le texte de l'annonce (titre, description, encadré énergie…)</label>
      <textarea
        id="annonce"
        v-model="texte"
        rows="5"
        placeholder="Maison 5 pièces 96 m² - Plouzané (29)… DPE : C - 142 kWh/m².an | GES : D - 31 kg CO2/m².an…"
      ></textarea>
      <div class="actions">
        <button type="button" class="primary" :disabled="!texte.trim()" @click="analyser">Remplir les critères</button>
        <button type="button" @click="(open = false), (texte = ''), (vide = false)">Fermer</button>
      </div>
      <p v-if="vide" class="muted small">Aucun indice reconnu. Vérifiez que le texte contient la surface ou l'encadré énergie.</p>
      <p v-else-if="bilan?.length" class="ok small">✓ Rempli : {{ bilan.join(', ') }}. Vérifiez puis lancez la recherche.</p>
      <p class="muted small">Le texte est analysé dans votre navigateur, il n'est envoyé nulle part.</p>
    </template>
  </section>
</template>

<style scoped>
.paste {
  width: 100%;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-style: dashed;
}
.paste.open {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: left;
}
label {
  font-weight: 600;
}
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: inherit;
  font: inherit;
  resize: vertical;
}
.actions {
  display: flex;
  gap: 8px;
}
.small {
  margin: 0;
  font-size: 0.88em;
}
.ok {
  margin: 0;
  color: #2e9d5b;
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
