import { redirect } from 'next/navigation'

import ImportWordsPage, { type ImportList } from '@/components/pages/ImportWordsPage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

type ImportPageProps = {
  searchParams: Promise<{ listId?: string }>
}

export default async function Page({ searchParams }: ImportPageProps) {
  return withQueryProfile('page:/account/import', () =>
    renderPage(searchParams)
  )
}

async function renderPage(searchParams: ImportPageProps['searchParams']) {
  const [session, { listId }] = await Promise.all([
    getCurrentSession(),
    searchParams,
  ])
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
    },
  })

  const lists: ImportList[] = userLists.map((list) => ({
    id: list.id,
    name: list.name,
    language: list.language,
    translationLanguages: list.translationLists.map(({ language }) => language),
  }))

  const initialListId = lists.some((list) => list.id === listId) ? listId : undefined

  return <ImportWordsPage lists={lists} initialListId={initialListId} />
}
