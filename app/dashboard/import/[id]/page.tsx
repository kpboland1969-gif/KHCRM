import Link from 'next/link';
import { getUserProfile } from '@/lib/getUserProfile';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function normalizeValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export default async function ImportPreviewPage({ params }: PageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Import Preview</h1>
        <p className="mt-3 text-sm text-red-200">
          No server-side session found. You appear to be signed out on the server.
        </p>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import Preview</h1>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          Only admins can access the import system.
        </div>
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: importRecord, error: importError } = await supabase
    .from('imports')
    .select(
      'id, file_name, status, row_count, valid_row_count, invalid_row_count, error_message, created_at, completed_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (importError || !importRecord) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import Preview</h1>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          Import not found or could not be loaded.
        </div>
      </div>
    );
  }

  const { data: rows, error: rowsError } = await supabase
    .from('import_rows')
    .select(
      'id, row_number, company_name, contact_person, email, phone, website, city, state, industry, status, validation_error',
    )
    .eq('import_id', id)
    .order('row_number', { ascending: true })
    .limit(200);

  const previewRows = Array.isArray(rows) ? rows : [];

  const emails = Array.from(
    new Set(
      previewRows
        .map((row) => normalizeValue(row.email)?.toLowerCase() || null)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const phones = Array.from(
    new Set(
      previewRows
        .map((row) => normalizeValue(row.phone))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const duplicateEmailSet = new Set<string>();
  const duplicatePhoneSet = new Set<string>();

  if (emails.length > 0) {
    const { data: emailMatches } = await supabase.from('leads').select('email').in('email', emails);

    for (const row of emailMatches || []) {
      const email = normalizeValue(row.email)?.toLowerCase();
      if (email) duplicateEmailSet.add(email);
    }
  }

  if (phones.length > 0) {
    const { data: phoneMatches } = await supabase.from('leads').select('phone').in('phone', phones);

    for (const row of phoneMatches || []) {
      const phone = normalizeValue(row.phone);
      if (phone) duplicatePhoneSet.add(phone);
    }
  }

  const duplicatePreviewCount = previewRows.filter((row) => {
    const email = normalizeValue(row.email)?.toLowerCase() || null;
    const phone = normalizeValue(row.phone) || null;
    return (email && duplicateEmailSet.has(email)) || (phone && duplicatePhoneSet.has(phone));
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Import Preview</h1>
          <p className="text-sm text-white/60">{importRecord.file_name}</p>
        </div>

        <Link
          href="/dashboard/import"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
        >
          Back to Imports
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Status</div>
          <div className="mt-2 text-lg font-semibold">{importRecord.status}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Rows</div>
          <div className="mt-2 text-lg font-semibold">{importRecord.row_count}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Valid</div>
          <div className="mt-2 text-lg font-semibold">{importRecord.valid_row_count}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Invalid</div>
          <div className="mt-2 text-lg font-semibold">{importRecord.invalid_row_count}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Duplicates</div>
          <div className="mt-2 text-lg font-semibold">{duplicatePreviewCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Created</div>
          <div className="mt-2 text-sm font-medium">{formatWhen(importRecord.created_at)}</div>
        </div>
      </div>

      {importRecord.error_message ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          {importRecord.error_message}
        </div>
      ) : null}

      {duplicatePreviewCount > 0 ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          {duplicatePreviewCount} staged row(s) appear to match existing leads by email or phone.
          The current commit flow will skip duplicates, but this preview now shows them before
          commit.
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Staged Rows</h2>
            <p className="mt-1 text-sm text-white/60">
              Previewing the first 200 rows. Rows with validation errors will not be committed.
            </p>
          </div>

          <form action="/api/imports/commit" method="post">
            <input type="hidden" name="importId" value={importRecord.id} />
            <button
              type="submit"
              disabled={importRecord.status === 'completed' || importRecord.valid_row_count === 0}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Commit Valid Rows
            </button>
          </form>
        </div>

        {rowsError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            Failed to load staged rows: {rowsError.message}
          </div>
        ) : null}

        {!rowsError && previewRows.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
            No staged rows found for this import.
          </div>
        ) : null}

        {!rowsError && previewRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/60">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Website</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Industry</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Validation</th>
                  <th className="px-3 py-2">Duplicate</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const email = normalizeValue(row.email)?.toLowerCase() || null;
                  const phone = normalizeValue(row.phone) || null;

                  const duplicateReasons: string[] = [];
                  if (email && duplicateEmailSet.has(email)) duplicateReasons.push('Email match');
                  if (phone && duplicatePhoneSet.has(phone)) duplicateReasons.push('Phone match');

                  const duplicateLabel =
                    duplicateReasons.length > 0 ? duplicateReasons.join(', ') : null;

                  return (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="px-3 py-3">{row.row_number}</td>
                      <td className="px-3 py-3 font-medium">{row.company_name || '—'}</td>
                      <td className="px-3 py-3">{row.contact_person || '—'}</td>
                      <td className="px-3 py-3">{row.email || '—'}</td>
                      <td className="px-3 py-3">{row.phone || '—'}</td>
                      <td className="px-3 py-3">{row.website || '—'}</td>
                      <td className="px-3 py-3">
                        {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-3">{row.industry || '—'}</td>
                      <td className="px-3 py-3">{row.status || '—'}</td>
                      <td className="px-3 py-3">
                        {row.validation_error ? (
                          <span className="text-red-300">{row.validation_error}</span>
                        ) : (
                          <span className="text-emerald-300">Valid</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {duplicateLabel ? (
                          <span className="text-amber-300">{duplicateLabel}</span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
