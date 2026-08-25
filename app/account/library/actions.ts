'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

const publishSchema = z.object({
  sourceListId: z.string().min(1),
  description: z.string().trim().max(500).optional(),
})

const deleteSchema = z.object({
  officialListId: z.string().min(1),
})

async function getAdminUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const admin = await prisma.user.findFirst({
    where: { id: session.user.id, role: 'ADMIN' },
    select: { id: true },
  })

  return admin?.id ?? null
}

export async function publishOfficialList(input: unknown) {
  return withQueryProfile('action:publishOfficialList', () =>
    runPublishOfficialList(input)
  )
}

async function runPublishOfficialList(input: unknown) {
  const adminUserId = await getAdminUserId()
  if (!adminUserId) return { error: 'Action réservée aux administrateurs.' }

  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) return { error: 'Les informations sont invalides.' }

  try {
    const sourceList = await prisma.list.findFirst({
      where: { id: parsed.data.sourceListId, userId: adminUserId },
      select: {
        name: true,
        language: true,
        translationLists: {
          orderBy: { createdAt: 'asc' },
          select: { language: true, note: true },
        },
        words: {
          orderBy: { createdAt: 'asc' },
          select: {
            text: true,
            language: true,
            note: true,
            translationsWords: {
              orderBy: { createdAt: 'asc' },
              select: { text: true, language: true, note: true },
            },
          },
        },
      },
    })

    if (!sourceList) return { error: 'Liste source introuvable.' }
    if (!sourceList.words.length) return { error: 'La liste source est vide.' }
    if (!sourceList.translationLists.length) {
      return { error: 'La liste source ne possède aucune langue de traduction.' }
    }

    const officialList = await prisma.officialList.create({
      data: {
        name: sourceList.name,
        description: parsed.data.description || null,
        language: sourceList.language,
        published: true,
        translationLanguages: {
          create: sourceList.translationLists.map((translation) => ({
            language: translation.language,
            note: translation.note,
          })),
        },
        words: {
          create: sourceList.words.map((word) => ({
            text: word.text,
            language: word.language,
            note: word.note,
            translations: {
              create: word.translationsWords.map((translation) => ({
                text: translation.text,
                language: translation.language,
                note: translation.note,
              })),
            },
          })),
        },
      },
      select: { id: true },
    })

    revalidatePath('/account/library')
    revalidatePath('/account/test')

    return { success: true, officialListId: officialList.id }
  } catch (error) {
    console.error('Unable to publish official list', error)
    return { error: 'Impossible de publier cette liste.' }
  }
}

export async function deleteOfficialList(input: unknown) {
  return withQueryProfile('action:deleteOfficialList', () =>
    runDeleteOfficialList(input)
  )
}

async function runDeleteOfficialList(input: unknown) {
  const adminUserId = await getAdminUserId()
  if (!adminUserId) return { error: 'Action réservée aux administrateurs.' }

  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) return { error: 'Identifiant invalide.' }

  try {
    const deleted = await prisma.officialList.deleteMany({
      where: { id: parsed.data.officialListId },
    })

    if (!deleted.count) return { error: 'Liste officielle introuvable.' }

    revalidatePath('/account/library')
    revalidatePath('/account/test')

    return { success: true }
  } catch (error) {
    console.error('Unable to delete official list', error)
    return { error: 'Impossible de supprimer cette liste officielle.' }
  }
}
