// Mise en forme française des nombres, dates et libellés

export const nombre = (v?: number | null, decimales = 0) =>
  v == null ? '–' : v.toLocaleString('fr-FR', { maximumFractionDigits: decimales })

export const date = (s?: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : '–')

export const majuscule = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '–')
