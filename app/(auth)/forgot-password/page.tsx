'use client'

import { authClient } from "@/lib/auth/auth-client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'
import Link from "next/link";

const inputClass = "h-11 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900 transition-colors text-[15px]"

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            const result = await authClient.requestPasswordReset({
                email,
                redirectTo: '/reset-password',
            })
            if (result.error) 
                return toast.error(result.error.message)
                setSent(true)
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

                <div className="relative flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-white/90 font-semibold tracking-tight">Words</span>
                </div>

                <div className="relative space-y-5 max-w-120">
                    <p className="font-serif italic text-white/85 text-[2rem] leading-[1.35] tracking-[-0.01em]">
                        &ldquo;Le langage est la maison de l&apos;être.&rdquo;
                    </p>
                    <p className="text-white/35 text-sm font-light tracking-wide">Martin Heidegger</p>
                </div>

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

                    <div className="flex items-center gap-2 mb-10 lg:hidden">
                        <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="font-semibold text-zinc-900">Words</span>
                    </div>

                    {sent ? (
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" />
                                </svg>
                            </div>
                            <h1 className="text-[1.6rem] font-semibold text-zinc-900 tracking-tight leading-tight">
                                Email envoyé
                            </h1>
                            <p className="text-zinc-500 text-sm font-normal">
                                Si un compte existe pour <span className="text-zinc-700 font-medium">{email}</span>, vous recevrez un lien pour réinitialiser votre mot de passe.
                            </p>
                            <p className="text-zinc-400 text-sm pt-2">
                                Vérifiez aussi vos spams.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block mt-4 text-sm text-zinc-900 font-medium hover:underline underline-offset-4 transition-colors"
                            >
                                ← Retour à la connexion
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-[1.6rem] font-semibold text-zinc-900 tracking-tight leading-tight">
                                    Mot de passe oublié
                                </h1>
                                <p className="text-zinc-500 text-sm mt-1.5 font-normal">
                                    Entrez votre email pour recevoir un lien de réinitialisation.
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

                                <Button
                                    type="submit"
                                    className="w-full h-11 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-medium rounded-lg transition-colors"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Envoi…' : 'Envoyer le lien'}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-zinc-400 mt-7">
                                <Link href="/login" className="text-zinc-900 font-medium hover:underline underline-offset-4 transition-colors">
                                    ← Retour à la connexion
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
