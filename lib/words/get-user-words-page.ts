import { prisma } from '@/lib/database/prisma'
import type { WordsPageData } from '@/lib/words/types'

export const WORDS_PAGE_SIZE = 50

export async function getUserWordsPage(
  userId: string,
  cursor?: string
): Promise<WordsPageData> {
  const rows = await prisma.word.findMany({
    where: { list: { userId } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: WORDS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      list: { select: { id: true, name: true } },
      translationsWords: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, text: true, language: true },
      },
    },
  })

  const hasMore = rows.length > WORDS_PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, WORDS_PAGE_SIZE) : rows

  return {
    words: pageRows.flatMap((word) =>
      word.list
        ? [
            {
              id: word.id,
              text: word.text,
              language: word.language,
              list: word.list,
              translations: word.translationsWords,
            },
          ]
        : []
    ),
    nextCursor: hasMore ? pageRows.at(-1)?.id ?? null : null,
  }
}
