import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Allowed enums for validation
const allowedIndustries = ['construction', 'subcontractor', 'manufacturing', 'wholesale'];
const allowedStatuses = ['new_lead', 'email_campaign', 'warm_lead', 'assessment_stage', 'onboarding', 'client'];

export async function POST(req: NextRequest) {
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Required fields
  const company_name = String(body.company_name || '').trim();
  const contact_person = String(body.contact_person || '').trim();
  if (!company_name) return NextResponse.json({ ok: false, error: 'Company name is required.' }, { status: 400 });
  if (!contact_person) return NextResponse.json({ ok: false, error: 'Contact person is required.' }, { status: 400 });

  // Validate enums
  const industry = allowedIndustries.includes(body.industry) ? body.industry : 'construction';
  const status = allowedStatuses.includes(body.status) ? body.status : 'new_lead';

  // Assignment: only allow assigning to self (RLS policy)
  const assigned_user_id = typeof body.assigned_user_id === 'string' && body.assigned_user_id ? body.assigned_user_id : profile.id;

  // Parse follow_up_date if present
  let follow_up_date = null;
  if (body.follow_up_date) {
    const d = new Date(body.follow_up_date);
    if (!isNaN(d.getTime())) follow_up_date = d.toISOString();
  }

  const supabase = await createSupabaseServerClient();

  const insertRow = {
    assigned_user_id,
    company_name,
    contact_person,
    title: body.title ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: body.website ?? null,
    address1: body.address1 ?? null,
    address2: body.address2 ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    zip: body.zip ?? null,
    industry,
    status,
    follow_up_date,
    last_touched_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('leads').insert(insertRow).select('id').single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
