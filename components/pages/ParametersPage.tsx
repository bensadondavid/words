'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/auth-client'

type PasskeyToDelete = {
  id: string
  name?: string
}

function getPasskeyRegistrationError(error: {
  code?: string
  status?: number
}) {
  switch (error.code) {
    case 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED':
      return 'Une clé d’accès est déjà enregistrée sur cet appareil.'
    case 'ERROR_CEREMONY_ABORTED':
      return 'La création de la clé d’accès a été annulée.'
    case 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT':
    case 'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT':
    case 'ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG':
    case 'ERROR_AUTHENTICATOR_GENERAL_ERROR':
      return 'Cet appareil ne permet pas de créer cette clé d’accès.'
    case 'ERROR_INVALID_DOMAIN':
    case 'ERROR_INVALID_RP_ID':
      return 'La configuration des clés d’accès est invalide pour ce domaine.'
    default:
      return 'Impossible d’ajouter la clé d’accès. Veuillez réessayer.'
  }
}

export default function ParametersPage() {
  const router = useRouter()
  const session = authClient.useSession()
  const passkeys = authClient.useListPasskeys()
  const [addingPasskey, setAddingPasskey] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [updatingName, setUpdatingName] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [passkeyToDelete, setPasskeyToDelete] =
    useState<PasskeyToDelete | null>(null)

  const user = session.data?.user
  const initials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  const openNameDialog = () => {
    setDisplayName(user?.name ?? '')
    setNameDialogOpen(true)
  }

  const updateDisplayName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = displayName.trim()

    if (name.length < 2) {
      toast.error('Le nom doit contenir au moins 2 caractères.')
      return
    }

    try {
      setUpdatingName(true)
      const { error } = await authClient.updateUser({ name })

      if (error) {
        toast.error(error.message ?? 'Impossible de modifier le nom.')
        return
      }

      await session.refetch()
      router.refresh()
      setNameDialogOpen(false)
      toast.success('Nom mis à jour')
    } catch {
      toast.error('Impossible de modifier le nom.')
    } finally {
      setUpdatingName(false)
    }
  }

  const addPasskey = async () => {
    try {
      setAddingPasskey(true)
      const { error } = await authClient.passkey.addPasskey({
        name: `Clé de ${user?.name ?? 'mon appareil'}`,
        authenticatorAttachment: 'platform',
      })

      if (error) {
        toast.error(getPasskeyRegistrationError(error))
        return
      }

      await passkeys.refetch()
      toast.success('Clé d’accès ajoutée')
    } catch {
      toast.error('Impossible d’ajouter la clé d’accès. Veuillez réessayer.')
    } finally {
      setAddingPasskey(false)
    }
  }

  const deletePasskey = async () => {
    if (!passkeyToDelete) return

    try {
      setDeletingId(passkeyToDelete.id)
      const { error } = await authClient.passkey.deletePasskey({
        id: passkeyToDelete.id,
      })

      if (error) {
        toast.error(error.message ?? 'Impossible de supprimer la clé d’accès.')
        return
      }

      await passkeys.refetch()
      setPasskeyToDelete(null)
      toast.success('Clé d’accès supprimée')
    } finally {
      setDeletingId(null)
    }
  }

  const logOut = async () => {
    try {
      setLoggingOut(true)
      const result = await authClient.signOut()

      if (!result.data?.success) {
        toast.error(result.error?.message ?? 'Impossible de se déconnecter.')
        return
      }

      router.push('/login')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <section className="min-h-screen w-full min-w-0 px-4 py-6 sm:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Paramètres</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gérez votre profil, votre sécurité et votre session.
          </p>
        </header>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-primary" />
                <div>
                  <h2 className="font-semibold">Profil</h2>
                  <p className="text-sm text-muted-foreground">
                    Informations liées à votre compte.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <Avatar className="size-16 shrink-0">
                <AvatarImage src={user?.image ?? ''} alt={user?.name ?? 'Profil'} />
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="break-words text-lg font-semibold">
                  {user?.name ?? 'Utilisateur'}
                </p>
                <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{user?.email ?? 'Chargement...'}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {user?.emailVerified ? (
                  <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                    <ShieldCheck className="size-4" />
                    Email vérifié
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openNameDialog}
                  disabled={session.isPending}
                >
                  <Pencil className="size-4" />
                  Modifier le nom
                </Button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-semibold">Clés d’accès</h2>
                  <p className="text-sm text-muted-foreground">
                    Connectez-vous avec votre appareil sans saisir de mot de passe.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={addPasskey}
                disabled={addingPasskey || session.isPending}
                className="self-start sm:self-auto"
              >
                <KeyRound className="size-4" />
                {addingPasskey ? 'Ajout...' : 'Ajouter une clé'}
              </Button>
            </div>

            <div className="divide-y">
              {passkeys.isPending ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">
                  Chargement des clés d’accès...
                </p>
              ) : passkeys.data && passkeys.data.length > 0 ? (
                passkeys.data.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex min-w-0 items-center gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Laptop className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {passkey.name ?? 'Clé d’accès'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ajoutée le{' '}
                        {new Intl.DateTimeFormat('fr-FR').format(
                          new Date(passkey.createdAt)
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPasskeyToDelete({
                          id: passkey.id,
                          name: passkey.name,
                        })
                      }
                      disabled={deletingId === passkey.id}
                      aria-label={`Supprimer ${passkey.name ?? 'la clé d’accès'}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center sm:px-6">
                  <KeyRound className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">Aucune clé d’accès</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajoutez cet appareil pour une connexion plus rapide.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <LogOut className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <h2 className="font-semibold">Session</h2>
                  <p className="text-sm text-muted-foreground">
                    Fermez votre session sur cet appareil.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={logOut}
                disabled={loggingOut}
                className="self-start sm:self-auto"
              >
                <LogOut className="size-4" />
                {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={nameDialogOpen}
        onOpenChange={(open) => {
          if (!updatingName) setNameDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le nom d’affichage</DialogTitle>
            <DialogDescription>
              Ce nom sera affiché dans votre profil et dans la navigation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateDisplayName} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Nom</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                minLength={2}
                maxLength={80}
                disabled={updatingName}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNameDialogOpen(false)}
                disabled={updatingName}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updatingName}>
                {updatingName ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passkeyToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPasskeyToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la clé d’accès ?</DialogTitle>
            <DialogDescription>
              « {passkeyToDelete?.name ?? 'Clé d’accès'} » ne pourra plus être
              utilisée pour vous connecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasskeyToDelete(null)}
              disabled={deletingId !== null}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deletePasskey}
              disabled={deletingId !== null}
            >
              {deletingId ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
