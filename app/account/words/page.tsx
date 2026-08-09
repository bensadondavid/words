import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import WordsPage from '@/components/pages/WordsPage'
import { auth } from '@/lib/auth/auth'
import { getUserWordsPage } from '@/lib/words/get-user-words-page'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')

  const initialPage = await getUserWordsPage(session.user.id)
  return <WordsPage initialPage={initialPage} />
}
