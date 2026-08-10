-- CreateIndex
CREATE INDEX "List_userId_updatedAt_idx" ON "List"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Word_listId_createdAt_id_idx" ON "Word"("listId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TranslationWord_wordId_createdAt_idx" ON "TranslationWord"("wordId", "createdAt");

-- CreateIndex
CREATE INDEX "TranslationLists_listId_createdAt_idx" ON "TranslationLists"("listId", "createdAt");
