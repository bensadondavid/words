-- DropForeignKey
ALTER TABLE "TranslationWord" DROP CONSTRAINT "TranslationWord_wordId_fkey";

-- DropForeignKey
ALTER TABLE "TranslationLists" DROP CONSTRAINT "TranslationLists_listId_fkey";

-- AddForeignKey
ALTER TABLE "TranslationWord" ADD CONSTRAINT "TranslationWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationLists" ADD CONSTRAINT "TranslationLists_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
