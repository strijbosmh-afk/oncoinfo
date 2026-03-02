
-- Remove any existing duplicates (keep the one with lowest display_order)
DELETE FROM user_most_used a
USING user_most_used b
WHERE a.user_id = b.user_id
  AND a.drug_id = b.drug_id
  AND a.id > b.id;

-- Add unique constraint to prevent duplicates at DB level
ALTER TABLE user_most_used
ADD CONSTRAINT user_most_used_user_drug_unique UNIQUE (user_id, drug_id);
