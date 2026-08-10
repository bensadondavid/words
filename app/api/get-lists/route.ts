import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  return withQueryProfile('api:GET /api/get-lists', () => getLists(request))
}

async function getLists(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
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

    return NextResponse.json({
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        language: list.language,
        translations: list.translationLists.map(({ language }) => language),
        wordCount: list._count.words,
      })),
    })
  } catch (error) {
    console.error('Unable to get lists', error)
    return NextResponse.json(
      { error: 'Impossible de charger les listes.' },
      { status: 500 }
    )
  }
}
