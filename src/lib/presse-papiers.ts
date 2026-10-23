// Copie dans le presse-papiers, avec repli quand l'API moderne n'est pas disponible
// (contexte non sécurisé, vieux navigateurs)
export async function copier(texte: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texte)
      return true
    }
  } catch {
    // on tente le repli
  }
  const ta = Object.assign(document.createElement('textarea'), { value: texte })
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  return ok
}
