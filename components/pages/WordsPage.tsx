'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SpeakButton } from '@/components/ui/speak-button'
import type { WordFeedItem, WordsPageData } from '@/lib/words/types'

type WordsPageProps = {
  initialPage: WordsPageData
}

export default function WordsPage({ initialPage }: WordsPageProps) {
  const [words, setWords] = useState<WordFeedItem[]>(initialPage.words)
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return

    loadingRef.current = true
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/words?cursor=${encodeURIComponent(nextCursor)}`,
        { cache: 'no-store' }
      )
      const data = (await response.json().catch(() => null)) as
        | WordsPageData
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
        const newWords = data.words.filter(({ id }) => !knownIds.has(id))
        return [...currentWords, ...newWords]
      })
      setNextCursor(data.nextCursor)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger les mots suivants.'
      )
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [nextCursor])

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

  return (
    <section className="min-h-screen w-full min-w-0 px-4 py-6 sm:p-6">
      <div className="w-full min-w-0">
        <header className="mb-8 flex items-end justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Tous mes mots</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {words.length} {words.length > 1 ? 'mots affichés' : 'mot affiché'}
            </p>
          </div>
        </header>

        {words.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-12 text-center">
            <p className="font-medium">Aucun mot pour le moment</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoutez des mots depuis l’une de vos listes.
            </p>
            <Button asChild className="mt-5">
              <Link href="/account/lists">Voir mes listes</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid w-full min-w-0 gap-4 md:hidden">
              {words.map((word) => (
                <WordCard key={word.id} word={word} />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/5 px-5 py-3 font-medium">
                      Mot
                    </th>
                    <th scope="col" className="w-2/5 px-5 py-3 font-medium">
                      Traductions
                    </th>
                    <th scope="col" className="w-1/5 px-5 py-3 font-medium">
                      Liste
                    </th>
                    <th scope="col" className="w-1/5 px-5 py-3 text-right font-medium">
                      Accès
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
                      <td className="truncate px-5 py-4">{word.list.name}</td>
                      <td className="px-5 py-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/account/lists/${word.list.id}`}>
                            Ouvrir
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-px w-full"
        />

        <div className="flex min-h-20 items-center justify-center py-5 text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              Chargement de 50 mots...
            </span>
          ) : error ? (
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button type="button" variant="outline" onClick={loadMore} className="mt-3">
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
    </section>
  )
}

function WordCard({ word }: { word: WordFeedItem }) {
  return (
    <article className="w-full min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-sm capitalize">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="min-w-0 break-words text-lg font-semibold text-primary">
            {word.text}
          </h2>
          <SpeakButton text={word.text} language={word.language} />
        </div>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {word.language} · {word.list.name}
        </p>
      </div>

      <dl className="mt-4 space-y-2 border-t pt-4">
        {word.translations.map((translation) => (
          <div
            key={translation.id}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm"
          >
            <dt className="text-muted-foreground">{translation.language}</dt>
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

      <div className="mt-4 flex justify-end border-t pt-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/account/lists/${word.list.id}`}>
            Ouvrir la liste
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  )
}
