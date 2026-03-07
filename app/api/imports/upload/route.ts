import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10000;

type ParsedCsvRow = Record<string, string>;

type StagedImportRow = {
  import_id: string;
  row_number: number;
  company_name: string | null;
  contact_person: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  industry: string | null;
  status: string | null;
  assigned_user_id: string | null;
  follow_up_date: string | null;
  notes: string | null;
  raw_data: ParsedCsvRow;
  validation_error: string | null;
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
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
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function toObjects(rows: string[][]): ParsedCsvRow[] {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const result: ParsedCsvRow = {};
    headers.forEach((header, index) => {
      result[header] = row[index]?.trim() ?? '';
    });
    return result;
  });
}

const FIELD_MAP: Record<
  string,
  keyof Omit<StagedImportRow, 'import_id' | 'row_number' | 'raw_data' | 'validation_error'>
> = {
  company: 'company_name',
  companyname: 'company_name',
  businessname: 'company_name',

  contact: 'contact_person',
  contactperson: 'contact_person',
  fullname: 'contact_person',
  name: 'contact_person',

  title: 'title',
  jobtitle: 'title',

  email: 'email',
  emailaddress: 'email',

  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',

  website: 'website',
  url: 'website',

  address1: 'address1',
  addressline1: 'address1',
  street: 'address1',
  street1: 'address1',

  address2: 'address2',
  addressline2: 'address2',
  street2: 'address2',
  suite: 'address2',

  city: 'city',
  state: 'state',
  province: 'state',
  region: 'state',
  zip: 'zip',
  zipcode: 'zip',
  postalcode: 'zip',

  industry: 'industry',
  status: 'status',
  assigneduserid: 'assigned_user_id',
  assigneduser: 'assigned_user_id',
  followupdate: 'follow_up_date',
  followup: 'follow_up_date',
  notes: 'notes',
};

function buildStagedRow(params: {
  importId: string;
  rowNumber: number;
  rawRow: ParsedCsvRow;
}): StagedImportRow {
  const { importId, rowNumber, rawRow } = params;

  const staged: StagedImportRow = {
    import_id: importId,
    row_number: rowNumber,
    company_name: null,
    contact_person: null,
    title: null,
    email: null,
    phone: null,
    website: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    industry: null,
    status: null,
    assigned_user_id: null,
    follow_up_date: null,
    notes: null,
    raw_data: rawRow,
    validation_error: null,
  };

  for (const [header, rawValue] of Object.entries(rawRow)) {
    const normalizedHeader = normalizeHeader(header);
    const field = FIELD_MAP[normalizedHeader];

    if (!field) continue;

    const trimmed = rawValue.trim();
    const value = trimmed.length > 0 ? trimmed : null;
    staged[field] = value as never;
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

  return staged;
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
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'CSV file exceeds 10MB limit' }, { status: 400 });
  }

  const text = await file.text();
  const parsedRows = toObjects(parseCsv(text));

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: 'CSV contains no data rows' }, { status: 400 });
  }

  if (parsedRows.length > MAX_ROWS) {
    return NextResponse.json({ error: `CSV exceeds ${MAX_ROWS} row limit` }, { status: 400 });
  }

  const { data: importRecord, error: importError } = await auth.supabase
    .from('imports')
    .insert([
      {
        file_name: file.name,
        uploaded_by: auth.userId,
        status: 'uploaded',
        row_count: parsedRows.length,
      },
    ])
    .select('id')
    .maybeSingle();

  if (importError || !importRecord) {
    return NextResponse.json(
      { error: importError?.message || 'Failed to create import record' },
      { status: 500 },
    );
  }

  const stagedRows = parsedRows.map((rawRow, index) =>
    buildStagedRow({
      importId: importRecord.id,
      rowNumber: index + 1,
      rawRow,
    }),
  );

  const chunkSize = 500;
  for (let i = 0; i < stagedRows.length; i += chunkSize) {
    const chunk = stagedRows.slice(i, i + chunkSize);
    const { error: rowInsertError } = await auth.supabase.from('import_rows').insert(chunk);

    if (rowInsertError) {
      await auth.supabase
        .from('imports')
        .update({
          status: 'failed',
          error_message: rowInsertError.message,
        })
        .eq('id', importRecord.id);

      return NextResponse.json(
        { error: `Failed to stage rows: ${rowInsertError.message}` },
        { status: 500 },
      );
    }
  }

  const validCount = stagedRows.filter((row) => !row.validation_error).length;
  const invalidCount = stagedRows.length - validCount;

  await auth.supabase
    .from('imports')
    .update({
      status: 'preview_ready',
      valid_row_count: validCount,
      invalid_row_count: invalidCount,
    })
    .eq('id', importRecord.id);

  return NextResponse.redirect(new URL(`/dashboard/import/${importRecord.id}`, request.url), 303);
}
