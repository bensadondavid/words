'use client'

import { useCallback, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ListSummary = {
  id: string
  name: string
  language: string
  translations: string[]
  wordCount: number
}

type FormList = {
  name: string
  language: string
  translations: string[]
}

const createEmptyForm = (): FormList => ({
  name: '',
  language: '',
  translations: [''],
})

type ListsPageProps = {
  initialLists: ListSummary[]
}

export default function ListsPage({ initialLists }: ListsPageProps) {
  const [lists, setLists] = useState<ListSummary[]>(initialLists)
  const [formList, setFormList] = useState<FormList>(createEmptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [listToDelete, setListToDelete] = useState<ListSummary | null>(null)
  const [error, setError] = useState('')

  const getLists = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/get-lists', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Impossible de récupérer les listes')
      }

      const data = await response.json()

      setLists(data.lists ?? [])
    } catch (error) {
      console.error(error)
      setError('Impossible de charger les listes.')
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = () => {
    setFormList(createEmptyForm())
    setEditingId(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (list: ListSummary) => {
    setEditingId(list.id)

    setFormList({
      name: list.name,
      language: list.language,
      translations:
        list.translations.length > 0 ? [...list.translations] : [''],
    })

    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleMainInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target

    setFormList((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  const handleTranslationChange = (
    indexToUpdate: number,
    value: string
  ) => {
    setFormList((previousForm) => ({
      ...previousForm,
      translations: previousForm.translations.map(
        (translation, index) =>
          index === indexToUpdate ? value : translation
      ),
    }))
  }

  const addTranslation = () => {
    setFormList((previousForm) => ({
      ...previousForm,
      translations: [...previousForm.translations, ''],
    }))
  }

  const removeTranslation = (indexToRemove: number) => {
    setFormList((previousForm) => ({
      ...previousForm,
      translations: previousForm.translations.filter(
        (_, index) => index !== indexToRemove
      ),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    const isEditing = editingId !== null

    try {
      const response = await fetch(
        isEditing ? '/api/update-list' : '/api/create-list',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isEditing
              ? {
                  id: editingId,
                  ...formList,
                }
              : formList
          ),
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => null)

        throw new Error(
          data?.error ??
            (isEditing
              ? 'Impossible de modifier la liste'
              : 'Impossible de créer la liste')
        )
      }

      toast.success(
        isEditing ? 'Liste modifiée' : 'Liste créée'
      )

      closeDialog()
      await getLists()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteList = async () => {
    if (!listToDelete) return

    try {
      setDeletingId(listToDelete.id)
      const response = await fetch('/api/delete-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listToDelete.id }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? 'Impossible de supprimer la liste')
      }

      setLists((currentLists) =>
        currentLists.filter(
          (currentList) => currentList.id !== listToDelete.id
        )
      )
      setListToDelete(null)
      toast.success('Liste supprimée')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="min-h-screen w-full min-w-0 px-4 py-6 sm:p-6">
      <div className="w-full min-w-0">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Mes listes
          </h1>

          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Créer une liste
          </Button>
        </div>

        {loading && (
          <p className="text-muted-foreground">
            Chargement des listes...
          </p>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-red-600">{error}</p>

            <Button
              type="button"
              variant="outline"
              onClick={getLists}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        )}

        {!loading && !error && lists.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">
              Aucune liste
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Crée ta première liste pour commencer.
            </p>
          </div>
        )}

        {!loading && !error && lists.length > 0 && (
          <>
            <div className="grid w-full min-w-0 gap-4 md:hidden">
              {lists.map((list) => (
                <article
                  key={list.id}
                  className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:p-5"
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-36">
                      <h2 className="break-words text-lg font-semibold">
                        {list.name}
                      </h2>
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        Langue principale : {list.language}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {list.wordCount} {list.wordCount > 1 ? 'mots' : 'mot'}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Langues de traduction
                    </p>
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {list.translations.map((translation, index) => (
                        <span
                          key={`${translation}-${index}`}
                          className="max-w-full break-all bg-secondary py-1 text-xs border p-1"
                        >
                          {translation}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-t pt-4">
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(list)}
                        aria-label={`Modifier ${list.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setListToDelete(list)}
                        disabled={deletingId === list.id}
                        aria-label={`Supprimer ${list.name}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>

                    <Button asChild className="w-full min-w-0">
                      <Link href={`/account/lists/${list.id}`}>
                        Ouvrir
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/5 px-5 py-3 font-medium">
                      Nom
                    </th>
                    <th scope="col" className="w-1/5 px-5 py-3 font-medium">
                      Langue principale
                    </th>
                    <th scope="col" className="w-[30%] px-5 py-3 font-medium">
                      Traductions
                    </th>
                    <th scope="col" className="w-[10%] px-5 py-3 text-center font-medium">
                      Mots
                    </th>
                    <th scope="col" className="w-1/5 px-5 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                {lists.map((list) => (
                  <tr key={list.id} className="transition-colors hover:bg-muted/30">
                    <th scope="row" className="truncate px-5 py-4 font-semibold">
                      {list.name}
                    </th>
                    <td className="truncate px-5 py-4">{list.language}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {list.translations.map((translation, index) => (
                          <span
                            key={`${translation}-${index}`}
                            className="rounded-full bg-secondary px-2.5 py-1 text-xs"
                          >
                            {translation}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center tabular-nums">
                      {list.wordCount}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(list)}
                          aria-label={`Modifier ${list.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setListToDelete(list)}
                          disabled={deletingId === list.id}
                          aria-label={`Supprimer ${list.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>

                        <Button asChild size="sm" className="ml-2">
                          <Link href={`/account/lists/${list.id}`}>
                            Ouvrir
                            <ArrowRight className="size-4" />
                          </Link>
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
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true)
          } else {
            closeDialog()
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier la liste' : 'Nouvelle liste'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="mt-2 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nom</Label>

              <Input
                id="name"
                name="name"
                value={formList.name}
                onChange={handleMainInputChange}
                disabled={submitting}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language">
                Première langue
              </Label>

              <Input
                id="language"
                name="language"
                value={formList.language}
                onChange={handleMainInputChange}
                disabled={submitting}
                required
              />
            </div>

            {formList.translations.map((translation, index) => (
              <div
                key={index}
                className="flex flex-col gap-1.5"
              >
                <Label htmlFor={`translation-${index}`}>
                  Langue de traduction {index + 1}
                </Label>

                <div className="flex items-center gap-3">
                  <Input
                    id={`translation-${index}`}
                    value={translation}
                    onChange={(event) =>
                      handleTranslationChange(
                        index,
                        event.target.value
                      )
                    }
                    disabled={submitting}
                    required
                  />

                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTranslation(index)}
                      disabled={submitting}
                      aria-label={`Supprimer la langue ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addTranslation}
              disabled={submitting || formList.translations.length >= 10}
            >
              Ajouter une langue
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
                className="flex-1"
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting
                  ? 'Enregistrement...'
                  : editingId
                    ? 'Modifier'
                    : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={listToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setListToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la liste ?</DialogTitle>
            <DialogDescription>
              « {listToDelete?.name} » et tous ses mots seront définitivement
              supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setListToDelete(null)}
              disabled={deletingId !== null}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteList}
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
