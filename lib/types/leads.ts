export type LeadAssignedUser = {
  id: string;
  full_name: string | null;
  username: string | null;
};

export type LeadRow = {
  id: string;
  assigned_user_id: string | null;
  company_name: string | null;
  contact_person: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  industry: string | null;
  status: string | null;
  follow_up_date: string | null; // ISO string from Postgres/timestamptz
  created_at?: string | null;
  updated_at?: string | null;

  // ✅ new
  assigned_user?: LeadAssignedUser | null;
};
