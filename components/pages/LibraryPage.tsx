'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BookOpen,
  Check,
  Gamepad2,
  Globe2,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteOfficialList,
  publishOfficialList,
} from '@/app/account/library/actions'
import { Button } from '@/components/ui/button'

export type OfficialListSummary = {
  id: string
  name: string
  description: string | null
  language: string
  translationLanguages: string[]
  wordCount: number
}

export type SourceListSummary = {
  id: string
  name: string
  language: string
  translationLanguages: string[]
  wordCount: number
}

export default function LibraryPage({
  officialLists,
  sourceLists,
  isAdmin,
}: {
  officialLists: OfficialListSummary[]
  sourceLists: SourceListSummary[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const firstPublishableList = sourceLists.find(
    (list) => list.wordCount > 0 && list.translationLanguages.length > 0
  )
  const [sourceListId, setSourceListId] = useState(
    firstPublishableList?.id ?? ''
  )
  const [description, setDescription] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  async function publishList() {
    if (!sourceListId || publishing) return
    setPublishing(true)

    try {
      const result = await publishOfficialList({ sourceListId, description })
      if ('error' in result && result.error) throw new Error(result.error)
      if (!('success' in result) || !result.success) {
        throw new Error('Impossible de publier cette liste.')
      }

      setDescription('')
      toast.success('Liste ajoutée à la bibliothèque.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.')
    } finally {
      setPublishing(false)
    }
  }

  async function removeList(list: OfficialListSummary) {
    if (deletingId) return
    if (!window.confirm(`Supprimer « ${list.name} » de la bibliothèque ?`)) return
    setDeletingId(list.id)

    try {
      const result = await deleteOfficialList({ officialListId: list.id })
      if ('error' in result && result.error) throw new Error(result.error)
      if (!('success' in result) || !result.success) {
        throw new Error('Impossible de supprimer cette liste.')
      }

      toast.success('Liste officielle supprimée.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Globe2 className="size-4" /> Listes officielles
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Bibliothèque
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Entraînez-vous directement avec des listes préparées et maintenues par
          l’équipe.
        </p>
      </header>

      {isAdmin && (
        <section className="mb-8 rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Administration de la bibliothèque</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Publiez une copie complète d’une de vos listes, avec ses mots,
                traductions et notes.
              </p>
            </div>
          </div>

          {sourceLists.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="grid gap-2 text-sm font-semibold">
                Liste personnelle à publier
                <select
                  value={sourceListId}
                  onChange={(event) => setSourceListId(event.target.value)}
                  className="h-11 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                >
                  {sourceLists.map((list) => (
                    <option
                      key={list.id}
                      value={list.id}
                      disabled={
                        list.wordCount === 0 ||
                        list.translationLanguages.length === 0
                      }
                    >
                      {list.name} · {list.wordCount} mot
                      {list.wordCount > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Description facultative
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  placeholder="Niveau, thème, objectif…"
                  className="h-11 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <Button
                size="lg"
                onClick={publishList}
                disabled={!sourceListId || publishing}
              >
                {publishing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {publishing ? 'Publication…' : 'Publier'}
              </Button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Créez d’abord une liste personnelle pour pouvoir la publier.
            </p>
          )}
        </section>
      )}

      {!officialLists.length ? (
        <section className="rounded-2xl border border-dashed bg-card px-5 py-16 text-center">
          <BookOpen className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">La bibliothèque est vide</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Les premières listes officielles apparaîtront ici.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {officialLists.map((list) => (
            <article
              key={list.id}
              className="flex min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <Check className="size-3.5" /> Officielle
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeList(list)}
                    disabled={Boolean(deletingId)}
                    aria-label={`Supprimer ${list.name}`}
                  >
                    {deletingId === list.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                )}
              </div>
              <h2 className="mt-4 break-words text-xl font-bold">{list.name}</h2>
              <p className="mt-1 text-sm font-medium text-primary">
                {list.language} → {list.translationLanguages.join(', ')}
              </p>
              <p className="mt-3 flex-1 break-words text-sm text-muted-foreground">
                {list.description || 'Une liste prête à utiliser dans le jeu.'}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
                <span className="text-sm font-semibold">
                  {list.wordCount} mot{list.wordCount > 1 ? 's' : ''}
                </span>
                <Button asChild>
                  <Link
                    href={`/account/test?list=${encodeURIComponent(`official:${list.id}`)}`}
                  >
                    <Gamepad2 className="size-4" /> Jouer
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
