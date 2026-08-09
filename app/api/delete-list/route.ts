import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const deleteListSchema = z.object({ id: z.string().min(1) })

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = deleteListSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
    }

    const list = await prisma.list.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
      select: { id: true },
    })

    if (!list) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.translationWord.deleteMany({
        where: { word: { listId: list.id } },
      })
      await transaction.word.deleteMany({ where: { listId: list.id } })
      await transaction.translationLists.deleteMany({ where: { listId: list.id } })
      await transaction.list.delete({ where: { id: list.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unable to delete list', error)
    return NextResponse.json(
      { error: 'Impossible de supprimer la liste.' },
      { status: 500 }
    )
  }
}
