import { notFound, redirect } from 'next/navigation'

import ListDetailPage from '@/components/pages/ListDetailPage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { getOwnedListWordsPage } from '@/lib/words/get-owned-list-words-page'

type ListDetailPageProps = {
  params: Promise<{ listId: string }>
}

export default async function Page({ params }: ListDetailPageProps) {
  return withQueryProfile('page:/account/lists/[listId]', () =>
    renderPage(params)
  )
}

async function renderPage(params: ListDetailPageProps['params']) {
  const [{ listId }, session] = await Promise.all([
    params,
    getCurrentSession(),
  ])

  if (!session) redirect('/login')

  const page = await getOwnedListWordsPage(listId, session.user.id)

  if (!page) notFound()

  return (
    <ListDetailPage
      list={page.list}
      initialWords={page.words}
      initialNextCursor={page.nextCursor}
    />
  )
}
