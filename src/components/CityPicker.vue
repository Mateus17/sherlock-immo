<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { communeQueryKey, parseCommuneQuery, searchCommunes, type Commune } from '../api/geo'

const selected = defineModel<Commune[]>({ required: true })

const query = ref('')
const suggestions = ref<Commune[]>([])
const open = ref(false)
const highlighted = ref(0)
const focused = ref(false)
// Rappel discret de l'astuce département quand la saisie est un nom seul
const hint = computed(() =>
  focused.value && query.value.trim().length >= 2 && !/\s\d/.test(query.value)
    ? 'Astuce : ajoutez le n° de département, ex. « Saint-Martin 35 »'
    : '',
)
let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let lastKey = ''

// Attente après la dernière frappe avant d'appeler l'API
const DEBOUNCE_MS = 350

watch(query, (q) => {
  clearTimeout(timer)
  const parsed = parseCommuneQuery(q)
  const key = communeQueryKey(parsed)
  // « saint-martin 3 » donne la même requête que « saint-martin » : rien à refaire
  if (key === lastKey) {
    open.value = focused.value && q.trim().length >= 2
    return
  }
  timer = setTimeout(async () => {
    controller?.abort()
    controller = new AbortController()
    try {
      const found = await searchCommunes(parsed, controller.signal)
      lastKey = key
      suggestions.value = found.filter((c) => !selected.value.some((s) => s.code === c.code))
      highlighted.value = 0
      open.value = focused.value && q.trim().length >= 2
    } catch (e) {
      if ((e as Error).name !== 'AbortError') suggestions.value = []
    }
  }, DEBOUNCE_MS)
})

function add(c: Commune) {
  selected.value = [...selected.value, c]
  query.value = ''
  suggestions.value = []
  lastKey = ''
  open.value = false
}

function remove(code: string) {
  selected.value = selected.value.filter((c) => c.code !== code)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    highlighted.value = Math.min(highlighted.value + 1, suggestions.value.length - 1)
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    highlighted.value = Math.max(highlighted.value - 1, 0)
    e.preventDefault()
  } else if (e.key === 'Enter' && open.value && suggestions.value[highlighted.value]) {
    add(suggestions.value[highlighted.value])
    e.preventDefault()
  } else if (e.key === 'Backspace' && !query.value && selected.value.length) {
    selected.value = selected.value.slice(0, -1)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="picker">
    <div class="field">
      <span v-for="c in selected" :key="c.code" class="chip">
        {{ c.nom }} <small>({{ c.departement }})</small>
        <button type="button" :aria-label="`Retirer ${c.nom}`" @click="remove(c.code)">×</button>
      </span>
      <input
        v-model="query"
        type="text"
        role="combobox"
        aria-label="Commune"
        aria-autocomplete="list"
        aria-controls="liste-communes"
        :aria-expanded="open"
        :aria-activedescendant="open && suggestions[highlighted] ? `commune-${suggestions[highlighted].code}` : undefined"
        placeholder="Ville, ville + n° dépt, code postal…"
        autocomplete="off"
        @keydown="onKeydown"
        @focus="(focused = true), (open = suggestions.length > 0)"
        @blur="(focused = false), (open = false)"
      />
    </div>
    <ul v-if="open" id="liste-communes" class="suggestions" role="listbox" aria-label="Communes proposées">
      <li
        v-for="(c, i) in suggestions"
        :id="`commune-${c.code}`"
        :key="c.code"
        role="option"
        :aria-selected="i === highlighted"
        :class="{ active: i === highlighted }"
        @mousedown.prevent="add(c)"
        @mouseenter="highlighted = i"
      >
        <strong>{{ c.nom }}</strong>
        <span>{{ c.codesPostaux.slice(0, 3).join(', ') }} · {{ c.departement }}</span>
      </li>
      <li v-if="!suggestions.length" class="hint muted" role="presentation" @mousedown.prevent>
        Aucune commune trouvée{{ parseCommuneQuery(query).dep ? ` dans le département « ${parseCommuneQuery(query).dep} »` : '' }}
      </li>
      <li v-if="hint" class="hint muted" role="presentation" @mousedown.prevent>{{ hint }}</li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
}
.field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}
.field:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}
.field input {
  flex: 1;
  min-width: 140px;
  border: 0;
  outline: 0;
  padding: 4px;
  background: transparent;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  font-size: 0.9em;
}
.chip small {
  color: var(--muted);
}
.chip button {
  border: 0;
  background: none;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0 4px;
  color: inherit;
}
.suggestions {
  position: absolute;
  z-index: 1000;
  left: 0;
  right: 0;
  margin: 4px 0 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}
.suggestions li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.suggestions li span {
  color: var(--muted);
  font-size: 0.85em;
}
.suggestions li.hint {
  display: block;
  margin-top: 4px;
  border-top: 1px solid var(--border);
  border-radius: 0;
  font-size: 0.8em;
  cursor: default;
}
.suggestions li.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
</style>
