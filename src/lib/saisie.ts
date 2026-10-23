// Valeur d'un champ numérique : null si vide
export function nombreOuNull(e: Event): number | null {
  const v = (e.target as HTMLInputElement).value
  return v === '' ? null : Number(v)
}

// Valeur d'un champ date : null si vide
export function dateOuNull(e: Event): string | null {
  return (e.target as HTMLInputElement).value || null
}
