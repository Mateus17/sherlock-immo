// Accès réseau commun à toutes les API : délai maximal, messages d'erreur lisibles
// et cache des réponses (en mémoire, et pour la session quand elles sont petites).
// Le cache évite de réinterroger les services publics quand on rouvre une fiche.

const DELAI_MS = 20_000
const DUREE_CACHE_MS = 60 * 60 * 1000 // 1 h : les bases publiques changent au mieux chaque semaine
const TAILLE_MAX_SESSION = 150_000 // caractères ; au-delà, cache en mémoire seulement
const MAX_MEMOIRE = 300

export class ErreurReseau extends Error {
  constructor(
    message: string,
    readonly service: string,
  ) {
    super(message)
    this.name = 'ErreurReseau'
  }
}

const memoire = new Map<string, Promise<unknown>>()

function lireSession<T>(cle: string): T | undefined {
  try {
    const brut = sessionStorage.getItem(cle)
    if (!brut) return undefined
    const { t, v } = JSON.parse(brut) as { t: number; v: T }
    return Date.now() - t < DUREE_CACHE_MS ? v : undefined
  } catch {
    return undefined
  }
}

function ecrireSession(cle: string, v: unknown) {
  try {
    const brut = JSON.stringify({ t: Date.now(), v })
    if (brut.length <= TAILLE_MAX_SESSION) sessionStorage.setItem(cle, brut)
  } catch {
    // stockage plein ou indisponible : le cache mémoire suffit
  }
}

async function telecharger<T>(url: string, service: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(DELAI_MS) })
  } catch (e) {
    const err = e as Error
    if (err.name === 'TimeoutError') throw new ErreurReseau(`${service} ne répond pas (délai dépassé)`, service)
    throw new ErreurReseau(`${service} injoignable (connexion ?)`, service)
  }
  if (!res.ok) throw new ErreurReseau(`${service} : erreur ${res.status}`, service)
  return res.json() as Promise<T>
}

// Rejette dès que l'appelant abandonne, sans interrompre le téléchargement partagé
function suivre<T>(promesse: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promesse
  if (signal.aborted) return Promise.reject(new DOMException('Abandon', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const abandon = () => reject(new DOMException('Abandon', 'AbortError'))
    signal.addEventListener('abort', abandon, { once: true })
    promesse.then(
      (v) => {
        signal.removeEventListener('abort', abandon)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', abandon)
        reject(e)
      },
    )
  })
}

export interface Options {
  service: string // nom affiché dans les messages d'erreur
  signal?: AbortSignal
  cache?: boolean // défaut : true
}

export function getJson<T>(url: string, { service, signal, cache = true }: Options): Promise<T> {
  if (!cache) return suivre(telecharger<T>(url, service), signal)

  const cle = `sherlock-immo:http:${url}`
  let promesse = memoire.get(cle) as Promise<T> | undefined
  if (!promesse) {
    const enSession = lireSession<T>(cle)
    promesse = enSession !== undefined ? Promise.resolve(enSession) : telecharger<T>(url, service)
    memoire.set(cle, promesse)
    if (memoire.size > MAX_MEMOIRE) memoire.delete(memoire.keys().next().value!)
    promesse.then(
      (v) => enSession === undefined && ecrireSession(cle, v),
      // Un échec ne doit pas rester en cache
      () => memoire.delete(cle),
    )
  }
  return suivre(promesse, signal)
}

// Pour les tests
export function viderCache() {
  memoire.clear()
}
