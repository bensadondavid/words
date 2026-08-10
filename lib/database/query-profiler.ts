import { AsyncLocalStorage } from 'node:async_hooks'

const SLOW_QUERY_THRESHOLD_MS = 200

type SlowQuery = {
  model: string
  operation: string
  durationMs: number
}

type QueryProfile = {
  label: string
  startedAt: number
  queryCount: number
  queryDurationMs: number
  slowQueries: SlowQuery[]
}

const queryProfileStorage = new AsyncLocalStorage<QueryProfile>()

export function isQueryProfilingEnabled() {
  return process.env.NODE_ENV === 'development'
}

export function recordPrismaQuery(
  model: string | undefined,
  operation: string,
  durationMs: number
) {
  if (!isQueryProfilingEnabled()) return

  const roundedDuration = Math.round(durationMs * 100) / 100
  const query = {
    model: model ?? 'raw',
    operation,
    durationMs: roundedDuration,
  }
  const profile = queryProfileStorage.getStore()

  if (!profile) {
    if (roundedDuration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'prisma.slow_query',
          scope: 'unscoped',
          thresholdMs: SLOW_QUERY_THRESHOLD_MS,
          ...query,
        })
      )
    }
    return
  }

  profile.queryCount += 1
  profile.queryDurationMs += durationMs

  if (roundedDuration >= SLOW_QUERY_THRESHOLD_MS) {
    profile.slowQueries.push(query)
  }
}

export async function withQueryProfile<Result>(
  label: string,
  operation: () => Promise<Result>
) {
  if (!isQueryProfilingEnabled() || queryProfileStorage.getStore()) {
    return operation()
  }

  const profile: QueryProfile = {
    label,
    startedAt: performance.now(),
    queryCount: 0,
    queryDurationMs: 0,
    slowQueries: [],
  }

  return queryProfileStorage.run(profile, async () => {
    try {
      return await operation()
    } finally {
      const durationMs = performance.now() - profile.startedAt
      const log = {
        level: profile.slowQueries.length ? 'warn' : 'info',
        event: 'prisma.profile',
        scope: profile.label,
        durationMs: Math.round(durationMs * 100) / 100,
        queryCount: profile.queryCount,
        queryDurationMs:
          Math.round(profile.queryDurationMs * 100) / 100,
        slowQueryThresholdMs: SLOW_QUERY_THRESHOLD_MS,
        slowQueries: profile.slowQueries,
      }

      if (profile.slowQueries.length) {
        console.warn(JSON.stringify(log))
      } else {
        console.info(JSON.stringify(log))
      }
    }
  })
}
