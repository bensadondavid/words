import { auth } from '@/lib/auth/auth'
import { isPrismaUniqueConstraintError } from '@/lib/database/is-prisma-unique-constraint-error'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateListSchema = z.object({
  id: z.string().min(1),
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

export async function PATCH(request: Request) {
  return withQueryProfile('api:PATCH /api/update-list', () =>
    updateList(request)
  )
}

async function updateList(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = updateListSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Les informations de la liste sont invalides.' },
        { status: 400 }
      )
    }

    const existingList = await prisma.list.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
      select: { id: true },
    })

    if (!existingList) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }

    const list = await prisma.$transaction(async (transaction) => {
      await transaction.translationLists.deleteMany({
        where: { listId: existingList.id },
      })

      return transaction.list.update({
        where: { id: existingList.id },
        data: {
          name: parsed.data.name,
          language: parsed.data.language,
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
    })

    return NextResponse.json({ list })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: 'Chaque langue de traduction doit être unique.' },
        { status: 409 }
      )
    }

    console.error('Unable to update list', error)
    return NextResponse.json(
      { error: 'Impossible de modifier la liste.' },
      { status: 500 }
    )
  }
}
