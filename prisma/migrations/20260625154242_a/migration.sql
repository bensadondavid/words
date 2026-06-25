/*
  Warnings:

  - You are about to drop the `Translation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_wordId_fkey";

-- DropTable
DROP TABLE "Translation";

-- CreateTable
CREATE TABLE "TranslationWord" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "note" TEXT,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationLists" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "note" TEXT,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationLists_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TranslationWord" ADD CONSTRAINT "TranslationWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationLists" ADD CONSTRAINT "TranslationLists_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
