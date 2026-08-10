import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const deleteListSchema = z.object({ id: z.string().min(1) })

export async function DELETE(request: Request) {
  return withQueryProfile('api:DELETE /api/delete-list', () =>
    deleteList(request)
  )
}

async function deleteList(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const parsed = deleteListSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
    }

    const deletedList = await prisma.list.deleteMany({
      where: { id: parsed.data.id, userId: session.user.id },
    })

    if (deletedList.count === 0) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unable to delete list', error)
    return NextResponse.json(
      { error: 'Impossible de supprimer la liste.' },
      { status: 500 }
    )
  }
}
