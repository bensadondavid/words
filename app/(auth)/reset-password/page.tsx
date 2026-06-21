'use client'

import { authClient } from "@/lib/auth/auth-client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const inputClass = "h-11 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900 transition-colors text-[15px]"

export default function ResetPassword() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token') ?? ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setConfirmPassword('')
            return toast.error('Les mots de passe ne correspondent pas')
        }
        if (!token) {
            return toast.error('Lien invalide ou expiré')
        }
        try {
            setIsLoading(true)
            const result = await authClient.resetPassword({ newPassword: password, token })
            if (result.error) return toast.error(result.error.message)
            toast.success('Mot de passe mis à jour !')
            setTimeout(() => router.push('/login'), 800)
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
                        &ldquo;Les mots sont, bien sûr, la drogue la plus puissante utilisée par l&apos;humanité.&rdquo;
                    </p>
                    <p className="text-white/35 text-sm font-light tracking-wide">Rudyard Kipling</p>
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

                    {!token ? (
                        <div className="space-y-4">
                            <h1 className="text-[1.6rem] font-semibold text-zinc-900 tracking-tight leading-tight">
                                Lien invalide
                            </h1>
                            <p className="text-zinc-500 text-sm font-normal">
                                Ce lien de réinitialisation est invalide ou a expiré.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-block mt-4 text-sm text-zinc-900 font-medium hover:underline underline-offset-4 transition-colors"
                            >
                                Demander un nouveau lien
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-[1.6rem] font-semibold text-zinc-900 tracking-tight leading-tight">
                                    Nouveau mot de passe
                                </h1>
                                <p className="text-zinc-500 text-sm mt-1.5 font-normal">
                                    Choisissez un mot de passe d&apos;au moins 8 caractères.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Nouveau mot de passe</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="8 caractères minimum"
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

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Confirmation</label>
                                    <div className="relative">
                                        <Input
                                            type={showConfirm ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`${inputClass} pr-11`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-medium rounded-lg transition-colors"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Mise à jour…' : 'Réinitialiser'}
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
