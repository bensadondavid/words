import { auth } from '@/lib/auth/auth'
import { isPrismaUniqueConstraintError } from '@/lib/database/is-prisma-unique-constraint-error'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateListSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    language: z.string().trim().min(1).max(50),
    translations: z
      .array(z.string().trim().min(1).max(50))
      .min(1)
      .max(10)
      .refine(
        (languages) =>
          new Set(languages.map(normalizeLanguage)).size === languages.length,
        { message: 'Chaque langue de traduction doit être unique.' }
      ),
    confirmLanguageChange: z.boolean().default(false),
  })
  .refine(
    ({ language, translations }) =>
      !translations.some(
        (translation) => normalizeLanguage(translation) === normalizeLanguage(language)
      ),
    {
      message: 'La langue source ne peut pas être une langue de traduction.',
      path: ['translations'],
    }
  )

function normalizeLanguage(language: string) {
  return language.trim().toLocaleLowerCase()
}

class IncompleteLanguageSwapError extends Error {}

export async function PATCH(request: Request) {
  return withQueryProfile('api:PATCH /api/update-list', () =>
    updateList(request)
  )
}

async function updateList(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = updateListSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Les informations de la liste sont invalides.' },
        { status: 400 }
      )
    }

    const existingList = await prisma.list.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
      select: {
        id: true,
        language: true,
        _count: {
          select: { words: true },
        },
        translationLists: {
          orderBy: { createdAt: 'asc' },
          select: { language: true },
        },
      },
    })

    if (!existingList) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }

    const previousLanguages = existingList.translationLists.map(
      ({ language }) => language
    )
    const nextLanguageKeys = new Set(
      parsed.data.translations.map(normalizeLanguage)
    )
    const languageConfigurationChanged =
      normalizeLanguage(existingList.language) !==
        normalizeLanguage(parsed.data.language) ||
      previousLanguages.length !== parsed.data.translations.length ||
      previousLanguages.some(
        (language) => !nextLanguageKeys.has(normalizeLanguage(language))
      )
    const previousSourceKey = normalizeLanguage(existingList.language)
    const nextSourceKey = normalizeLanguage(parsed.data.language)
    const sourceTranslationLanguage = previousLanguages.find(
      (language) => normalizeLanguage(language) === nextSourceKey
    )
    const previousSourceAsTranslation = parsed.data.translations.find(
      (language) => normalizeLanguage(language) === previousSourceKey
    )
    const languageSwap =
      previousSourceKey !== nextSourceKey &&
      sourceTranslationLanguage &&
      previousSourceAsTranslation
        ? {
            fromTranslation: sourceTranslationLanguage,
            toTranslation: previousSourceAsTranslation,
          }
        : null

    if (
      languageConfigurationChanged &&
      existingList._count.words > 0 &&
      !parsed.data.confirmLanguageChange
    ) {
      return NextResponse.json(
        {
          error: languageSwap
            ? 'Confirmez que les mots, leurs traductions et leurs notes seront inversés.'
            : 'Confirmez que les textes existants seront conservés sans être traduits.',
          confirmationRequired: true,
        },
        { status: 409 }
      )
    }

    const list = await prisma.$transaction(async (transaction) => {
      const nextLanguages = parsed.data.translations
      const previousKeys = new Set(previousLanguages.map(normalizeLanguage))
      const nextByKey = new Map(
        nextLanguages.map((language) => [normalizeLanguage(language), language])
      )
      const retainedRenames = previousLanguages.flatMap((language) => {
        const nextLanguage = nextByKey.get(normalizeLanguage(language))
        return nextLanguage && nextLanguage !== language
          ? [{ from: language, to: nextLanguage }]
          : []
      })
      const removedLanguages = previousLanguages.filter(
        (language) => !nextByKey.has(normalizeLanguage(language))
      )
      const addedLanguages = nextLanguages.filter(
        (language) => !previousKeys.has(normalizeLanguage(language))
      )
      const replacements = removedLanguages
        .slice(0, addedLanguages.length)
        .map((language, index) => ({
          from: language,
          to: addedLanguages[index],
        }))
      const languagesToDelete = removedLanguages.slice(addedLanguages.length)

      if (languageSwap) {
        const wordsToSwap = await transaction.word.findMany({
          where: { listId: existingList.id },
          select: {
            id: true,
            text: true,
            note: true,
            translationsWords: {
              where: { language: languageSwap.fromTranslation },
              take: 1,
              select: {
                id: true,
                text: true,
                note: true,
              },
            },
          },
        })

        if (
          wordsToSwap.some(
            ({ translationsWords }) => translationsWords.length === 0
          )
        ) {
          throw new IncompleteLanguageSwapError()
        }

        for (const word of wordsToSwap) {
          const translation = word.translationsWords[0]

          await transaction.word.update({
            where: { id: word.id },
            data: {
              text: translation.text,
              note: translation.note,
              language: parsed.data.language,
            },
          })

          await transaction.translationWord.update({
            where: { id: translation.id },
            data: {
              text: word.text,
              note: word.note,
              language: languageSwap.toTranslation,
            },
          })
        }
      }

      await transaction.word.updateMany({
        where: { listId: existingList.id },
        data: { language: parsed.data.language },
      })

      for (const rename of [...retainedRenames, ...replacements]) {
        await transaction.translationWord.updateMany({
          where: {
            language: rename.from,
            word: { listId: existingList.id },
          },
          data: { language: rename.to },
        })
      }

      if (languagesToDelete.length) {
        await transaction.translationWord.deleteMany({
          where: {
            language: { in: languagesToDelete },
            word: { listId: existingList.id },
          },
        })
      }

      await transaction.translationLists.deleteMany({
        where: { listId: existingList.id },
      })

      return transaction.list.update({
        where: { id: existingList.id },
        data: {
          name: parsed.data.name,
          language: parsed.data.language,
          translationLists: {
            create: parsed.data.translations.map((language) => ({ language })),
          },
        },
        select: {
          id: true,
          name: true,
          language: true,
          translationLists: {
            select: { language: true },
          },
        },
      })
    })

    return NextResponse.json({ list })
  } catch (error) {
    if (error instanceof IncompleteLanguageSwapError) {
      return NextResponse.json(
        {
          error:
            "Impossible d’inverser cette liste : au moins un mot n’a pas de traduction dans la nouvelle langue principale.",
        },
        { status: 409 }
      )
    }

    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Chaque langue de traduction doit être unique.' },
        { status: 409 }
      )
    }

    console.error('Unable to update list', error)
    return NextResponse.json(
      { error: 'Impossible de modifier la liste.' },
      { status: 500 }
    )
  }
}
