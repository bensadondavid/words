'use client'

import { Button } from '@/components/ui/button';
import { authClient } from '../../../lib/auth/auth-client';
import { useRouter } from 'next/navigation';
import {toast} from 'sonner'

export default function Parameters() {

  const router = useRouter()

    const addPasskey = async ()=>{
        const { data, error } =  await authClient.passkey.addPasskey({
        name: "example-passkey-name",
        authenticatorAttachment: "platform",
        });
    }

    const logOut = async()=>{
      const result = await authClient.signOut()
      if(!result.data?.success){
        return toast.error(result.error?.message)
      }
      router.push('/login')
    }

  return (
    <div>
      <Button onClick={addPasskey}>Ajouter une clé</Button>
      <Button onClick={logOut}>Deconnexion</Button>
    </div>
  )
}
