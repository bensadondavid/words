import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { getUserWordsPage } from '@/lib/words/get-user-words-page'

export async function GET(request: Request) {
  return withQueryProfile('api:GET /api/words', () => getWords(request))
}

async function getWords(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined
    const page = await getUserWordsPage(session.user.id, cursor)
    return NextResponse.json(page)
  } catch (error) {
    console.error('Unable to get words', error)
    return NextResponse.json(
      { error: 'Impossible de charger les mots.' },
      { status: 500 }
    )
  }
}
