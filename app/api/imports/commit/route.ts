import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function normalizeValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
        303,
      ),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const importId = String(formData.get('importId') || '').trim();

  if (!importId) {
    return NextResponse.json({ error: 'importId is required' }, { status: 400 });
  }

  const { data: importRecord, error: importError } = await auth.supabase
    .from('imports')
    .select('id, row_count, valid_row_count, invalid_row_count, status')
    .eq('id', importId)
    .maybeSingle();

  if (importError || !importRecord) {
    return NextResponse.json({ error: 'Import not found' }, { status: 404 });
  }

  const { data: validRows, error: rowsError } = await auth.supabase
    .from('import_rows')
    .select(
      'id, company_name, contact_person, title, email, phone, website, address1, address2, city, state, zip, industry, status, assigned_user_id, follow_up_date, notes',
    )
    .eq('import_id', importId)
    .is('validation_error', null)
    .order('row_number', { ascending: true });

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const validData = Array.isArray(validRows) ? validRows : [];

  const emails = Array.from(
    new Set(
      validData
        .map((row) => normalizeValue(row.email)?.toLowerCase() || null)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const phones = Array.from(
    new Set(
      validData
        .map((row) => normalizeValue(row.phone))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();

  if (emails.length > 0) {
    const { data: emailMatches } = await auth.supabase
      .from('leads')
      .select('email')
      .in('email', emails);

    for (const row of emailMatches || []) {
      const email = normalizeValue(row.email)?.toLowerCase();
      if (email) existingEmails.add(email);
    }
  }

  if (phones.length > 0) {
    const { data: phoneMatches } = await auth.supabase
      .from('leads')
      .select('phone')
      .in('phone', phones);

    for (const row of phoneMatches || []) {
      const phone = normalizeValue(row.phone);
      if (phone) existingPhones.add(phone);
    }
  }

  const rowsToInsert: Array<Record<string, unknown>> = [];
  let duplicateCount = 0;

  for (const row of validData) {
    const email = normalizeValue(row.email)?.toLowerCase() || null;
    const phone = normalizeValue(row.phone) || null;

    const isDuplicate =
      (email && existingEmails.has(email)) || (phone && existingPhones.has(phone));

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    if (email) existingEmails.add(email);
    if (phone) existingPhones.add(phone);

    // Remove notes from leads insert payload
    rowsToInsert.push({
      company_name: row.company_name,
      contact_person: row.contact_person,
      title: row.title,
      email: normalizeValue(row.email),
      phone: normalizeValue(row.phone),
      website: normalizeValue(row.website),
      address1: normalizeValue(row.address1),
      address2: normalizeValue(row.address2),
      city: normalizeValue(row.city),
      state: normalizeValue(row.state),
      zip: normalizeValue(row.zip),
      industry: normalizeValue(row.industry),
      status: normalizeValue(row.status) || 'new_lead',
      assigned_user_id: row.assigned_user_id || null,
      follow_up_date: row.follow_up_date || null,
    });
  }

  const chunkSize = 500;
  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error: insertError } = await auth.supabase.from('leads').insert(chunk);

    if (insertError) {
      await auth.supabase
        .from('imports')
        .update({
          status: 'failed',
          error_message: insertError.message,
        })
        .eq('id', importId);

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const updatedInvalidCount = (importRecord.invalid_row_count || 0) + duplicateCount;
  const updatedValidCount = rowsToInsert.length;

  await auth.supabase
    .from('imports')
    .update({
      status: 'completed',
      valid_row_count: updatedValidCount,
      invalid_row_count: updatedInvalidCount,
      completed_at: new Date().toISOString(),
      error_message:
        duplicateCount > 0 ? `Skipped ${duplicateCount} duplicate row(s) during commit.` : null,
    })
    .eq('id', importId);

  return NextResponse.redirect(new URL(`/dashboard/import/${importId}`, request.url), 303);
}
