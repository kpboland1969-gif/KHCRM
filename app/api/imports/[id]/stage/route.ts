import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);

  return rows;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  const importId = params.id;

  const formData = await request.formData();

  const mapping: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('map_')) {
      const field = key.replace('map_', '');
      mapping[field] = String(value);
    }
  }

  const { data: importRecord } = await supabase
    .from('imports')
    .select('raw_csv')
    .eq('id', importId)
    .maybeSingle();

  if (!importRecord?.raw_csv) {
    return NextResponse.json({ error: 'CSV not found' }, { status: 400 });
  }

  const rows = parseCsv(importRecord.raw_csv);

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => (headerIndex[h] = i));

  const stagedRows: any[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    const staged: any = {
      import_id: importId,
      row_number: i + 1,
      raw_data: {},
      validation_error: null,
    };

    for (const [field, csvColumn] of Object.entries(mapping)) {
      const index = headerIndex[csvColumn];
      if (index === undefined) continue;

      const value = row[index]?.trim() || null;

      staged[field] = value;
      staged.raw_data[csvColumn] = value;
    }

    const errors: string[] = [];

    if (!staged.company_name) errors.push('Missing company_name');
    if (!staged.contact_person) errors.push('Missing contact_person');

    if (staged.email && !isValidEmail(staged.email)) {
      errors.push('Invalid email format');
    }

    if (staged.assigned_user_id && !isUuidLike(staged.assigned_user_id)) {
      errors.push('assigned_user_id must be a UUID');
    }

    if (staged.follow_up_date) {
      const parsed = new Date(staged.follow_up_date);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('Invalid follow_up_date');
        staged.follow_up_date = null;
      } else {
        staged.follow_up_date = parsed.toISOString();
      }
    }

    staged.validation_error = errors.length > 0 ? errors.join('; ') : null;

    stagedRows.push(staged);
  }

  const chunkSize = 500;

  for (let i = 0; i < stagedRows.length; i += chunkSize) {
    const chunk = stagedRows.slice(i, i + chunkSize);

    const { error } = await supabase.from('import_rows').insert(chunk);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const validCount = stagedRows.filter((r) => !r.validation_error).length;

  await supabase
    .from('imports')
    .update({
      status: 'preview_ready',
      valid_row_count: validCount,
      invalid_row_count: stagedRows.length - validCount,
    })
    .eq('id', importId);

  return NextResponse.redirect(new URL(`/dashboard/import/${importId}`, request.url), 303);
}
