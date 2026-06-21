'use client'

import { authClient } from "@/lib/auth/auth-client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import Link from "next/link";

const inputClass = "h-11 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900 transition-colors text-[15px]"

export default function Login() {
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)

    const handleGoogle = async () => {
        try {
            setIsGoogleLoading(true)
            await authClient.signIn.social({ provider: "google", callbackURL: "/account" })
        } catch {
            toast.error('Erreur avec Google')
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handlePasskey = async () => {
        try {
            setIsPasskeyLoading(true)
            const result = await authClient.signIn.passkey()
            if (result?.error) return toast.error(result.error.message)
            toast.success('Connecté !')
            router.push('/account')
        } catch {
            toast.error('Erreur avec le passkey')
        } finally {
            setIsPasskeyLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            const result = await authClient.signIn.email({ email, password })
            if (result.error) return toast.error(result.error.message)
            toast.success('Connecté !')
            setTimeout(() => router.push('/account'), 800)
        } catch {
            toast.error('Une erreur est survenue')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">

            {/* Left panel */}
            <div className="hidden lg:flex lg:w-[55%] bg-[#0d1117] flex-col justify-between p-14 select-none">
                <div className="absolute top-[-15%] left-[10%] w-100 h-100 rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[10%] left-[25%] w-75 h-75 rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />

                {/* Logo */}
                <div className="relative flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-white/90 font-semibold tracking-tight">Words</span>
                </div>

                {/* Quote */}
                <div className="relative space-y-5 max-w-120">
                    <p className="font-serif italic text-white/85 text-[2rem] leading-[1.35] tracking-[-0.01em]">
                        "Une langue différente est une vision différente de la vie."
                    </p>
                    <p className="text-white/35 text-sm font-light tracking-wide">Federico Fellini</p>
                </div>

                {/* Stats */}
                <div className="relative flex items-center gap-10">
                    <div>
                        <p className="text-white font-semibold text-2xl tracking-tight">5</p>
                        <p className="text-white/35 text-xs mt-1 font-light tracking-wide uppercase">mots par jour</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                        <p className="text-white font-semibold text-2xl tracking-tight">1 825</p>
                        <p className="text-white/35 text-xs mt-1 font-light tracking-wide uppercase">mots par an</p>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center bg-zinc-50 px-8 py-16">
                <div className="w-full max-w-90">

                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-10 lg:hidden">
                        <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="font-semibold text-zinc-900">Words</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-[1.6rem] font-semibold text-zinc-900 tracking-tight leading-tight">
                            Bon retour
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1.5 font-normal">
                            Connectez-vous pour continuer.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="yonabensadon@leplusbeau.fr"
                                className={inputClass}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mot de passe</label>
                                <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`${inputClass} pr-11`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-medium rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Connexion…' : 'Se connecter'}
                        </Button>

                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-zinc-200" />
                        <span className="text-xs text-zinc-400 font-medium">ou</span>
                        <div className="flex-1 h-px bg-zinc-200" />
                    </div>

                    <div className="space-y-2.5">
                        <button
                            onClick={handleGoogle}
                            disabled={isGoogleLoading}
                            className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-zinc-200 rounded-lg text-zinc-700 text-[15px] font-medium hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-60"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {isGoogleLoading ? 'Redirection…' : 'Continuer avec Google'}
                        </button>

                        <button
                            onClick={handlePasskey}
                            disabled={isPasskeyLoading}
                            className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-zinc-200 rounded-lg text-zinc-700 text-[15px] font-medium hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-60"
                        >
                            <Fingerprint className="w-4.5 h-4.5 text-zinc-500" />
                            {isPasskeyLoading ? 'Vérification…' : 'Continuer avec un passkey'}
                        </button>
                    </div>

                    <p className="text-center text-sm text-zinc-400 mt-7">
                        Pas encore de compte ?{' '}
                        <Link href="/sign-up" className="text-zinc-900 font-medium hover:underline underline-offset-4 transition-colors">
                            S'enregistrer
                        </Link>
                    </p>

                </div>
            </div>

        </div>
    )
}
