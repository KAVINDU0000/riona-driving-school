-- Admins sign in with their admin ID and may have no email address. Students and instructors still
-- must have one: it is their contact address for password reset, email change and invitations.

-- Allow NULL. The existing unique index "User_email_key" is unchanged: PostgreSQL treats NULLs as
-- distinct, so non-null addresses stay unique and admins without an email do not collide.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Prisma cannot express CHECK constraints, so this rule lives in the migration only.
ALTER TABLE "User" ADD CONSTRAINT "User_email_required_unless_admin_check"
CHECK ("role" = 'ADMIN' OR "email" IS NOT NULL);
