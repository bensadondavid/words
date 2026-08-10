-- CreateIndex
CREATE UNIQUE INDEX "TranslationWord_wordId_language_key" ON "TranslationWord"("wordId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationLists_listId_language_key" ON "TranslationLists"("listId", "language");
