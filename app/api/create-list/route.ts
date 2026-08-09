import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const listSchema = z.object({
  name: z.string().trim().min(1).max(80),
  language: z.string().trim().min(1).max(50),
  translations: z
    .array(z.string().trim().min(1).max(50))
    .min(1)
    .max(10),
})

export async function POST(request: Request) {
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
      include: { translationLists: true },
    })

    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    console.error('Unable to create list', error)
    return NextResponse.json(
      { error: 'Impossible de créer la liste.' },
      { status: 500 }
    )
  }
}
