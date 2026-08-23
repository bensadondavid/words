'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileSpreadsheet,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpeakButton } from '@/components/ui/speak-button'

export type ListDetail = {
  id: string
  name: string
  language: string
  translationLanguages: string[]
  wordCount: number
}

type WordTranslation = {
  id: string
  text: string
  language: string
}

export type WordSummary = {
  id: string
  text: string
  language: string
  translations: WordTranslation[]
}

type WordForm = {
  text: string
  translations: Array<{ language: string; text: string }>
}

type ListDetailPageProps = {
  list: ListDetail
  initialWords: WordSummary[]
  initialNextCursor: string | null
}

type ListWordsPageData = {
  words: WordSummary[]
  nextCursor: string | null
  wordCount: number
}

export default function ListDetailPage({
  list,
  initialWords,
  initialNextCursor,
}: ListDetailPageProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const createEmptyForm = (): WordForm => ({
    text: '',
    translations: list.translationLanguages.map((language) => ({
      language,
      text: '',
    })),
  })

  const [words, setWords] = useState(initialWords)
  const [wordCount, setWordCount] = useState(list.wordCount)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState<WordForm>(createEmptyForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [wordToDelete, setWordToDelete] = useState<WordSummary | null>(null)

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return

    loadingMoreRef.current = true
    setLoadingMore(true)
    setLoadError('')

    try {
      const response = await fetch(
        `/api/lists/${list.id}/words?cursor=${encodeURIComponent(nextCursor)}`,
        { cache: 'no-store' }
      )
      const data = (await response.json().catch(() => null)) as
        | ListWordsPageData
        | { error?: string }
        | null

      if (!response.ok || !data || !('words' in data)) {
        throw new Error(
          data && 'error' in data && data.error
            ? data.error
            : 'Impossible de charger les mots suivants.'
        )
      }

      setWords((currentWords) => {
        const knownIds = new Set(currentWords.map(({ id }) => id))
        return [
          ...currentWords,
          ...data.words.filter(({ id }) => !knownIds.has(id)),
        ]
      })
      setWordCount(data.wordCount)
      setNextCursor(data.nextCursor)
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les mots suivants.'
      )
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [list.id, nextCursor])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextCursor) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore()
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, nextCursor])

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingId(null)
    setForm(createEmptyForm())
  }

  const openCreateDialog = () => {
    setEditingId(null)
    setForm(createEmptyForm())
    setDialogOpen(true)
  }

  const openEditDialog = (word: WordSummary) => {
    setEditingId(word.id)
    setForm({
      text: word.text,
      translations: list.translationLanguages.map((language) => ({
        language,
        text:
          word.translations.find(
            (translation) => translation.language === language
          )?.text ?? '',
      })),
    })
    setDialogOpen(true)
  }

  const updateTranslation = (language: string, text: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      translations: currentForm.translations.map((translation) =>
        translation.language === language
          ? { ...translation, text }
          : translation
      ),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/lists/${list.id}/words`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { wordId: editingId } : {}),
          ...form,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Impossible d’enregistrer le mot.')
      }

      const savedWord = data.word as WordSummary
      setWords((currentWords) =>
        editingId
          ? currentWords.map((word) =>
              word.id === editingId ? savedWord : word
            )
          : [savedWord, ...currentWords]
      )
      if (!editingId) setWordCount((currentCount) => currentCount + 1)
      toast.success(editingId ? 'Mot modifié' : 'Mot ajouté')
      closeDialog()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteWord = async () => {
    if (!wordToDelete) return

    try {
      setDeletingId(wordToDelete.id)
      const response = await fetch(`/api/lists/${list.id}/words`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: wordToDelete.id }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Impossible de supprimer le mot.')
      }

      const remainingWords = words.filter(
        (currentWord) => currentWord.id !== wordToDelete.id
      )
      setWords(remainingWords)
      setWordCount((currentCount) => Math.max(0, currentCount - 1))
      if (nextCursor === wordToDelete.id) {
        setNextCursor(remainingWords.at(-1)?.id ?? null)
      }
      setWordToDelete(null)
      toast.success('Mot supprimé')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="min-h-screen w-full min-w-0 px-4 py-6 sm:p-6">
      <div className="w-full min-w-0">
        <Button asChild variant="ghost" className="mb-5 -ml-2.5 mb-5">
          <Link href="/account/lists">
            <ArrowLeft className="size-4" />
            Mes listes
          </Link>
        </Button>

        <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground capitalize">
              {list.language}
            </p>
            <h1 className="mt-1 wrap-break-word text-3xl font-bold">{list.name}</h1>
            <div className="mt-3 flex min-w-0 flex-wrap gap-3">
              {list.translationLanguages.map((language) => (
                <span
                  key={language}
                  className="max-w-full break-all rounded-full bg-secondary px-3 py-1 text-sm capitalize"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Button asChild variant="outline">
              <Link href={`/account/import?listId=${list.id}`}>
                <FileSpreadsheet className="size-4" />
                Importer un CSV
              </Link>
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Ajouter un mot
            </Button>
          </div>
        </header>

        <div className="mb-4 mt-8 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Mots</h2>
          <span className="text-sm text-muted-foreground">
            {wordCount} {wordCount > 1 ? 'mots' : 'mot'}
          </span>
        </div>

        {words.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-12 text-center">
            <p className="font-medium">Cette liste est vide</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoutez votre premier mot pour commencer.
            </p>
            <Button onClick={openCreateDialog} className="mt-5">
              <Plus className="size-4" />
              Ajouter un mot
            </Button>
          </div>
        ) : (
          <>
            <div className="grid w-full min-w-0 gap-4 md:hidden">
              {words.map((word) => (
                <article
                  key={word.id}
                  className="w-full min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-sm capitalize"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold text-primary">
                        {word.text}
                      </h3>
                      <p className="text-xs text-muted-foreground">{word.language}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <SpeakButton text={word.text} language={word.language} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(word)}
                        aria-label={`Modifier ${word.text}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setWordToDelete(word)}
                        disabled={deletingId === word.id}
                        aria-label={`Supprimer ${word.text}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-2 border-t pt-4">
                    {word.translations.map((translation) => (
                      <div key={translation.id} className="grid min-w-0 grid-cols-[auto_1fr] gap-2 text-sm">
                        <dt className="text-muted-foreground">
                          {translation.language}
                        </dt>
                        <dd className="flex min-w-0 items-center justify-end gap-1 text-right font-medium">
                          <span className="min-w-0 break-words">{translation.text}</span>
                          <SpeakButton
                            text={translation.text}
                            language={translation.language}
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/4 px-5 py-3 font-medium">
                      {list.language}
                    </th>
                    <th scope="col" className="w-1/2 px-5 py-3 font-medium">
                      Traductions
                    </th>
                    <th scope="col" className="w-1/4 px-5 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {words.map((word) => (
                    <tr
                      key={word.id}
                      className="capitalize transition-colors hover:bg-muted/30"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 font-semibold text-primary"
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <span className="min-w-0 break-words">{word.text}</span>
                          <SpeakButton text={word.text} language={word.language} />
                        </div>
                      </th>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          {word.translations.map((translation) => (
                            <p key={translation.id} className="flex min-w-0 items-center gap-1">
                              <span className="min-w-0 break-words">
                                <span className="text-muted-foreground">
                                  {translation.language} :{' '}
                                </span>
                                {translation.text}
                              </span>
                              <SpeakButton
                                text={translation.text}
                                language={translation.language}
                              />
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(word)}
                            aria-label={`Modifier ${word.text}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setWordToDelete(word)}
                            disabled={deletingId === word.id}
                            aria-label={`Supprimer ${word.text}`}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
        <div className="flex min-h-20 items-center justify-center py-5 text-sm text-muted-foreground">
          {loadingMore ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              Chargement de 50 mots…
            </span>
          ) : loadError ? (
            <div className="text-center">
              <p className="text-destructive">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={loadMore}
                className="mt-3"
              >
                Réessayer
              </Button>
            </div>
          ) : nextCursor ? (
            <span>Faites défiler pour charger la suite</span>
          ) : words.length > 0 ? (
            <span>Tous les mots sont affichés</span>
          ) : null}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) setDialogOpen(true)
          else closeDialog()
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le mot' : 'Ajouter un mot'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="word-text">Mot en {list.language}</Label>
              <Input
                id="word-text"
                value={form.text}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    text: event.target.value,
                  }))
                }
                disabled={submitting}
                autoFocus
                required
              />
            </div>

            {form.translations.map((translation) => (
              <div key={translation.language} className="space-y-1.5">
                <Label htmlFor={`translation-${translation.language}`}>
                  Traduction en {translation.language}
                </Label>
                <Input
                  id={`translation-${translation.language}`}
                  value={translation.text}
                  onChange={(event) =>
                    updateTranslation(translation.language, event.target.value)
                  }
                  disabled={submitting}
                  required
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting
                  ? 'Enregistrement...'
                  : editingId
                    ? 'Modifier'
                    : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={wordToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setWordToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le mot ?</DialogTitle>
            <DialogDescription>
              « {wordToDelete?.text} » et ses traductions seront définitivement
              supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWordToDelete(null)}
              disabled={deletingId !== null}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteWord}
              disabled={deletingId !== null}
            >
              {deletingId ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
