// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErreurReseau, getJson, viderCache } from '../http'

const reponse = (corps: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } }))

describe('getJson', () => {
  beforeEach(() => {
    viderCache()
    sessionStorage.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('met la réponse en cache : un seul appel pour deux demandes', async () => {
    const fetch = vi.fn(() => reponse({ ok: 1 }))
    vi.stubGlobal('fetch', fetch)
    expect(await getJson('https://exemple.test/a', { service: 'Test' })).toEqual({ ok: 1 })
    expect(await getJson('https://exemple.test/a', { service: 'Test' })).toEqual({ ok: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('relit le cache de session après un rechargement', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reponse({ n: 42 })))
    await getJson('https://exemple.test/b', { service: 'Test' })
    viderCache() // simule un rechargement de page : la mémoire est perdue, la session reste
    const fetch = vi.fn(() => reponse({ n: 0 }))
    vi.stubGlobal('fetch', fetch)
    expect(await getJson('https://exemple.test/b', { service: 'Test' })).toEqual({ n: 42 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("donne un message lisible en cas d'erreur HTTP, et ne garde pas l'échec en cache", async () => {
    vi.stubGlobal('fetch', vi.fn(() => reponse({}, 503)))
    await expect(getJson('https://exemple.test/c', { service: 'Géorisques' })).rejects.toThrow('Géorisques : erreur 503')
    const fetch = vi.fn(() => reponse({ repare: true }))
    vi.stubGlobal('fetch', fetch)
    expect(await getJson('https://exemple.test/c', { service: 'Géorisques' })).toEqual({ repare: true })
  })

  it('signale un délai dépassé', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('trop long', 'TimeoutError'))))
    const err = (await getJson('https://exemple.test/d', { service: 'API Carto' }).catch((e: unknown) => e)) as ErreurReseau
    expect(err).toBeInstanceOf(ErreurReseau)
    expect(err.message).toBe('API Carto ne répond pas (délai dépassé)')
  })

  it("abandonne côté appelant sans casser le cache partagé", async () => {
    let finir!: (v: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (finir = r))))
    const ctrl = new AbortController()
    const premier = getJson('https://exemple.test/e', { service: 'Test', signal: ctrl.signal })
    const second = getJson('https://exemple.test/e', { service: 'Test' })
    ctrl.abort()
    await expect(premier).rejects.toMatchObject({ name: 'AbortError' })
    finir(new Response(JSON.stringify({ v: 1 })))
    expect(await second).toEqual({ v: 1 })
  })
})
