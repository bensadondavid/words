import { prisma } from '@/lib/database/prisma'

export const LIST_WORDS_PAGE_SIZE = 50

export async function getOwnedListWordsPage(
  listId: string,
  userId: string,
  cursor?: string
) {
  const list = await prisma.list.findFirst({
    where: { id: listId, userId },
    select: {
      id: true,
      name: true,
      language: true,
      translationLists: {
        orderBy: { createdAt: 'asc' },
        select: { language: true },
      },
      _count: { select: { words: true } },
      words: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: LIST_WORDS_PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          text: true,
          language: true,
          translationsWords: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, text: true, language: true },
          },
        },
      },
    },
  })

  if (!list) return null

  const hasMore = list.words.length > LIST_WORDS_PAGE_SIZE
  const pageWords = hasMore
    ? list.words.slice(0, LIST_WORDS_PAGE_SIZE)
    : list.words

  return {
    list: {
      id: list.id,
      name: list.name,
      language: list.language,
      translationLanguages: list.translationLists.map(({ language }) => language),
      wordCount: list._count.words,
    },
    words: pageWords.map((word) => ({
      id: word.id,
      text: word.text,
      language: word.language,
      translations: word.translationsWords,
    })),
    nextCursor: hasMore ? pageWords.at(-1)?.id ?? null : null,
  }
}
