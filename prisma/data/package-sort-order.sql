-- Sets the public display order of the school's 22 packages, in the order of the school's price list.
-- Run once, after the migration. Only rows with these IDs change. Running it again sets the same values.
-- The IDs are the ones in src/data/packages.ts. Check the count before running: it must be 22.
UPDATE "TrainingPackage" AS p
SET "sortOrder" = v.sort_order
FROM (VALUES
  ('regular-car-van', 1),
  ('trial-three-wheeler', 2),
  ('trial-motorcycle', 3),
  ('trial-car', 4),
  ('trial-van', 5),
  ('trial-three-wheeler-motorcycle', 6),
  ('trial-three-wheeler-van', 7),
  ('trial-motorcycle-van', 8),
  ('trial-van-three-wheeler-motorcycle', 9),
  ('trial-car-three-wheeler', 10),
  ('trial-car-motorcycle', 11),
  ('trial-car-three-wheeler-motorcycle', 12),
  ('extra-car-motorcycle', 13),
  ('extra-car-three-wheeler', 14),
  ('extra-car-three-wheeler-motorcycle', 15),
  ('extra-van-motorcycle', 16),
  ('extra-van-three-wheeler', 17),
  ('extra-van-three-wheeler-motorcycle', 18),
  ('daily-car', 19),
  ('daily-van', 20),
  ('daily-motorcycle', 21),
  ('daily-three-wheeler', 22)
) AS v(package_id, sort_order)
WHERE p."id" = v.package_id;

-- Verification: every row below should show a non-zero sortOrder.
SELECT "id", "sortOrder" FROM "TrainingPackage" ORDER BY "sortOrder";
