import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../database/prisma";
import { passkey } from "@better-auth/passkey"
import { resend } from "../mail/resend";

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
    sendResetPassword: async({user, url})=>{
      await resend.emails.send({
        from: process.env.RESEND_MAIL || "onboarding@resend.dev",
        to: user.email,
        subject: 'Réinitialisation de mot de passe', 
        html: `
        <p>Salut ${user.name ?? ""}, </p>
        <p>Clique ici pour réinitialiser ton mot de passe : </p>
        <a href="${url}">Réinitialiser mon mot de passe </a> 
        `
      })
    }
  },

  emailVerification:{
    sendOnSignUp: true,
    autoSignInAfterVerification: true, 
    sendVerificationEmail: async({user, url})=>{
      await resend.emails.send({
       from: process.env.RESEND_MAIL || "onboarding@resend.dev",
        to: user.email,
        subject: "Vérifie ton email",
        html: `
          <p>Salut ${user.name ?? ""},</p>
          <p>Clique ici pour vérifier ton email :</p>
          <a href="${url}">Vérifier mon email</a>`,
        })
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

