import { redirect } from 'next/navigation'

import GamePage, { type GameList } from '@/components/pages/GamePage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

type GamePageProps = {
  searchParams: Promise<{ list?: string | string[] }>
}

export default async function Page({ searchParams }: GamePageProps) {
  return withQueryProfile('page:/account/test', () => renderPage(searchParams))
}

async function renderPage(searchParams: GamePageProps['searchParams']) {
  const session = await getCurrentSession()

  if (!session) redirect('/login')

  const [query, userLists, officialLists] = await Promise.all([
    searchParams,
    prisma.list.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        language: true,
        translationLists: {
          orderBy: { createdAt: 'asc' },
          select: { language: true },
        },
        _count: { select: { words: true } },
      },
    }),
    prisma.officialList.findMany({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        language: true,
        translationLanguages: {
          orderBy: { createdAt: 'asc' },
          select: { language: true },
        },
        _count: { select: { words: true } },
      },
    }),
  ])

  const lists: GameList[] = [
    ...officialLists.map((list) => ({
      id: list.id,
      source: 'official' as const,
      name: list.name,
      language: list.language,
      translationLanguages: list.translationLanguages.map(
        ({ language }) => language
      ),
      wordCount: list._count.words,
    })),
    ...userLists.map((list) => ({
      id: list.id,
      source: 'personal' as const,
      name: list.name,
      language: list.language,
      translationLanguages: list.translationLists.map(
        ({ language }) => language
      ),
      wordCount: list._count.words,
    })),
  ]
  const initialListKey = typeof query.list === 'string' ? query.list : undefined

  return <GamePage lists={lists} initialListKey={initialListKey} />
}
