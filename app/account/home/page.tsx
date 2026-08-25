import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Gamepad2,
  Languages,
  Layers3,
  ListPlus,
} from 'lucide-react'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { prisma } from '@/lib/database/prisma'
import { withQueryProfile } from '@/lib/database/query-profiler'

const DAY_COUNT = 30
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'short',
})

type ActivityPoint = {
  key: string
  label: string
  count: number
}

type ActivityDatabaseRow = {
  key: string
  count: number
}

export default async function HomePage() {
  return withQueryProfile('page:/account/home', renderHomePage)
}

async function renderHomePage() {
  const session = await getCurrentSession()

  if (!session) redirect('/login')

  const today = new Date()

  const [lists, recentWords, activityRows] = await Promise.all([
    prisma.list.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        language: true,
        updatedAt: true,
        translationLists: { select: { language: true } },
        _count: { select: { words: true } },
      },
    }),
    prisma.word.findMany({
      where: { list: { userId: session.user.id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        text: true,
        language: true,
        list: { select: { id: true, name: true } },
        translationsWords: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, language: true },
        },
      },
    }),
    prisma.$queryRaw<ActivityDatabaseRow[]>`
      SELECT
        TO_CHAR(
          (word."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jerusalem',
          'YYYY-MM-DD'
        ) AS "key",
        COUNT(*)::integer AS "count"
      FROM "Word" AS word
      INNER JOIN "List" AS list ON list."id" = word."listId"
      WHERE list."userId" = ${session.user.id}
        AND (
          (word."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jerusalem'
        ) >= (
          CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
        )::date - (${DAY_COUNT - 1} * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1
    `,
  ])

  const totalWords = lists.reduce((total, list) => total + list._count.words, 0)
  const languageCount = new Set(
    lists.flatMap((list) => [
      list.language,
      ...list.translationLists.map(({ language }) => language),
    ])
  ).size
  const activityCounts = new Map(
    activityRows.map(({ key, count }) => [key, count])
  )

  const [todayYear, todayMonth, todayDay] = dateKeyFormatter
    .format(today)
    .split('-')
    .map(Number)
  const activityStart = new Date(
    Date.UTC(todayYear, todayMonth - 1, todayDay - (DAY_COUNT - 1), 12)
  )

  const activity: ActivityPoint[] = Array.from(
    { length: DAY_COUNT },
    (_, index) => {
      const date = new Date(activityStart)
      date.setUTCDate(activityStart.getUTCDate() + index)
      const key = date.toISOString().slice(0, 10)
      return {
        key,
        label: shortDateFormatter.format(date),
        count: activityCounts.get(key) ?? 0,
      }
    }
  )
  const distribution = [...lists]
    .sort((first, second) => second._count.words - first._count.words)
    .slice(0, 5)

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today)

  return (
    <section className="min-h-screen w-full min-w-0 px-4 py-6 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-2xl bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-9">
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="capitalize text-sm text-primary-foreground/75">
                {formattedDate}
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Bonjour, {session.user.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
                Continuez à enrichir votre vocabulaire, un mot à la fois.
              </p>
            </div>
            <Button asChild variant="secondary" size="lg" className="self-start">
              <Link href="/account/words">
                Voir tous mes mots
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="absolute -right-12 -top-16 size-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-32 size-48 rounded-full bg-white/5" />
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Layers3 className="size-5" />}
            label="Listes"
            value={lists.length}
          />
          <StatCard
            icon={<BookOpen className="size-5" />}
            label="Mots"
            value={totalWords}
          />
          <StatCard
            icon={<Languages className="size-5" />}
            label="Langues"
            value={languageCount}
          />
          <StatCard
            icon={<Clock3 className="size-5" />}
            label="Dernière liste"
            value={lists[0]?.name ?? 'Aucune'}
            compact
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section className="min-w-0 rounded-xl border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="font-semibold">Mots ajoutés</h2>
              <p className="text-sm text-muted-foreground">
                Votre activité durant les 30 derniers jours.
              </p>
            </div>
            <ActivityChart points={activity} />
          </section>

          <section className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="font-semibold">Répartition par liste</h2>
              <p className="text-sm text-muted-foreground">
                Vos cinq listes les plus remplies.
              </p>
            </div>
            <DistributionChart lists={distribution} />
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border bg-card">
            <SectionHeader
              title="Listes récentes"
              description="Reprenez rapidement là où vous vous êtes arrêté."
              href="/account/lists"
            />
            {lists.length > 0 ? (
              <div className="divide-y">
                {lists.slice(0, 3).map((list) => (
                  <Link
                    key={list.id}
                    href={`/account/lists/${list.id}`}
                    className="flex min-w-0 items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium capitalize">{list.name}</p>
                      <p className="truncate text-sm text-muted-foreground capitalize">
                        {list.language} · {list.translationLists.map(({ language }) => language).join(', ')}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {list._count.words} {list._count.words > 1 ? 'mots' : 'mot'}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptySection
                text="Créez votre première liste pour commencer."
                href="/account/lists"
                action="Créer une liste"
              />
            )}
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <SectionHeader
              title="Derniers mots"
              description="Les mots ajoutés le plus récemment."
              href="/account/words"
            />
            {recentWords.length > 0 ? (
              <div className="divide-y">
                {recentWords.map((word) => (
                  <div
                    key={word.id}
                    className="flex min-w-0 items-start gap-4 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0 flex-1 capitalize">
                      <p className="break-words font-medium text-primary">{word.text}</p>
                      <p className="mt-0.5 break-words text-sm text-muted-foreground">
                        {word.translationsWords
                          .map((translation) => translation.text)
                          .join(' · ')}
                      </p>
                    </div>
                    {word.list ? (
                      <Link
                        href={`/account/lists/${word.list.id}`}
                        className="max-w-32 shrink-0 truncate text-xs text-muted-foreground hover:text-primary"
                      >
                        {word.list.name}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                text="Les mots que vous ajoutez apparaîtront ici."
                href="/account/lists"
                action="Voir mes listes"
              />
            )}
          </section>
        </div>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Actions rapides</h2>
            <p className="text-sm text-muted-foreground">
              Lancez une partie ou gérez votre vocabulaire.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/account/test">
                <Gamepad2 className="size-4" />
                Jouer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/lists">
                <ListPlus className="size-4" />
                Gérer mes listes
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/words">
                <BookOpen className="size-4" />
                Tous mes mots
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </section>
  )
}

function StatCard({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  compact?: boolean
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={compact ? 'truncate text-lg font-semibold' : 'text-2xl font-bold'}>
          {value}
        </p>
      </div>
    </div>
  )
}

function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const width = 900
  const height = 220
  const left = 34
  const top = 14
  const bottom = 34
  const plotHeight = height - top - bottom
  const plotWidth = width - left - 8
  const slotWidth = plotWidth / points.length
  const barWidth = Math.max(8, slotWidth * 0.58)
  const maxValue = Math.max(1, ...points.map(({ count }) => count))

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Histogramme des mots ajoutés pendant les 30 derniers jours"
        className="h-auto w-full min-w-150"
      >
        <title>Mots ajoutés pendant les 30 derniers jours</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + plotHeight * ratio
          const value = Math.round(maxValue * (1 - ratio))
          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted-foreground)"
              >
                {value}
              </text>
            </g>
          )
        })}
        {points.map((point, index) => {
          const barHeight = (point.count / maxValue) * plotHeight
          const x = left + index * slotWidth + (slotWidth - barWidth) / 2
          const y = top + plotHeight - barHeight
          const showLabel = index % 5 === 0 || index === points.length - 1
          const tooltip = `${point.label} : ${point.count} ${point.count > 1 ? 'mots' : 'mot'}`
          return (
            <g key={point.key}>
              <title>{tooltip}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(point.count > 0 ? 3 : 0, barHeight)}
                rx="4"
                fill="var(--primary)"
              />
              {showLabel ? (
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function DistributionChart({
  lists,
}: {
  lists: Array<{ id: string; name: string; _count: { words: number } }>
}) {
  const maxWords = Math.max(1, ...lists.map((list) => list._count.words))

  if (lists.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée à afficher.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {lists.map((list) => (
        <div key={list.id}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate capitalize">{list.name}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {list._count.words}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(list._count.words / maxWords) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>Tout voir</Link>
      </Button>
    </div>
  )
}

function EmptySection({
  text,
  href,
  action,
}: {
  text: string
  href: string
  action: string
}) {
  return (
    <div className="px-5 py-10 text-center sm:px-6">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  )
}
