'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { importWords } from '@/app/account/import/actions'
import { Button } from '@/components/ui/button'

export type ImportList = {
  id: string
  name: string
  language: string
  translationLanguages: string[]
}

type ValidatedRow = {
  line: number
  text: string
  translations: Array<{ language: string; text: string }>
  errors: string[]
}

type ValidationResult = {
  errors: string[]
  rows: ValidatedRow[]
}

type ImportResult = {
  imported: number
  skipped: number
}

const MAX_ROWS = 500
const MAX_FILE_SIZE = 2 * 1024 * 1024

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase()
}

function parseDelimited(content: string, delimiter: string) {
  const rows: string[][] = [[]]
  let field = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]

    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === delimiter) {
      rows[rows.length - 1].push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && content[index + 1] === '\n') index += 1
      rows[rows.length - 1].push(field)
      field = ''
      rows.push([])
    } else {
      field += character
    }
  }

  rows[rows.length - 1].push(field)
  return {
    rows: rows.filter((row) => row.some((value) => value.trim())),
    unclosedQuote: quoted,
  }
}

function parseCsv(content: string) {
  const candidates = [',', ';', '\t'].map((delimiter) => ({
    delimiter,
    parsed: parseDelimited(content, delimiter),
  }))
  return candidates.sort(
    (first, second) =>
      (second.parsed.rows[0]?.length ?? 0) -
      (first.parsed.rows[0]?.length ?? 0)
  )[0].parsed
}

function validateCsv(rawRows: string[][], list?: ImportList): ValidationResult {
  if (!list) return { errors: ['Sélectionnez une liste.'], rows: [] }
  if (!list.translationLanguages.length) {
    return {
      errors: ['Cette liste ne possède aucune langue de traduction.'],
      rows: [],
    }
  }
  if (!rawRows.length) return { errors: [], rows: [] }

  const headers = rawRows[0].map(normalizeHeader)
  const sourceHeaders = new Set(['mot', 'word', normalizeHeader(list.language)])
  const sourceIndex = headers.findIndex((header) => sourceHeaders.has(header))
  const translationIndexes = list.translationLanguages.map((language) => {
    const languageHeader = normalizeHeader(language)
    let index = headers.indexOf(languageHeader)
    if (index < 0 && list.translationLanguages.length === 1) {
      index = headers.findIndex((header) =>
        ['traduction', 'translation'].includes(header)
      )
    }
    return { language, index }
  })
  const errors: string[] = []

  if (sourceIndex < 0) errors.push('La colonne « mot » est absente.')
  const missingLanguages = translationIndexes
    .filter(({ index }) => index < 0)
    .map(({ language }) => language)
  if (missingLanguages.length) {
    errors.push(`Colonnes manquantes : ${missingLanguages.join(', ')}.`)
  }
  if (errors.length) return { errors, rows: [] }

  const dataRows = rawRows.slice(1).filter((row) =>
    row.some((value) => value.trim())
  )
  if (dataRows.length > MAX_ROWS) {
    errors.push(`Le fichier contient plus de ${MAX_ROWS} lignes.`)
  }

  const rows = dataRows.slice(0, MAX_ROWS).map((row, index) => {
    const text = (row[sourceIndex] ?? '').trim()
    const translations = translationIndexes.map(({ language, index: column }) => ({
      language,
      text: (row[column] ?? '').trim(),
    }))
    const rowErrors: string[] = []

    if (!text) rowErrors.push('Mot manquant')
    if (text.length > 200) rowErrors.push('Mot trop long')
    translations.forEach((translation) => {
      if (!translation.text) rowErrors.push(`${translation.language} manquant`)
      if (translation.text.length > 200) {
        rowErrors.push(`${translation.language} trop long`)
      }
    })

    return { line: index + 2, text, translations, errors: rowErrors }
  })

  return { errors, rows }
}

