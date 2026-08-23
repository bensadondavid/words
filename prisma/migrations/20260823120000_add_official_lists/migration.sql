-- CreateTable
CREATE TABLE "OfficialList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialWord" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "note" TEXT,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialTranslationWord" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "note" TEXT,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialTranslationWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialTranslationList" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "note" TEXT,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialTranslationList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfficialList_published_updatedAt_idx" ON "OfficialList"("published", "updatedAt");

-- CreateIndex
CREATE INDEX "OfficialWord_listId_createdAt_id_idx" ON "OfficialWord"("listId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialTranslationWord_wordId_language_key" ON "OfficialTranslationWord"("wordId", "language");

-- CreateIndex
CREATE INDEX "OfficialTranslationWord_wordId_createdAt_idx" ON "OfficialTranslationWord"("wordId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialTranslationList_listId_language_key" ON "OfficialTranslationList"("listId", "language");

-- CreateIndex
CREATE INDEX "OfficialTranslationList_listId_createdAt_idx" ON "OfficialTranslationList"("listId", "createdAt");

-- AddForeignKey
ALTER TABLE "OfficialWord" ADD CONSTRAINT "OfficialWord_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OfficialList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialTranslationWord" ADD CONSTRAINT "OfficialTranslationWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "OfficialWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialTranslationList" ADD CONSTRAINT "OfficialTranslationList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OfficialList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
