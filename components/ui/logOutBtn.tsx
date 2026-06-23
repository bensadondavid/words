'use client'

import { authClient } from "@/lib/auth/auth-client"
import { Button } from "./button"
import { useRouter } from "next/navigation"

export const LogOutBtn = ()=>{

    const router = useRouter()

    const signOut = ()=> {
        authClient.signOut()
        router.push('/login')
    }

    return <Button onClick={signOut}>Se déconnecter</Button>
}