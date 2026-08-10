import { redirect } from 'next/navigation'

import GamePage, { type GameList } from '@/components/pages/GamePage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

export default async function Page() {
  return withQueryProfile('page:/account/game', renderPage)
}

async function renderPage() {
  const session = await getCurrentSession()

  if (!session) redirect('/login')

  const userLists = await prisma.list.findMany({
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
  })

  const lists: GameList[] = userLists.map((list) => ({
    id: list.id,
    name: list.name,
    language: list.language,
    translationLanguages: list.translationLists.map(({ language }) => language),
    wordCount: list._count.words,
  }))

  return <GamePage lists={lists} />
}
