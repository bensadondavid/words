import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import ListDetailPage from '@/components/pages/ListDetailPage'
import type { ListDetail, WordSummary } from '@/components/pages/ListDetailPage'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

type ListDetailPageProps = {
  params: Promise<{ listId: string }>
}

export default async function Page({ params }: ListDetailPageProps) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: await headers() }),
  ])

  if (!session) redirect('/login')

  const list = await prisma.list.findFirst({
    where: { id: listId, userId: session.user.id },
    include: {
      translationLists: {
        orderBy: { createdAt: 'asc' },
        select: { language: true },
      },
      words: {
        orderBy: { createdAt: 'desc' },
        include: {
          translationsWords: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!list) notFound()

  const listDetail: ListDetail = {
    id: list.id,
    name: list.name,
    language: list.language,
    translationLanguages: list.translationLists.map(({ language }) => language),
  }

  const initialWords: WordSummary[] = list.words.map((word) => ({
    id: word.id,
    text: word.text,
    language: word.language,
    translations: word.translationsWords.map((translation) => ({
      id: translation.id,
      text: translation.text,
      language: translation.language,
    })),
  }))

  return <ListDetailPage list={listDetail} initialWords={initialWords} />
}
