// Construit les données hébergées : les DPE par type de bien (existants et neufs), un fichier
// compressé par commune, plus donnees/index.json. Lancé chaque semaine par GitHub Actions
// (.github/workflows/donnees.yml, un type par tâche), ou à la main pour développer :
//
//   npm run donnees -- --departements 35            → public/donnees (servi par `npm run dev`)
//   npm run donnees -- --types maison --sortie donnees   → maisons de toute la France (≈ 1 h)
//   npm run donnees -- --assembler --sortie donnees      → index.json à partir des types construits
//
// Chaque type construit écrit donnees/{dossier}/partie.json ; l'assemblage les réunit dans
// donnees/index.json (le script le fait aussi à la fin de chaque construction).
//
// L'API de l'ADEME limite le temps de calcul par utilisateur : le script avance page par page
// (10 000 lignes), sans compter le total, et attend quand l'API le demande (erreur 429).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { TypeBatiment } from '../../src/api/dpe'
import {
  CHAMPS_ADEME,
  DOSSIERS,
  VERSION_FORMAT,
  cheminCommune,
  encoderLigne,
  type Dictionnaires,
  type FichierCommune,
  type IndexMiroir,
  type LigneAdeme,
  type PartieMiroir,
} from '../../src/lib/miroir-format'

const API = 'https://data.ademe.fr/data-fair/api/v1/datasets'
const BASES = [
  { id: 'dpe03existant', source: 'existant' as const },
  { id: 'g3cgx7jb3cmys5voxz1mrm22', source: 'neuf' as const },
]
const TOUS_DEPARTEMENTS = [
  ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0')).filter((d) => d !== '20'),
  '2A',
  '2B',
  '971',
  '972',
  '973',
  '974',
  '976',
]
const TOUS_TYPES = Object.keys(DOSSIERS) as TypeBatiment[]

function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const sortie = argument('sortie') ?? 'public/donnees'
const departements = argument('departements')?.split(',') ?? TOUS_DEPARTEMENTS
const types = (argument('types')?.split(',') ?? TOUS_TYPES) as TypeBatiment[]
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function page(url: string): Promise<{ results: LigneAdeme[]; next?: string }> {
  for (let essai = 1; ; essai++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'sherlock-immo (construction des données)' } })
      if (res.status === 429) {
        const s = Number(res.headers.get('retry-after')) || 60
        console.log(`  quota ADEME atteint, pause de ${s} s`)
        await attendre((s + 2) * 1000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (essai >= 6) throw e
      console.log(`  erreur (${(e as Error).message}), nouvel essai ${essai}/5 dans ${essai * 20} s`)
      await attendre(essai * 20_000)
    }
  }
}

async function construire(type: TypeBatiment, majAdeme: string | null) {
  const debut = Date.now()
  const dict: Dictionnaires = { periodes: [], energies: [], ete: [] }
  const communes = new Map<string, FichierCommune>()
  let total = 0

  for (const dep of departements) {
    for (const base of BASES) {
      const params = new URLSearchParams({
        size: '10000',
        count: 'false',
        select: CHAMPS_ADEME.join(','),
        type_batiment_eq: type,
        // Par préfixe du code INSEE, et non par code_departement_ban : ce champ est vide ou
        // faux sur ~1 % des lignes (749 appartements de Rennes manquaient)
        code_insee_ban_starts: dep,
      })
      let url: string | undefined = `${API}/${base.id}/lines?${params}`
      let n = 0
      while (url) {
        const { results, next } = await page(url)
        for (const r of results) {
          const insee = r.code_insee_ban
          if (!insee) continue
          let f = communes.get(insee)
          if (!f) communes.set(insee, (f = { insee, nom: r.nom_commune_ban ?? '', lignes: [] }))
          f.lignes.push(encoderLigne(r, base.source, dict))
        }
        n += results.length
        // Sans total (count=false), une page incomplète signale la fin
        url = results.length === 10_000 ? next : undefined
      }
      total += n
      console.log(`${type} ${dep} ${base.source} : ${n} (cumul ${total}, ${Math.round((Date.now() - debut) / 1000)} s)`)
    }
  }

  const dossier = join(sortie, DOSSIERS[type])
  rmSync(dossier, { recursive: true, force: true })
  let octets = 0
  for (const f of communes.values()) {
    // Plus récents d'abord : l'ordre d'affichage par défaut
    f.lignes.sort((a, b) => String(b[1] ?? '').localeCompare(String(a[1] ?? '')))
    const chemin = join(sortie, cheminCommune(f.insee, type))
    mkdirSync(join(chemin, '..'), { recursive: true })
    const gz = gzipSync(JSON.stringify(f), { level: 9 })
    writeFileSync(chemin, gz)
    octets += gz.length
  }

  const partie: PartieMiroir = {
    version: VERSION_FORMAT,
    genere_le: new Date().toISOString(),
    maj_ademe: majAdeme,
    lignes: total,
    communes: communes.size,
    ...(departements === TOUS_DEPARTEMENTS ? {} : { departements }),
    dict,
  }
  mkdirSync(dossier, { recursive: true })
  writeFileSync(join(dossier, 'partie.json'), JSON.stringify(partie))
  console.log(
    `Terminé (${type}) : ${total} DPE, ${communes.size} communes, ${(octets / 1e6).toFixed(1)} Mo, ` +
      `${Math.round((Date.now() - debut) / 60_000)} min → ${dossier}`,
  )
}

// Réunit les types construits (donnees/{dossier}/partie.json) dans donnees/index.json
function assembler() {
  const index: IndexMiroir = { version: VERSION_FORMAT, genere_le: '', types: {} }
  for (const type of TOUS_TYPES) {
    const chemin = join(sortie, DOSSIERS[type], 'partie.json')
    if (!existsSync(chemin)) continue
    const partie = JSON.parse(readFileSync(chemin, 'utf8')) as PartieMiroir
    if (partie.version !== VERSION_FORMAT) continue
    index.types[type] = partie
    if (!index.genere_le || partie.genere_le < index.genere_le) index.genere_le = partie.genere_le
  }
  writeFileSync(join(sortie, 'index.json'), JSON.stringify(index))
  const resume = Object.entries(index.types).map(([t, p]) => `${t} ${p.lignes}`)
  console.log(`Index : ${resume.join(', ') || 'aucun type'} → ${join(sortie, 'index.json')}`)
}

async function main() {
  if (!process.argv.includes('--assembler')) {
    // Date de mise à jour de la base, pour l'affichage ; facultative, un échec ne bloque rien
    const meta: { dataUpdatedAt?: string } = await fetch(`${API}/dpe03existant?select=dataUpdatedAt`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
    for (const type of types) await construire(type, meta.dataUpdatedAt ?? null)
  }
  mkdirSync(sortie, { recursive: true })
  assembler()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
