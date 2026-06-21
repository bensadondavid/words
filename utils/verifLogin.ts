import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function verifLogin(){

    const h = await headers()
    const session = await auth.api.getSession({
        headers : h
    })
    if(!session){
        redirect('/login')
    }
    return session
}