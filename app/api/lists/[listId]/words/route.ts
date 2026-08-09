import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

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

export async function POST(request: Request, { params }: WordsRouteContext) {
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
    console.error('Unable to create word', error)
    return NextResponse.json({ error: 'Impossible de créer le mot.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: WordsRouteContext) {
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
    console.error('Unable to update word', error)
    return NextResponse.json({ error: 'Impossible de modifier le mot.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: WordsRouteContext) {
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

    const word = await prisma.word.findFirst({
      where: {
        id: parsed.data.wordId,
        listId,
        list: { userId: session.user.id },
      },
      select: { id: true },
    })
    if (!word) {
      return NextResponse.json({ error: 'Mot introuvable.' }, { status: 404 })
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.translationWord.deleteMany({ where: { wordId: word.id } })
      await transaction.word.delete({ where: { id: word.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unable to delete word', error)
    return NextResponse.json({ error: 'Impossible de supprimer le mot.' }, { status: 500 })
  }
}
