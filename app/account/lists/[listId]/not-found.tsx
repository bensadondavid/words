import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function ListNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Liste introuvable</h1>
        <p className="mt-2 text-muted-foreground">
          Cette liste n’existe pas ou ne vous appartient pas.
        </p>
        <Button asChild className="mt-6">
          <Link href="/account/lists">Retour aux listes</Link>
        </Button>
      </div>
    </main>
  )
}
