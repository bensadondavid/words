'use client'

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/auth-client';
import {toast} from 'sonner'
import { useRouter } from 'next/navigation' 
import { Trash2 } from 'lucide-react';

export default function ParametersPage (){

const router = useRouter()

const session = authClient.useSession()

const addPasskey = async ()=>{
      const { data, error } =  await authClient.passkey.addPasskey({
      name: `Passkey de ${session.data?.user.name}`,
      authenticatorAttachment: "platform",
      });
      if(error){
        toast.error(error.message)
      }
      toast.success('Passkey créée')
      console.log(data)
  }

  const deletePasskey = async(id: string) =>{
    const { error} = await authClient.passkey.deletePasskey({id})
    if(error){
        toast.error(error.message)
    }
    toast.success('Passkey supprimée')
  }

  const passkeys = authClient.useListPasskeys()

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
        
            {passkeys.data?.map((p)=>(
                <div className='flex flex-row items-center gap-2' key={p.id}>
                    <p>{p.name} : </p>
                    <Button className='group bg-transparent border-red-600 hover:bg-red-600' onClick={()=>deletePasskey(p.id)}><Trash2 className='text-red-600 group-hover:text-white' /></Button>
                </div>
            ))}
    </div>
  )
}
