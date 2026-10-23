<script setup lang="ts">
import { computed } from 'vue'
import type { Point } from '../../lib/verification'

const props = defineProps<{ points: Point[] }>()

// Questions générées par les points d'attention, plus les incontournables d'une visite
const GENERALES = [
  'Pourquoi vendez-vous, et depuis quand le bien est-il en vente ?',
  'Quels travaux ont été faits ces dix dernières années (factures, garanties décennales) ?',
  'Quel est le montant de la taxe foncière et des factures d’énergie de l’an dernier ?',
]
const questions = computed(() => [
  ...new Set([...props.points.map((p) => p.question).filter((q): q is string => !!q), ...GENERALES]),
])
</script>

<template>
  <section aria-labelledby="titre-questions">
    <h3 id="titre-questions">Questions à poser lors de la visite</h3>
    <ol class="questions">
      <li v-for="q in questions" :key="q">{{ q }}</li>
    </ol>
  </section>
</template>
