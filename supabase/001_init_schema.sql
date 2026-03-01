-- 001_init_schema.sql
-- Initial schema and RLS for sales-leads CRM

-- 1. Enums
CREATE TYPE industry_type AS ENUM ('construction', 'subcontractor', 'manufacturing', 'wholesale');
CREATE TYPE lead_status AS ENUM ('New Lead', 'email campaign', 'warm lead', 'assessment stage', 'onboarding', 'client');
CREATE TYPE followup_status AS ENUM ('none', 'scheduled', 'completed', 'missed');
CREATE TYPE activity_type AS ENUM ('view', 'note', 'email_sent', 'document_selected', 'lead_created', 'lead_updated', 'followup_scheduled', 'followup_completed', 'followup_missed', 'csv_import');

-- 2. profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','user','manager')) DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- 3. leads table
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_title text,
  phone text,
  email text,
  website text,
  street_address text,
  address_2 text,
  city text,
  state text,
  zip text,
  industry industry_type NOT NULL,
  status lead_status NOT NULL DEFAULT 'New Lead',
  assigned_to uuid NOT NULL REFERENCES profiles(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  followup_at timestamptz,
  followup_status followup_status NOT NULL DEFAULT 'none',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 5. lead_documents table
CREATE TABLE lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 6. lead_activity table
CREATE TABLE lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 7. updated_at trigger for leads
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 8. Indexes
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_followup_at ON leads(followup_at);
CREATE INDEX idx_lead_activity_lead_id ON lead_activity(lead_id);

-- 9. RLS: Enable and policies
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_profile ON profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_leads_assigned ON leads
  FOR SELECT USING (
    (assigned_to = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY insert_leads ON leads
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND assigned_to IS NOT NULL
  );
CREATE POLICY update_delete_leads ON leads
  FOR UPDATE, DELETE USING (
    (assigned_to = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- lead_activity
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_lead_activity ON lead_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id
        AND (l.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- lead_documents
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_lead_documents ON lead_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id
        AND (l.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_documents ON documents
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY admin_documents ON documents
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 10. RPC: mark_missed_followups
CREATE OR REPLACE FUNCTION mark_missed_followups() RETURNS void AS $$
BEGIN
  UPDATE leads
    SET followup_status = 'missed'
    WHERE followup_at < now()
      AND followup_status != 'completed';

  INSERT INTO lead_activity (lead_id, type, message, metadata, created_by)
    SELECT id, 'followup_missed', 'Followup missed', '{}', NULL
    FROM leads
    WHERE followup_at < now()
      AND followup_status = 'missed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
