-- Keep existing words aligned with their parent list's source language.
UPDATE "Word" AS word
SET
    "language" = list."language",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "List" AS list
WHERE word."listId" = list."id"
  AND LOWER(word."language") <> LOWER(list."language");

-- For lists with one translation language, remove stale duplicates before
-- relabeling translations that kept the previous list language.
WITH single_target AS (
    SELECT
        "listId",
        MIN("language") AS "language"
    FROM "TranslationLists"
    GROUP BY "listId"
    HAVING COUNT(*) = 1
)
DELETE FROM "TranslationWord" AS translation
USING "Word" AS word, single_target AS target
WHERE translation."wordId" = word."id"
  AND word."listId" = target."listId"
  AND LOWER(translation."language") <> LOWER(target."language")
  AND EXISTS (
      SELECT 1
      FROM "TranslationWord" AS configured_translation
      WHERE configured_translation."wordId" = translation."wordId"
        AND LOWER(configured_translation."language") = LOWER(target."language")
  );

WITH single_target AS (
    SELECT
        "listId",
        MIN("language") AS "language"
    FROM "TranslationLists"
    GROUP BY "listId"
    HAVING COUNT(*) = 1
)
UPDATE "TranslationWord" AS translation
SET
    "language" = target."language",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Word" AS word, single_target AS target
WHERE translation."wordId" = word."id"
  AND word."listId" = target."listId"
  AND LOWER(translation."language") <> LOWER(target."language");

-- Detect official lists published with French and Hebrew inverted. The source
-- contains no Hebrew text while its only translation contains Hebrew text.
CREATE TEMPORARY TABLE "_InvertedOfficialLists" AS
SELECT official_list."id"
FROM "OfficialList" AS official_list
WHERE LOWER(official_list."language") IN ('hebreu', 'hébreu', 'hebrew', 'he', 'he-il', 'iw', 'iw-il')
  AND (
      SELECT COUNT(*)
      FROM "OfficialTranslationList" AS configured_translation
      WHERE configured_translation."listId" = official_list."id"
  ) = 1
  AND EXISTS (
      SELECT 1
      FROM "OfficialTranslationList" AS configured_translation
      WHERE configured_translation."listId" = official_list."id"
        AND LOWER(configured_translation."language") IN ('francais', 'français', 'french', 'fr', 'fr-fr')
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "OfficialWord" AS word
      WHERE word."listId" = official_list."id"
        AND word."text" ~ '[א-ת]'
  )
  AND EXISTS (
      SELECT 1
      FROM "OfficialTranslationWord" AS translation
      INNER JOIN "OfficialWord" AS word ON word."id" = translation."wordId"
      WHERE word."listId" = official_list."id"
        AND translation."text" ~ '[א-ת]'
  );

UPDATE "OfficialList" AS list
SET
    "language" = 'français',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE list."id" IN (SELECT "id" FROM "_InvertedOfficialLists");

UPDATE "OfficialWord" AS word
SET
    "language" = 'français',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE word."listId" IN (SELECT "id" FROM "_InvertedOfficialLists");

UPDATE "OfficialTranslationList" AS translation
SET
    "language" = 'hebreu',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE translation."listId" IN (SELECT "id" FROM "_InvertedOfficialLists");

UPDATE "OfficialTranslationWord" AS translation
SET
    "language" = 'hebreu',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "OfficialWord" AS word
WHERE translation."wordId" = word."id"
  AND word."listId" IN (SELECT "id" FROM "_InvertedOfficialLists");

DROP TABLE "_InvertedOfficialLists";
