'use client'

import { authClient } from "@/lib/auth/auth-client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const inputClass = "h-11 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900 transition-colors text-[15px]"

export default function SignUp() {
    const [formData, setFormData] = useState({ firstName: "", lastName: "", password: "", email: "" })
    const [confirmationPassword, setConfirmationPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (formData.password !== confirmationPassword) {
            setConfirmationPassword('')
            setFormData((prev) => ({ ...prev, password: '' }))
            return toast.error('Les mots de passe ne correspondent pas')
        }
        try {
            setIsLoading(true)
            const result = await authClient.signUp.email({
                email: formData.email,
                password: formData.password,
                name: `${formData.firstName} ${formData.lastName}`.trim(),
            })
            if (result.error) return toast.error(result.error.message)
            toast.success('Compte créé ! Vérifie ton email pour continuer.')
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
                {/* Subtle gradient orbs */}
                <div className="absolute top-[-15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[10%] left-[25%] w-[300px] h-[300px] rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />

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
                <div className="relative space-y-5 max-w-[480px]">
                    <p className="font-serif italic text-white/85 text-[2rem] leading-[1.35] tracking-[-0.01em]">
                        "Les limites de mon langage sont les limites de mon monde."
                    </p>
                    <p className="text-white/35 text-sm font-light tracking-wide">Ludwig Wittgenstein</p>
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
                <div className="w-full max-w-[360px]">

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
                            Créer un compte
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1.5 font-normal">
                            Commencez à enrichir votre vocabulaire.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Prénom</label>
                            <Input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                placeholder="Yona"
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Nom</label>
                            <Input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                placeholder="Bensadon"
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</label>
                            <Input
                                type="email"
                                name="email"
                                value={formData.email}
                                placeholder="yonabensadon@leplusbeau.fr"
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mot de passe</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    placeholder="8 caractères minimum"
                                    onChange={handleChange}
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
                                    name="passwordConfirmation"
                                    value={confirmationPassword}
                                    onChange={(e) => setConfirmationPassword(e.target.value)}
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
                            className="w-full h-11 mt-2 bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-medium rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Création…' : 'Créer mon compte'}
                        </Button>

                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-zinc-200" />
                        <span className="text-xs text-zinc-400 font-medium">ou</span>
                        <div className="flex-1 h-px bg-zinc-200" />
                    </div>

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

                    <p className="text-center text-sm text-zinc-400 mt-7">
                        Déjà un compte ?{' '}
                        <Link href="/login" className="text-zinc-900 font-medium hover:underline underline-offset-4 transition-colors">
                            Se connecter
                        </Link>
                    </p>

                </div>
            </div>

        </div>
    )
}
