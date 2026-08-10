'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Gamepad2,
  LoaderCircle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type GameTranslation = { text: string; language: string }
type GameWord = { id: string; text: string; translations: GameTranslation[] }

export type GameList = {
  id: string
  name: string
  language: string
  translationLanguages: string[]
  wordCount: number
}

type GameMode = 'writing' | 'quiz'
type GameDirection = 'forward' | 'reverse' | 'mixed'
type Screen = 'setup' | 'playing' | 'results'

type Question = {
  id: string
  prompt: string
  promptLanguage: string
  answerLanguage: string
  acceptedAnswers: string[]
  options: string[]
}

type AnswerResult = {
  question: Question
  answer: string
  correct: boolean
}

type QuestionAmount = 10 | 20 | 50 | 'all'

const questionAmounts: QuestionAmount[] = [10, 20, 50, 'all']

function shuffle<T>(values: T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function getInitialTargetLanguage(list?: GameList) {
  return list?.translationLanguages[0] ?? ''
}

function getWordCacheKey(listId: string, language: string) {
  return `${listId}:${language}`
}

function isGameWord(value: unknown): value is GameWord {
  if (!value || typeof value !== 'object') return false

  const word = value as Partial<GameWord>
  return (
    typeof word.id === 'string' &&
    typeof word.text === 'string' &&
    Array.isArray(word.translations) &&
    word.translations.every(
      (translation) =>
        Boolean(translation) &&
        typeof translation.text === 'string' &&
        typeof translation.language === 'string'
    )
  )
}

export default function GamePage({ lists }: { lists: GameList[] }) {
  const firstList =
    lists.find(
      (list) => list.wordCount > 0 && list.translationLanguages.length > 0
    ) ?? lists[0]
  const [screen, setScreen] = useState<Screen>('setup')
  const [selectedListId, setSelectedListId] = useState(firstList?.id ?? '')
  const [targetLanguage, setTargetLanguage] = useState(
    getInitialTargetLanguage(firstList)
  )
  const [mode, setMode] = useState<GameMode>('writing')
  const [direction, setDirection] = useState<GameDirection>('forward')
  const [amount, setAmount] = useState<QuestionAmount>(10)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [results, setResults] = useState<AnswerResult[]>([])
  const [wordCache, setWordCache] = useState<Record<string, GameWord[]>>({})
  const [loadingGame, setLoadingGame] = useState(false)
  const [setupError, setSetupError] = useState('')

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId),
    [lists, selectedListId]
  )

  const wordCacheKey = selectedList
    ? getWordCacheKey(selectedList.id, targetLanguage)
    : ''
  const cachedWords = wordCacheKey ? wordCache[wordCacheKey] : undefined
  const playableWords = cachedWords ?? []
  const wordsLoaded = cachedWords !== undefined
  const availableWordCount = wordsLoaded
    ? playableWords.length
    : selectedList?.wordCount ?? 0

  const sourceAnswers = unique(playableWords.map((word) => word.text))
  const targetAnswers = unique(
    playableWords.flatMap((word) =>
      word.translations
        .filter((translation) => translation.language === targetLanguage)
        .map((translation) => translation.text)
    )
  )
  const quizAvailable = wordsLoaded
    ? direction === 'forward'
      ? targetAnswers.length >= 4
      : direction === 'reverse'
        ? sourceAnswers.length >= 4
        : sourceAnswers.length >= 4 && targetAnswers.length >= 4
    : availableWordCount >= 4

  function changeList(listId: string) {
    const nextList = lists.find((list) => list.id === listId)
    setSelectedListId(listId)
    setTargetLanguage(getInitialTargetLanguage(nextList))
    setSetupError('')
  }

  function createQuestions(words: GameWord[], list: GameList) {
    const currentSourceAnswers = unique(words.map((word) => word.text))
    const currentTargetAnswers = unique(
      words.flatMap((word) =>
        word.translations.map((translation) => translation.text)
      )
    )
    const questionLimit =
      amount === 'all' ? words.length : Math.min(amount, words.length)
    const selectedWords = shuffle(words).slice(0, questionLimit)

    return selectedWords.map((word, index) => {
      const translations = unique(
        word.translations
          .filter((translation) => translation.language === targetLanguage)
          .map((translation) => translation.text)
      )
      const resolvedDirection =
        direction === 'mixed'
          ? Math.random() > 0.5
            ? 'forward'
            : 'reverse'
          : direction
      const isForward = resolvedDirection === 'forward'
      const acceptedAnswers = isForward ? translations : [word.text]
      const possibleAnswers = isForward
        ? currentTargetAnswers
        : currentSourceAnswers
      const distractors = shuffle(
        possibleAnswers.filter(
          (candidate) =>
            !acceptedAnswers.some(
              (validAnswer) =>
                normalizeAnswer(validAnswer) === normalizeAnswer(candidate)
            )
        )
      ).slice(0, 3)

      return {
        id: `${word.id}-${resolvedDirection}-${index}`,
        prompt: isForward
          ? word.text
          : translations[Math.floor(Math.random() * translations.length)],
        promptLanguage: isForward ? list.language : targetLanguage,
        answerLanguage: isForward ? targetLanguage : list.language,
        acceptedAnswers,
        options: shuffle([acceptedAnswers[0], ...distractors]),
      }
    })
  }

  function beginRound(roundQuestions: Question[]) {
    setQuestions(roundQuestions)
    setQuestionIndex(0)
    setAnswer('')
    setFeedback(null)
    setResults([])
    setScreen('playing')
  }

  async function startGame() {
    if (!selectedList || !targetLanguage || loadingGame) return
    setLoadingGame(true)
    setSetupError('')

    try {
      const cacheKey = getWordCacheKey(selectedList.id, targetLanguage)
      let words = wordCache[cacheKey]

      if (words === undefined) {
        const response = await fetch(
          `/api/lists/${selectedList.id}/game?language=${encodeURIComponent(targetLanguage)}`,
          { cache: 'no-store' }
        )
        const data = (await response.json().catch(() => null)) as
          | { words: GameWord[] }
          | { error?: string }
          | null

        if (!response.ok || !data || !('words' in data)) {
          throw new Error(
            data && 'error' in data && data.error
              ? data.error
              : 'Impossible de charger les mots de la partie.'
          )
        }

        if (!Array.isArray(data.words) || !data.words.every(isGameWord)) {
          throw new Error('Les données reçues pour la partie sont invalides.')
        }

        words = data.words
        setWordCache((current) => ({ ...current, [cacheKey]: words }))
      }

      if (!words.length) {
        throw new Error(
          `Cette liste ne contient aucun mot traduit en ${targetLanguage}.`
        )
      }

      const loadedSourceAnswers = unique(words.map((word) => word.text))
      const loadedTargetAnswers = unique(
        words.flatMap((word) =>
          word.translations.map((translation) => translation.text)
        )
      )
      const loadedQuizAvailable =
        direction === 'forward'
          ? loadedTargetAnswers.length >= 4
          : direction === 'reverse'
            ? loadedSourceAnswers.length >= 4
            : loadedSourceAnswers.length >= 4 && loadedTargetAnswers.length >= 4

      if (mode === 'quiz' && !loadedQuizAvailable) {
        throw new Error(
          'Le QCM nécessite au moins quatre réponses différentes.'
        )
      }

      beginRound(createQuestions(words, selectedList))
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    } finally {
      setLoadingGame(false)
    }
  }

  function submitAnswer(value = answer) {
    const question = questions[questionIndex]
    if (!question || feedback || !value.trim()) return

    const result = {
      question,
      answer: value.trim(),
      correct: question.acceptedAnswers.some(
        (validAnswer) => normalizeAnswer(validAnswer) === normalizeAnswer(value)
      ),
    }
    setAnswer(value)
    setFeedback(result)
    setResults((current) => [...current, result])

    if (!result.correct) {
      setQuestions((current) => [
        ...current,
        { ...question, options: shuffle(question.options) },
      ])
    }
  }

  function nextQuestion() {
    if (questionIndex === questions.length - 1) {
      setScreen('results')
      return
    }
    setQuestionIndex((current) => current + 1)
    setAnswer('')
    setFeedback(null)
  }

  function leaveGame() {
    setScreen('setup')
    setQuestions([])
    setResults([])
    setFeedback(null)
    setAnswer('')
  }

  const currentQuestion = questions[questionIndex]
  const correctCount = results.filter((result) => result.correct).length
  const incorrectAttempts = results.filter((result) => !result.correct).length
  const questionGoal = new Set(questions.map((question) => question.id)).size
  const masteredCount = new Set(
    results
      .filter((result) => result.correct)
      .map((result) => result.question.id)
  ).size
  const score = results.length ? Math.round((correctCount / results.length) * 100) : 0

  if (screen === 'playing' && currentQuestion) {
    return (
      <GameRound
        question={currentQuestion}
        questionIndex={questionIndex}
        total={questions.length}
        masteredCount={masteredCount}
        questionGoal={questionGoal}
        mode={mode}
        answer={answer}
        feedback={feedback}
        setAnswer={setAnswer}
        submitAnswer={submitAnswer}
        nextQuestion={nextQuestion}
        leaveGame={leaveGame}
      />
    )
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        score={score}
        correctCount={correctCount}
        results={results}
        incorrectAttempts={incorrectAttempts}
        replay={startGame}
        leaveGame={leaveGame}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" /> Entraînement
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Jouer</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Choisissez une liste et entraînez-vous à retrouver ses traductions.
        </p>
      </header>

      {!lists.length ? (
        <EmptyGameState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">Préparer la partie</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Liste"
                value={selectedListId}
                onChange={changeList}
                options={lists.map((list) => ({ value: list.id, label: list.name }))}
              />
              <SelectField
                label="Langue à traduire"
                value={targetLanguage}
                onChange={(language) => {
                  setTargetLanguage(language)
                  setSetupError('')
                }}
                disabled={!selectedList?.translationLanguages.length}
                options={(selectedList?.translationLanguages ?? []).map((language) => ({
                  value: language,
                  label: language,
                }))}
              />
            </div>

            <OptionGroup label="Mode de jeu" columns="sm:grid-cols-2">
              <OptionButton
                active={mode === 'writing'}
                onClick={() => setMode('writing')}
                title="Écriture"
                description="Écrivez vous-même la traduction."
              />
              <OptionButton
                active={mode === 'quiz'}
                onClick={() => setMode('quiz')}
                title="QCM"
                description="Choisissez parmi quatre réponses."
                disabled={!quizAvailable}
              />
            </OptionGroup>

            <OptionGroup label="Sens de traduction" columns="sm:grid-cols-3">
              <OptionButton
                active={direction === 'forward'}
                onClick={() => setDirection('forward')}
                title={`${selectedList?.language ?? 'Original'} → ${targetLanguage || 'Traduction'}`}
              />
              <OptionButton
                active={direction === 'reverse'}
                onClick={() => setDirection('reverse')}
                title={`${targetLanguage || 'Traduction'} → ${selectedList?.language ?? 'Original'}`}
              />
              <OptionButton
                active={direction === 'mixed'}
                onClick={() => setDirection('mixed')}
                title="Aléatoire"
              />
            </OptionGroup>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Nombre de questions</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {questionAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors ${
                      amount === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:border-primary'
                    }`}
                  >
                    {value === 'all' ? 'Toute la liste' : value}
                  </button>
                ))}
              </div>
            </fieldset>

            {availableWordCount === 0 && (
              <Warning>
                Cette liste ne contient aucun mot traduit en {targetLanguage || 'langue cible'}.
              </Warning>
            )}
            {mode === 'quiz' && !quizAvailable && (
              <Warning>
                Le QCM nécessite au moins quatre réponses différentes. Choisissez le mode écriture ou ajoutez des mots.
              </Warning>
            )}
            {setupError && <Warning>{setupError}</Warning>}

            <Button
              size="lg"
              className="mt-7 w-full sm:w-auto"
              onClick={startGame}
              disabled={
                loadingGame ||
                !targetLanguage ||
                availableWordCount === 0 ||
                (mode === 'quiz' && !quizAvailable)
              }
            >
              {loadingGame ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Préparation…
                </>
              ) : (
                <>
                  Commencer la partie <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </section>

          <aside className="h-fit rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gamepad2 className="size-5" />
            </div>
            <h2 className="mt-4 font-bold">{selectedList?.name ?? 'Votre partie'}</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <Stat label="Mots disponibles" value={availableWordCount} />
              <Stat
                label="Questions prévues"
                value={
                  amount === 'all'
                    ? availableWordCount
                    : Math.min(amount, availableWordCount)
                }
              />
              <Stat label="Mode" value={mode === 'writing' ? 'Écriture' : 'QCM'} last />
            </dl>
          </aside>
        </div>
      )}
    </div>
  )
}

function GameRound({
  question,
  questionIndex,
  total,
  masteredCount,
  questionGoal,
  mode,
  answer,
  feedback,
  setAnswer,
  submitAnswer,
  nextQuestion,
  leaveGame,
}: {
  question: Question
  questionIndex: number
  total: number
  masteredCount: number
  questionGoal: number
  mode: GameMode
  answer: string
  feedback: AnswerResult | null
  setAnswer: (value: string) => void
  submitAnswer: (value?: string) => void
  nextQuestion: () => void
  leaveGame: () => void
}) {
  const buttonLabel = questionIndex === total - 1 ? 'Voir les résultats' : 'Question suivante'

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={leaveGame} className="-ml-3">
          <ArrowLeft className="size-4" /> Quitter
        </Button>
        <p className="text-sm font-semibold text-muted-foreground">
          {masteredCount} / {questionGoal} mots réussis
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(masteredCount / questionGoal) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        <section className="w-full rounded-3xl border bg-card p-5 shadow-sm sm:p-10">
          <div className="mb-9 text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {question.promptLanguage} → {question.answerLanguage}
            </span>
            <p className="mt-7 text-sm font-medium text-muted-foreground">
              Quelle est la traduction de
            </p>
            <h1 className="mt-2 break-words text-3xl font-bold sm:text-5xl">
              {question.prompt}
            </h1>
          </div>

          {mode === 'writing' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (feedback) nextQuestion()
                else submitAnswer()
              }}
              className="mx-auto max-w-xl"
            >
              <Input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Écrivez votre réponse…"
                aria-label="Votre réponse"
                autoFocus
                autoComplete="off"
                disabled={Boolean(feedback)}
                className="h-14 text-center text-lg"
              />
              {feedback && <Feedback result={feedback} />}
              <Button
                type="submit"
                size="lg"
                className="mt-5 w-full"
                disabled={!feedback && !answer.trim()}
              >
                {feedback ? buttonLabel : 'Valider'} <ArrowRight className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
              {question.options.map((option) => {
                const selected = feedback?.answer === option
                const correct = question.acceptedAnswers.some(
                  (validAnswer) => normalizeAnswer(validAnswer) === normalizeAnswer(option)
                )
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => submitAnswer(option)}
                    disabled={Boolean(feedback)}
                    className={`min-h-16 rounded-xl border px-4 py-3 text-left font-semibold transition-colors disabled:cursor-default ${
                      feedback && correct
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : feedback && selected
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : 'bg-background hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
              {feedback && (
                <div className="sm:col-span-2">
                  <Feedback result={feedback} />
                  <Button size="lg" className="mt-5 w-full" onClick={nextQuestion}>
                    {buttonLabel} <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ResultsScreen({
  score,
  correctCount,
  results,
  incorrectAttempts,
  replay,
  leaveGame,
}: {
  score: number
  correctCount: number
  results: AnswerResult[]
  incorrectAttempts: number
  replay: () => void
  leaveGame: () => void
}) {
  const groupedResults = [...results.reduce<Map<string, AnswerResult[]>>(
    (groups, result) => {
      const attempts = groups.get(result.question.id) ?? []
      attempts.push(result)
      groups.set(result.question.id, attempts)
      return groups
    },
    new Map()
  ).values()]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Trophy className="size-8" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-primary">
          Partie terminée
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{score} % de précision</h1>
        <p className="mt-2 text-muted-foreground">
          {correctCount} mot{correctCount > 1 ? 's' : ''} maîtrisé{correctCount > 1 ? 's' : ''} en {results.length} tentative{results.length > 1 ? 's' : ''}
        </p>
        {incorrectAttempts > 0 && (
          <p className="mt-2 text-sm font-medium text-primary">
            {incorrectAttempts} erreur{incorrectAttempts > 1 ? 's' : ''} corrigée{incorrectAttempts > 1 ? 's' : ''} grâce aux nouvelles tentatives.
          </p>
        )}
        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" variant="outline" onClick={replay}>
            <Gamepad2 className="size-4" /> Rejouer
          </Button>
          <Button size="lg" variant="ghost" onClick={leaveGame}>
            Modifier les options
          </Button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4 sm:px-6">
          <h2 className="font-bold">Récapitulatif</h2>
          <p className="text-sm text-muted-foreground">Vos réponses et leurs corrections.</p>
        </div>
        <div className="divide-y">
          {groupedResults.map((attempts) => {
            const finalResult = attempts[attempts.length - 1]
            const wrongAnswers = attempts
              .filter((attempt) => !attempt.correct)
              .map((attempt) => attempt.answer)

            return (
              <div
                key={finalResult.question.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-center sm:px-6"
              >
                <ResultValue label="Mot" value={finalResult.question.prompt} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Réponse attendue</p>
                  <p className="break-words font-medium text-emerald-700">
                    {finalResult.question.acceptedAnswers.join(' / ')}
                  </p>
                  {wrongAnswers.length > 0 && (
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      Réponse{wrongAnswers.length > 1 ? 's' : ''} incorrecte{wrongAnswers.length > 1 ? 's' : ''} : {wrongAnswers.join(' · ')}
                    </p>
                  )}
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <Check className="size-3.5" />
                  {attempts.length === 1
                    ? 'Du premier coup'
                    : `Réussi en ${attempts.length} essais`}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Feedback({ result }: { result: AnswerResult }) {
  return (
    <div
      role="status"
      className={`mt-4 flex gap-3 rounded-xl border p-4 text-left ${
        result.correct
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      {result.correct ? <Check className="mt-0.5 size-5 shrink-0" /> : <X className="mt-0.5 size-5 shrink-0" />}
      <div>
        <p className="font-bold">{result.correct ? 'Bonne réponse !' : 'Pas tout à fait'}</p>
        {!result.correct && (
          <p className="mt-1 text-sm">
            Réponse attendue : {result.question.acceptedAnswers.join(' / ')}
          </p>
        )}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options, disabled = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function OptionGroup({ label, columns, children }: {
  label: string
  columns: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="mt-7">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className={`mt-3 grid gap-2 ${columns}`}>{children}</div>
    </fieldset>
  )
}

function OptionButton({ active, onClick, title, description, disabled = false }: {
  active: boolean
  onClick: () => void
  title: string
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:border-primary'
      }`}
    >
      <span className="block break-words text-sm font-bold">{title}</span>
      {description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}
    </button>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <CircleAlert className="mt-0.5 size-4 shrink-0" /> {children}
    </div>
  )
}

function Stat({ label, value, last = false }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 pb-3 ${last ? '' : 'border-b'}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words font-semibold">{value}</p>
    </div>
  )
}

function EmptyGameState() {
  return (
    <section className="rounded-2xl border border-dashed bg-card px-5 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Gamepad2 className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Aucune liste disponible</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Créez votre première liste et ajoutez-y quelques mots pour commencer une partie.
      </p>
      <Button asChild className="mt-6"><Link href="/account/lists">Créer une liste</Link></Button>
    </section>
  )
}
