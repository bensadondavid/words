import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../lib/database/prisma';
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest){

    const session = await auth.api.getSession({
        headers : await headers()
    })
    if(!session){
        return NextResponse.json({error : 'Pas de user connecté'}, {status: 401})
    }

    const formList = await req.json()
    const { name, language, translations} = formList

    try{
        const newList = await prisma.list.create({
            data: {
                name,
                language,
                userId : session.user.id,
                translationLists : {
                    create: translations.map((translation : string)=>({
                        language : translation
                    }))
                }
            }
        })
        return NextResponse.json({message : "List créée", newList})
    }
    catch(error){
        return NextResponse.json({error : error})
    }
}