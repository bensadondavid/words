export type WordFeedTranslation = {
  id: string
  text: string
  language: string
}

export type WordFeedItem = {
  id: string
  text: string
  language: string
  list: {
    id: string
    name: string
  }
  translations: WordFeedTranslation[]
}

export type WordsPageData = {
  words: WordFeedItem[]
  nextCursor: string | null
}
