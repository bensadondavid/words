import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth/auth'
import { isPrismaUniqueConstraintError } from '@/lib/database/is-prisma-unique-constraint-error'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { getOwnedListWordsPage } from '@/lib/words/get-owned-list-words-page'

const translationSchema = z.object({
  language: z.string().trim().min(1).max(50),
  text: z.string().trim().min(1).max(200),
})

const wordSchema = z.object({
  text: z.string().trim().min(1).max(200),
  translations: z.array(translationSchema).min(1).max(10),
})

const updateWordSchema = wordSchema.extend({ wordId: z.string().min(1) })
const deleteWordSchema = z.object({ wordId: z.string().min(1) })

type WordsRouteContext = {
  params: Promise<{ listId: string }>
}

async function getOwnedList(listId: string, userId: string) {
  return prisma.list.findFirst({
    where: { id: listId, userId },
    select: {
      id: true,
      language: true,
      translationLists: { select: { language: true } },
    },
  })
}

function hasExpectedLanguages(
  translations: Array<{ language: string }>,
  expectedLanguages: string[]
) {
  const received = new Set(translations.map(({ language }) => language))
  return (
    received.size === translations.length &&
    received.size === expectedLanguages.length &&
    expectedLanguages.every((language) => received.has(language))
  )
}

function serializeWord(word: {
  id: string
  text: string
  language: string
  translationsWords: Array<{ id: string; text: string; language: string }>
}) {
  return {
    id: word.id,
    text: word.text,
    language: word.language,
    translations: word.translationsWords.map((translation) => ({
      id: translation.id,
      text: translation.text,
      language: translation.language,
    })),
  }
}

export async function GET(request: Request, { params }: WordsRouteContext) {
  return withQueryProfile('api:GET /api/lists/[listId]/words', () =>
    getWords(request, params)
  )
}

async function getWords(
  request: Request,
  params: WordsRouteContext['params']
) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: request.headers }),
  ])

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined
    const page = await getOwnedListWordsPage(listId, session.user.id, cursor)

    if (!page) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }

    return NextResponse.json(
      {
        words: page.words,
        nextCursor: page.nextCursor,
        wordCount: page.list.wordCount,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('Unable to load list words', error)
    return NextResponse.json(
      { error: 'Impossible de charger les mots suivants.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: WordsRouteContext) {
  return withQueryProfile('api:POST /api/lists/[listId]/words', () =>
    createWord(request, params)
  )
}

async function createWord(
  request: Request,
  params: WordsRouteContext['params']
) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: request.headers }),
  ])

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const [list, parsed] = await Promise.all([
      getOwnedList(listId, session.user.id),
      request.json().then((body) => wordSchema.safeParse(body)),
    ])

    if (!list) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }
    if (!parsed.success) {
      return NextResponse.json({ error: 'Le mot est invalide.' }, { status: 400 })
    }

    const expectedLanguages = list.translationLists.map(({ language }) => language)
    if (!hasExpectedLanguages(parsed.data.translations, expectedLanguages)) {
      return NextResponse.json(
        { error: 'Les langues de traduction ne correspondent pas à la liste.' },
        { status: 400 }
      )
    }

    const word = await prisma.word.create({
      data: {
        text: parsed.data.text,
        language: list.language,
        listId: list.id,
        translationsWords: { create: parsed.data.translations },
      },
      include: { translationsWords: true },
    })

    return NextResponse.json({ word: serializeWord(word) }, { status: 201 })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Une seule traduction par langue est autorisée.' },
        { status: 409 }
      )
    }

    console.error('Unable to create word', error)
    return NextResponse.json({ error: 'Impossible de créer le mot.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: WordsRouteContext) {
  return withQueryProfile('api:PATCH /api/lists/[listId]/words', () =>
    updateWord(request, params)
  )
}

async function updateWord(
  request: Request,
  params: WordsRouteContext['params']
) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: request.headers }),
  ])

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const [list, parsed] = await Promise.all([
      getOwnedList(listId, session.user.id),
      request.json().then((body) => updateWordSchema.safeParse(body)),
    ])

    if (!list) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }
    if (!parsed.success) {
      return NextResponse.json({ error: 'Le mot est invalide.' }, { status: 400 })
    }

    const expectedLanguages = list.translationLists.map(({ language }) => language)
    if (!hasExpectedLanguages(parsed.data.translations, expectedLanguages)) {
      return NextResponse.json(
        { error: 'Les langues de traduction ne correspondent pas à la liste.' },
        { status: 400 }
      )
    }

    const existingWord = await prisma.word.findFirst({
      where: { id: parsed.data.wordId, listId: list.id },
      select: { id: true },
    })
    if (!existingWord) {
      return NextResponse.json({ error: 'Mot introuvable.' }, { status: 404 })
    }

    const word = await prisma.$transaction(async (transaction) => {
      await transaction.translationWord.deleteMany({
        where: { wordId: existingWord.id },
      })
      return transaction.word.update({
        where: { id: existingWord.id },
        data: {
          text: parsed.data.text,
          language: list.language,
          translationsWords: { create: parsed.data.translations },
        },
        include: { translationsWords: true },
      })
    })

    return NextResponse.json({ word: serializeWord(word) })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Une seule traduction par langue est autorisée.' },
        { status: 409 }
      )
    }

    console.error('Unable to update word', error)
    return NextResponse.json({ error: 'Impossible de modifier le mot.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: WordsRouteContext) {
  return withQueryProfile('api:DELETE /api/lists/[listId]/words', () =>
    deleteWord(request, params)
  )
}

async function deleteWord(
  request: Request,
  params: WordsRouteContext['params']
) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: request.headers }),
  ])

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = deleteWordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
    }

    const deletedWord = await prisma.word.deleteMany({
      where: {
        id: parsed.data.wordId,
        listId,
        list: { userId: session.user.id },
      },
    })
    if (deletedWord.count === 0) {
      return NextResponse.json({ error: 'Mot introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unable to delete word', error)
    return NextResponse.json({ error: 'Impossible de supprimer le mot.' }, { status: 500 })
  }
}
