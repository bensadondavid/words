import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../database/prisma";
import { passkey } from "@better-auth/passkey"
import { resend } from "../mail/resend";

const HTML_CHARACTERS = /[&<>'"]/g
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}

function escapeHtml(value: string) {
  return value.replace(HTML_CHARACTERS, (character) => HTML_ENTITIES[character])
}

function getEmailSender() {
  const sender = process.env.RESEND_MAIL

  if (sender) return sender
  if (process.env.NODE_ENV !== 'production') return 'onboarding@resend.dev'

  throw new Error('RESEND_MAIL doit être configuré en production.')
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    "http://localhost:3001",
    process.env.BETTER_AUTH_URL!,
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 120,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async({user, url})=>{
      const safeName = escapeHtml(user.name ?? '')
      const safeUrl = escapeHtml(url)
      const { error } = await resend.emails.send({
        from: getEmailSender(),
        to: user.email,
        subject: 'Réinitialisation de mot de passe', 
        html: `
        <p>Salut ${safeName}, </p>
        <p>Clique ici pour réinitialiser ton mot de passe : </p>
        <a href="${safeUrl}">Réinitialiser mon mot de passe </a>
        `,
        text: `Salut ${user.name ?? ''},\n\nRéinitialise ton mot de passe : ${url}`,
      })

      if (error) throw new Error(`Échec de l’envoi de l’email : ${error.message}`)
    }
  },

  emailVerification:{
    sendOnSignUp: true,
    autoSignInAfterVerification: true, 
    sendVerificationEmail: async({user, url})=>{
      const safeName = escapeHtml(user.name ?? '')
      const safeUrl = escapeHtml(url)
      const { error } = await resend.emails.send({
        from: getEmailSender(),
        to: user.email,
        subject: "Vérifie ton email",
        html: `
          <p>Salut ${safeName},</p>
          <p>Clique ici pour vérifier ton email :</p>
          <a href="${safeUrl}">Vérifier mon email</a>`,
        text: `Salut ${user.name ?? ''},\n\nVérifie ton email : ${url}`,
      })

      if (error) throw new Error(`Échec de l’envoi de l’email : ${error.message}`)
      }
  },

  advanced:{
    cookiePrefix: 'words'
  },

  socialProviders:{
    google:{
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24,     // 1 jour
  },
  plugins: [
    passkey(),
  ],
});
