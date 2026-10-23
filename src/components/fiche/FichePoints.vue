<script setup lang="ts">
import type { Niveau, Point } from '../../lib/verification'

defineProps<{ points: Point[] }>()

const ICONES: Record<Niveau, string> = { alerte: '⚠', attention: '!', info: 'i', ok: '✓' }
const LIBELLES: Record<Niveau, string> = { alerte: 'Alerte', attention: 'Attention', info: 'Information', ok: 'Vérifié' }
</script>

<template>
  <section v-if="points.length" aria-labelledby="titre-points">
    <h3 id="titre-points">Points d'attention</h3>
    <ul class="points">
      <li v-for="(p, i) in points" :key="i" :class="p.niveau">
        <span class="icon" aria-hidden="true">{{ ICONES[p.niveau] }}</span>
        <div>
          <span class="sr-only">{{ LIBELLES[p.niveau] }} : </span>
          <strong>{{ p.titre }}</strong>
          <p v-if="p.detail">{{ p.detail }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
