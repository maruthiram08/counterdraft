-- Approving a beta request stores the invite it minted, so the app can add Pro when the
-- person signs up with the email they requested access with (even without opening the link).
-- Safe to run more than once.
ALTER TABLE beta_requests ADD COLUMN IF NOT EXISTS invite_code TEXT;