function escapeCsv(value: string) {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function createAiPrompt(list?: ImportList) {
  if (!list?.translationLanguages.length) return ''

  const header = ['mot', ...list.translationLanguages].join(';')
  const translationLanguages = list.translationLanguages.join(', ')

  return `Crée un fichier CSV UTF-8 contenant [NOMBRE DE MOTS] mots pour la liste « ${list.name} ».

Langue des mots : ${list.language}.
Langues de traduction : ${translationLanguages}.

Respecte exactement ces règles :
- utilise le point-virgule comme séparateur ;
- la première ligne doit être exactement : ${header}
- ajoute ensuite une ligne par mot, avec une valeur dans chaque colonne ;
- conserve le même ordre de colonnes sur toutes les lignes ;
- évite les doublons ;
- entoure de guillemets les valeurs contenant un point-virgule, un guillemet ou un retour à la ligne, et double les guillemets internes ;
- génère au maximum ${MAX_ROWS} mots ;
- réponds uniquement avec le contenu brut du CSV, sans explication et sans bloc de code Markdown.`
}

export default function ImportWordsPage({
  lists,
  initialListId,
}: {
  lists: ImportList[]
  initialListId?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const firstImportableList =
    lists.find((list) => list.translationLanguages.length > 0) ?? lists[0]
  const [selectedListId, setSelectedListId] = useState(
    initialListId ?? firstImportableList?.id ?? ''
  )
  const [fileName, setFileName] = useState('')
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const selectedList = lists.find((list) => list.id === selectedListId)
  const validation = useMemo(
    () => validateCsv(rawRows, selectedList),
    [rawRows, selectedList]
  )
  const aiPrompt = useMemo(() => createAiPrompt(selectedList), [selectedList])
  const invalidRows = validation.rows.filter((row) => row.errors.length > 0)
  const validRows = validation.rows.filter((row) => row.errors.length === 0)
  const canImport =
    validRows.length > 0 &&
    invalidRows.length === 0 &&
    validation.errors.length === 0 &&
    !fileError

  async function loadFile(file?: File) {
    if (!file) return
    setImportResult(null)
    setFileError('')
    setRawRows([])
    setFileName(file.name)

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Le fichier dépasse la taille maximale de 2 Mo.')
      return
    }

    try {
      const parsed = parseCsv(await file.text())
      if (parsed.unclosedQuote) {
        setFileError('Une valeur entre guillemets n’est pas correctement fermée.')
        return
      }
      if ((parsed.rows[0]?.length ?? 0) < 2) {
        setFileError('Le séparateur ou les colonnes du fichier sont invalides.')
        return
      }
      setRawRows(parsed.rows)
    } catch {
      setFileError('Impossible de lire ce fichier.')
    }
  }

  function clearFile() {
    setFileName('')
    setRawRows([])
    setFileError('')
    setImportResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function downloadTemplate() {
    if (!selectedList) return
    const header = ['mot', ...selectedList.translationLanguages]
      .map(escapeCsv)
      .join(';')
    const blob = new Blob([`\uFEFF${header}\r\n`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `modele-${selectedList.name.toLocaleLowerCase().replace(/\s+/g, '-')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function copyAiPrompt() {
    if (!aiPrompt) return

    try {
      await navigator.clipboard.writeText(aiPrompt)
      toast.success('Prompt copié.')
    } catch {
      toast.error('Impossible de copier le prompt.')
    }
  }

  async function submitImport() {
    if (!selectedList || !canImport) return
    setImporting(true)

    try {
      const result = await importWords({
        listId: selectedList.id,
        skipDuplicates,
        rows: validRows.map(({ text, translations }) => ({ text, translations })),
      })

      if ('error' in result && result.error) throw new Error(result.error)
      if (!('success' in result) || !result.success) {
        throw new Error('Impossible d’importer les mots.')
      }

      setImportResult({ imported: result.imported, skipped: result.skipped })
      toast.success(`${result.imported} mot${result.imported > 1 ? 's' : ''} importé${result.imported > 1 ? 's' : ''}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.')
    } finally {
      setImporting(false)
    }
  }

  if (!lists.length) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
        <PageHeader />
        <section className="rounded-2xl border border-dashed bg-card px-5 py-16 text-center">
          <FileSpreadsheet className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Aucune liste disponible</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez une liste avant d’importer des mots.
          </p>
          <Button asChild className="mt-6"><Link href="/account/lists">Créer une liste</Link></Button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <PageHeader />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Choisissez la liste</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les colonnes du CSV dépendront des langues de cette liste.
                </p>
                <select
                  value={selectedListId}
                  onChange={(event) => {
                    setSelectedListId(event.target.value)
                    setImportResult(null)
                  }}
                  className="mt-4 h-11 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring sm:max-w-md"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Ajoutez le fichier CSV</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Maximum {MAX_ROWS} lignes et 2 Mo.
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(event) => loadFile(event.target.files?.[0])}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                loadFile(event.dataTransfer.files[0])
              }}
              className={`mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors ${
                dragging ? 'border-primary bg-primary/10' : 'bg-background hover:border-primary hover:bg-primary/5'
              }`}
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="size-6" />
              </span>
              <span className="mt-4 font-bold">Déposez votre CSV ici</span>
              <span className="mt-1 text-sm text-muted-foreground">ou cliquez pour le sélectionner</span>
            </button>

            {fileName && (
              <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3">
                <FileSpreadsheet className="size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{fileName}</span>
                <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Retirer le fichier">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}

            {fileError && <Alert tone="error">{fileError}</Alert>}
            {validation.errors.map((error) => <Alert key={error} tone="error">{error}</Alert>)}
          </section>

          {!!validation.rows.length && (
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  <h2 className="font-bold">Aperçu de l’import</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {validRows.length} ligne{validRows.length > 1 ? 's' : ''} valide{validRows.length > 1 ? 's' : ''}
                    {invalidRows.length ? ` · ${invalidRows.length} à corriger` : ''}
                  </p>
                </div>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  invalidRows.length ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {invalidRows.length ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                  {invalidRows.length ? 'Fichier invalide' : 'Prêt à importer'}
                </span>
              </div>

              <div className="max-h-[430px] overflow-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 bg-secondary text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Ligne</th>
                      <th className="px-5 py-3 font-semibold capitalize">{selectedList?.language}</th>
                      {selectedList?.translationLanguages.map((language) => (
                        <th key={language} className="px-5 py-3 font-semibold capitalize">{language}</th>
                      ))}
                      <th className="px-5 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validation.rows.map((row) => (
                      <tr key={row.line} className={row.errors.length ? 'bg-red-50/60' : ''}>
                        <td className="px-5 py-3 text-muted-foreground">{row.line}</td>
                        <td className="max-w-52 break-words px-5 py-3 font-semibold">{row.text || '—'}</td>
                        {row.translations.map((translation) => (
                          <td key={translation.language} className="max-w-52 break-words px-5 py-3">{translation.text || '—'}</td>
                        ))}
                        <td className="px-5 py-3">
                          {row.errors.length ? (
                            <span className="text-xs font-medium text-red-700">{row.errors.join(' · ')}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="size-3.5" /> Valide</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t p-5 sm:px-7">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(event) => setSkipDuplicates(event.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-semibold">Ignorer les doublons</span>
                    <span className="text-muted-foreground">Les mots déjà présents dans la liste ne seront pas ajoutés.</span>
                  </span>
                </label>

                {importResult && (
                  <Alert tone="success">
                    {importResult.imported} mot{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''}
                    {importResult.skipped ? `, ${importResult.skipped} doublon${importResult.skipped > 1 ? 's' : ''} ignoré${importResult.skipped > 1 ? 's' : ''}.` : '.'}
                  </Alert>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button size="lg" onClick={submitImport} disabled={!canImport || importing || Boolean(importResult)}>
                    {importing ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {importing ? 'Import en cours…' : `Importer ${validRows.length} mot${validRows.length > 1 ? 's' : ''}`}
                  </Button>
                  {importResult && selectedList && (
                    <Button asChild size="lg" variant="outline">
                      <Link href={`/account/lists/${selectedList.id}`}>Voir la liste <ArrowRight className="size-4" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="font-bold">Format attendu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            La première ligne contient les noms des colonnes. Chaque ligne suivante correspond à un mot.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-xs">
            {['mot', ...(selectedList?.translationLanguages ?? [])].join(';')}
          </div>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> Virgule, point-virgule ou tabulation</li>
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> Fichiers CSV exportés depuis Excel ou Google Sheets</li>
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> Guillemets et accents pris en charge</li>
          </ul>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={downloadTemplate}
            disabled={!selectedList?.translationLanguages.length}
          >
            <Download className="size-4" /> Télécharger le modèle
          </Button>

          <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-bold">Prompt pour une IA</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Remplacez simplement « [NOMBRE DE MOTS] », puis envoyez ce prompt à votre IA.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 font-sans text-xs leading-relaxed">
              {aiPrompt || 'Sélectionnez une liste avec au moins une langue de traduction.'}
            </pre>
            <Button
              type="button"
              className="mt-3 w-full"
              onClick={copyAiPrompt}
              disabled={!aiPrompt}
            >
              <Copy className="size-4" /> Copier le prompt
            </Button>
          </div>
        </aside>
      </div>
    </main>
  )
}

function PageHeader() {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <FileSpreadsheet className="size-4" /> Import CSV
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Importer des mots</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Ajoutez rapidement plusieurs mots et leurs traductions à une liste.
      </p>
    </header>
  )
}

function Alert({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) {
  const success = tone === 'success'
  return (
    <div className={`mt-4 flex gap-2 rounded-lg border p-3 text-sm ${
      success ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
    }`}>
      {success ? <Check className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </div>
  )
}
