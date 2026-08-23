'use client'

import { Volume2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

let activeUtterance: SpeechSynthesisUtterance | null = null

const LANGUAGE_TAGS: Record<string, string> = {
  allemand: 'de-DE',
  allemandes: 'de-DE',
  anglais: 'en-US',
  arabe: 'ar-SA',
  chinois: 'zh-CN',
  coreen: 'ko-KR',
  danois: 'da-DK',
  espagnol: 'es-ES',
  finnois: 'fi-FI',
  francais: 'fr-FR',
  grec: 'el-GR',
  hebreu: 'he-IL',
  hindi: 'hi-IN',
  hongrois: 'hu-HU',
  italien: 'it-IT',
  japonais: 'ja-JP',
  neerlandais: 'nl-NL',
  norvegien: 'nb-NO',
  polonais: 'pl-PL',
  portugais: 'pt-PT',
  roumain: 'ro-RO',
  russe: 'ru-RU',
  suedois: 'sv-SE',
  tcheque: 'cs-CZ',
  turc: 'tr-TR',
  ukrainien: 'uk-UA',
  yiddish: 'yi',
  arabic: 'ar-SA',
  chinese: 'zh-CN',
  dutch: 'nl-NL',
  english: 'en-US',
  french: 'fr-FR',
  german: 'de-DE',
  hebrew: 'he-IL',
  italian: 'it-IT',
  japanese: 'ja-JP',
  korean: 'ko-KR',
  portuguese: 'pt-PT',
  russian: 'ru-RU',
  spanish: 'es-ES',
}

function normalizeLanguage(language: string) {
  return language
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase()
}

function resolveLanguageTag(language: string) {
  const trimmedLanguage = language.trim()
  if (/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(trimmedLanguage)) {
    return trimmedLanguage
  }

  return LANGUAGE_TAGS[normalizeLanguage(trimmedLanguage)]
}

function waitForVoices(synthesis: SpeechSynthesis) {
  const availableVoices = synthesis.getVoices()
  if (availableVoices.length) return Promise.resolve(availableVoices)

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let resolved = false
    const finish = () => {
      if (resolved) return
      resolved = true
      synthesis.removeEventListener('voiceschanged', finish)
      resolve(synthesis.getVoices())
    }

    synthesis.addEventListener('voiceschanged', finish)
    window.setTimeout(finish, 1_500)
  })
}

function findVoice(voices: SpeechSynthesisVoice[], languageTag: string) {
  const normalizedTag = languageTag.replace('_', '-').toLocaleLowerCase()
  const prefix = normalizedTag.split('-')[0]
  const acceptedPrefixes = prefix === 'he' ? ['he', 'iw'] : [prefix]
  const qualityVoicePattern = /natural|neural|enhanced|premium|google|microsoft/i

  const rankVoice = (voice: SpeechSynthesisVoice) => {
    const normalizedVoiceTag = voice.lang
      .replace('_', '-')
      .toLocaleLowerCase()
    const voicePrefix = normalizedVoiceTag.split('-')[0]
    const exactLanguageScore = normalizedVoiceTag === normalizedTag ? 100 : 0
    const acceptedLanguageScore = acceptedPrefixes.includes(voicePrefix) ? 50 : 0
    const defaultScore = voice.default ? 20 : 0
    const qualityScore = qualityVoicePattern.test(
      `${voice.name} ${voice.voiceURI}`
    )
      ? 10
      : 0

    return (
      exactLanguageScore +
      acceptedLanguageScore +
      defaultScore +
      qualityScore
    )
  }

  return voices
    .filter((voice) => {
      const voicePrefix = voice.lang
        .replace('_', '-')
        .toLocaleLowerCase()
        .split('-')[0]
      return acceptedPrefixes.includes(voicePrefix)
    })
    .sort((firstVoice, secondVoice) => {
      return rankVoice(secondVoice) - rankVoice(firstVoice)
    })[0]
}

export function SpeakButton({
  text,
  language,
  className,
}: {
  text: string
  language: string
  className?: string
}) {
  async function speak() {
    if (!text.trim()) return
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      toast.error('La lecture audio n’est pas prise en charge par ce navigateur.')
      return
    }

    const synthesis = window.speechSynthesis
    const languageTag = resolveLanguageTag(language)
    const voices = await waitForVoices(synthesis)
    const matchingVoice = languageTag
      ? findVoice(voices, languageTag)
      : undefined

    if (languageTag && voices.length && !matchingVoice) {
      toast.error(
        `Aucune voix ${language} n’est installée sur cet appareil.`
      )
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    if (languageTag) {
      utterance.lang = matchingVoice?.lang ?? languageTag
      utterance.voice = matchingVoice ?? null
    }
    utterance.rate = 0.9
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null
    }
    utterance.onerror = (event) => {
      if (activeUtterance === utterance) activeUtterance = null
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        toast.error(`Impossible de lire ce mot en ${language}.`)
      }
    }

    activeUtterance = utterance
    synthesis.cancel()
    window.setTimeout(() => synthesis.speak(utterance), 0)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={speak}
      className={cn('shrink-0', className)}
      aria-label={`Écouter « ${text} » en ${language}`}
      title={`Écouter en ${language}`}
    >
      <Volume2 className="size-4" />
    </Button>
  )
}
