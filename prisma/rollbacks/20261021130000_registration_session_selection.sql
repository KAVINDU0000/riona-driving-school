-- Manual rollback for 20261021130000_registration_session_selection. Not run automatically.
-- Dropping this table deletes every session selection recorded after the migration. Approved enrollments keep their own
-- requirement rows, but pending applications would lose their chosen counts and fall back to package rows at approval.
-- Run it only after deciding to lose those selections.
DROP TABLE IF EXISTS "RegistrationSessionSelection";
