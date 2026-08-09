import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateListSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  language: z.string().trim().min(1).max(50),
  translations: z
    .array(z.string().trim().min(1).max(50))
    .min(1)
    .max(10),
})

export async function PATCH(request: Request) {
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
        include: { translationLists: true },
      })
    })

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Unable to update list', error)
    return NextResponse.json(
      { error: 'Impossible de modifier la liste.' },
      { status: 500 }
    )
  }
}
