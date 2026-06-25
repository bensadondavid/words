/*
  Warnings:

  - You are about to drop the column `text` on the `TranslationLists` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TranslationLists" DROP COLUMN "text";

-- AlterTable
ALTER TABLE "Word" ALTER COLUMN "listId" DROP NOT NULL;
