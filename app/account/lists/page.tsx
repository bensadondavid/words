import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import ListsPage from '@/components/pages/ListsPage'
import type { ListSummary } from '@/components/pages/ListsPage'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      translationLists: {
        orderBy: { createdAt: 'asc' },
        select: { language: true },
      },
      _count: { select: { words: true } },
    },
  })

  const initialLists: ListSummary[] = lists.map((list) => ({
    id: list.id,
    name: list.name,
    language: list.language,
    translations: list.translationLists.map(({ language }) => language),
    wordCount: list._count.words,
  }))

  return <ListsPage initialLists={initialLists} />
}
