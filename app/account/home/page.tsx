import {auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

export default async function Home(){

    const date = new Date().toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long", year: 'numeric'})
    const session = await auth.api.getSession({
        headers : await headers()
    })

    return(
        <div className='flex flex-col justify-center items-center gap-2 w-screen h-screen'>
            <h1 className='capitalize text-2xl'>{date}</h1>
            <h2 className='text-xl'><span className='text-accent'>Bonjour</span> {session?.user.name}</h2>
        </div>
    )
}