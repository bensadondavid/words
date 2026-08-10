import { redirect } from 'next/navigation'

import WordsPage from '@/components/pages/WordsPage'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { getUserWordsPage } from '@/lib/words/get-user-words-page'

export default async function Page() {
  return withQueryProfile('page:/account/words', renderPage)
}

async function renderPage() {
  const session = await getCurrentSession()

  if (!session) redirect('/login')

  const initialPage = await getUserWordsPage(session.user.id)
  return <WordsPage initialPage={initialPage} />
}
