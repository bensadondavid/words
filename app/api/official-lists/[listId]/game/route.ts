import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

type GameWordsRouteContext = {
  params: Promise<{ listId: string }>
}

export async function GET(request: Request, { params }: GameWordsRouteContext) {
  return withQueryProfile('api:GET /api/official-lists/[listId]/game', () =>
    getGameWords(request, params)
  )
}

async function getGameWords(
  request: Request,
  params: GameWordsRouteContext['params']
) {
  const [{ listId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: request.headers }),
  ])

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const language = new URL(request.url).searchParams.get('language')?.trim()
  if (!language || language.length > 50) {
    return NextResponse.json({ error: 'Langue invalide.' }, { status: 400 })
  }

  try {
    const list = await prisma.officialList.findFirst({
      where: {
        id: listId,
        published: true,
        translationLanguages: { some: { language } },
      },
      select: {
        words: {
          where: { translations: { some: { language } } },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            text: true,
            note: true,
            translations: {
              where: { language },
              orderBy: { createdAt: 'asc' },
              select: { text: true, language: true, note: true },
            },
          },
        },
      },
    })

    if (!list) {
      return NextResponse.json(
        { error: 'Liste officielle ou langue de traduction introuvable.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { words: list.words },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('Unable to load official game words', error)
    return NextResponse.json(
      { error: 'Impossible de charger les mots de la partie.' },
      { status: 500 }
    )
  }
}
