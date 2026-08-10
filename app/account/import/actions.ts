'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'

import { auth } from '@/lib/auth/auth'
import { isPrismaUniqueConstraintError } from '@/lib/database/is-prisma-unique-constraint-error'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

const translationSchema = z.object({
  language: z.string().trim().min(1).max(50),
  text: z.string().trim().min(1).max(200),
})

const importSchema = z.object({
  listId: z.string().min(1),
  skipDuplicates: z.boolean(),
  rows: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(200),
        translations: z.array(translationSchema).min(1).max(10),
      })
    )
    .min(1)
    .max(500),
})

export async function importWords(input: unknown) {
  return withQueryProfile('action:importWords', () => runImportWords(input))
}

async function runImportWords(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Vous devez être connecté.' }

  const parsed = importSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Les données du fichier sont invalides.' }
  }

  try {
    const list = await prisma.list.findFirst({
      where: { id: parsed.data.listId, userId: session.user.id },
      select: {
        id: true,
        language: true,
        translationLists: { select: { language: true } },
      },
    })

    if (!list) return { error: 'Liste introuvable.' }

    const expectedLanguages = list.translationLists.map(({ language }) => language)
    if (!expectedLanguages.length) {
      return { error: 'Cette liste ne possède aucune langue de traduction.' }
    }

    const expectedLanguageKeys = new Set(
      expectedLanguages.map((language) => language.trim().toLocaleLowerCase())
    )
    const canonicalLanguages = new Map(
      expectedLanguages.map((language) => [
        language.trim().toLocaleLowerCase(),
        language,
      ])
    )
    const invalidRow = parsed.data.rows.some((row) => {
      const receivedLanguageKeys = new Set(
        row.translations.map(({ language }) => language.trim().toLocaleLowerCase())
      )
      return (
        receivedLanguageKeys.size !== row.translations.length ||
        receivedLanguageKeys.size !== expectedLanguageKeys.size ||
        [...expectedLanguageKeys].some(
          (language) => !receivedLanguageKeys.has(language)
        )
      )
    })

    if (invalidRow) {
      return { error: 'Les langues du fichier ne correspondent pas à la liste.' }
    }

    const existingWords = parsed.data.skipDuplicates
      ? await prisma.word.findMany({
          where: {
            listId: list.id,
            text: {
              in: parsed.data.rows.map(({ text }) => text),
              mode: 'insensitive',
            },
          },
          select: { text: true },
        })
      : []
    const knownWords = new Set(
      existingWords.map(({ text }) => text.trim().toLocaleLowerCase())
    )
    const seenWords = new Set<string>()
    const rowsToCreate = parsed.data.rows.filter((row) => {
      if (!parsed.data.skipDuplicates) return true
      const key = row.text.trim().toLocaleLowerCase()
      if (knownWords.has(key) || seenWords.has(key)) return false
      seenWords.add(key)
      return true
    })

    if (rowsToCreate.length) {
      const preparedWords = rowsToCreate.map((row) => ({
        id: randomUUID(),
        row,
      }))

      await prisma.$transaction(async (transaction) => {
        await transaction.word.createMany({
          data: preparedWords.map(({ id, row }) => ({
            id,
            text: row.text,
            language: list.language,
            listId: list.id,
          })),
        })

        await transaction.translationWord.createMany({
          data: preparedWords.flatMap(({ id: wordId, row }) =>
            row.translations.map((translation) => ({
              id: randomUUID(),
              wordId,
              text: translation.text,
              language:
                canonicalLanguages.get(
                  translation.language.trim().toLocaleLowerCase()
                ) ?? translation.language,
            }))
          ),
        })
      })
    }

    return {
      success: true,
      imported: rowsToCreate.length,
      skipped: parsed.data.rows.length - rowsToCreate.length,
    }
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return { error: 'Une seule traduction par langue est autorisée.' }
    }

    console.error('Unable to import words', error)
    return { error: 'Impossible d’importer les mots.' }
  }
}
