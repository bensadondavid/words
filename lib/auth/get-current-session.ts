import { cache } from 'react'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth/auth'

export const getCurrentSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)
