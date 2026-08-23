import { redirect } from 'next/navigation'

import LibraryPage from '@/components/pages/LibraryPage'
import type {
  OfficialListSummary,
  SourceListSummary,
} from '@/components/pages/LibraryPage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

export default async function Page() {
  return withQueryProfile('page:/account/library', renderPage)
}

async function renderPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/login')

  const [officialLists, user] = await Promise.all([
    prisma.officialList.findMany({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        language: true,
        translationLanguages: {
          orderBy: { createdAt: 'asc' },
          select: { language: true },
        },
        _count: { select: { words: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  ])

  const isAdmin = user?.role === 'ADMIN'
  const sourceLists = isAdmin
    ? await prisma.list.findMany({
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
    : []

  const initialOfficialLists: OfficialListSummary[] = officialLists.map(
    (list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      language: list.language,
      translationLanguages: list.translationLanguages.map(
        ({ language }) => language
      ),
      wordCount: list._count.words,
    })
  )
  const initialSourceLists: SourceListSummary[] = sourceLists.map((list) => ({
    id: list.id,
    name: list.name,
    language: list.language,
    translationLanguages: list.translationLists.map(({ language }) => language),
    wordCount: list._count.words,
  }))

  return (
    <LibraryPage
      officialLists={initialOfficialLists}
      sourceLists={initialSourceLists}
      isAdmin={isAdmin}
    />
  )
}
