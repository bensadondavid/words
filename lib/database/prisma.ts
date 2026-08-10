import { PrismaClient } from "./prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import 'dotenv/config'

import {
  isQueryProfilingEnabled,
  recordPrismaQuery,
} from './query-profiler'

async function profileQuery<Result>(
  model: string | undefined,
  operation: string,
  query: () => Promise<Result>
) {
  if (!isQueryProfilingEnabled()) return query()

  const startedAt = performance.now()

  try {
    return await query()
  } finally {
    recordPrismaQuery(model, operation, performance.now() - startedAt)
  }
}

const createPrismaClient = () => {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL_POOLER!,
  });
  return new PrismaClient({ adapter }).$extends({
    name: 'development-query-profiler',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return profileQuery(model, operation, () => query(args))
        },
      },
      $queryRaw({ operation, args, query }) {
        return profileQuery(undefined, operation, () => query(args))
      },
      $executeRaw({ operation, args, query }) {
        return profileQuery(undefined, operation, () => query(args))
      },
    },
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
