BEGIN TRANSACTION;

-- If priority_rank is empty, backfill it from priority_no first.
UPDATE TB_APPLICATION_LIST
SET priority_rank = priority_no
WHERE priority_rank IS NULL
  AND priority_no IN (1, 2, 3);

-- Apply requested fixed admission mapping by priority rank.
UPDATE TB_APPLICATION_LIST
SET admission_id = CASE
    WHEN priority_rank = 1 THEN 92
    WHEN priority_rank = 2 THEN 13
    WHEN priority_rank = 3 THEN 49
    ELSE admission_id
END
WHERE priority_rank IN (1, 2, 3);

COMMIT;
