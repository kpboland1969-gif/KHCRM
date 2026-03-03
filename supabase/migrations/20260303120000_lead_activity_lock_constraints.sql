-- Lock down lead_activity schema: defaults, NOT NULL, FKs, indexes

-- 1A: Safe defaults
ALTER TABLE lead_activity ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE lead_activity ALTER COLUMN created_at SET DEFAULT now();

-- 1B: NOT NULL constraints
ALTER TABLE lead_activity ALTER COLUMN lead_id SET NOT NULL;
ALTER TABLE lead_activity ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE lead_activity ALTER COLUMN type SET NOT NULL;
ALTER TABLE lead_activity ALTER COLUMN body SET NOT NULL;
ALTER TABLE lead_activity ALTER COLUMN created_at SET NOT NULL;

-- 1C: Foreign keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_activity_lead_id_fkey'
  ) THEN
    ALTER TABLE lead_activity ADD CONSTRAINT lead_activity_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_activity_user_id_fkey'
  ) THEN
    ALTER TABLE lead_activity ADD CONSTRAINT lead_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 1D: Indexes
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id_created_at_desc ON lead_activity(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id_type ON lead_activity(lead_id, type);
