// types/leads.ts

export type LeadRow = {
  id: string;
  assigned_user_id: string | null;
  company_name: string;
  contact_person: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  industry: 'construction' | 'subcontractor' | 'manufacturing' | 'wholesale';
  status: 'new_lead' | 'email_campaign' | 'warm_lead' | 'assessment_stage' | 'onboarding' | 'client';
  follow_up_date: string | null; // ISO string
  last_touched_at: string | null; // ISO string
  created_at: string; // ISO string
  updated_at: string; // ISO string
};
