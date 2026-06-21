import { redirect } from "next/navigation"
import verifLogin from "@/utils/verifLogin"

export default async function Home() {
        await verifLogin()
        redirect('/account')
}
