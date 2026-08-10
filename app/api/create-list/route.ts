import { auth } from '@/lib/auth/auth'
import { isPrismaUniqueConstraintError } from '@/lib/database/is-prisma-unique-constraint-error'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const listSchema = z.object({
  name: z.string().trim().min(1).max(80),
  language: z.string().trim().min(1).max(50),
  translations: z
    .array(z.string().trim().min(1).max(50))
    .min(1)
    .max(10)
    .refine(
      (languages) =>
        new Set(languages.map((language) => language.toLocaleLowerCase())).size ===
        languages.length,
      { message: 'Chaque langue de traduction doit être unique.' }
    ),
})

export async function POST(request: Request) {
  return withQueryProfile('api:POST /api/create-list', () =>
    createList(request)
  )
}

async function createList(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = listSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Les informations de la liste sont invalides.' },
        { status: 400 }
      )
    }

    const list = await prisma.list.create({
      data: {
        name: parsed.data.name,
        language: parsed.data.language,
        userId: session.user.id,
        translationLists: {
          create: parsed.data.translations.map((language) => ({ language })),
        },
      },
      select: {
        id: true,
        name: true,
        language: true,
        translationLists: {
          select: { language: true },
        },
      },
    })

    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Chaque langue de traduction doit être unique.' },
        { status: 409 }
      )
    }

    console.error('Unable to create list', error)
    return NextResponse.json(
      { error: 'Impossible de créer la liste.' },
      { status: 500 }
    )
  }
}
