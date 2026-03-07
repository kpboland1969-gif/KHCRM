import Link from 'next/link';
import { getUserProfile } from '@/lib/getUserProfile';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function badgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
    case 'preview_ready':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/20';
    case 'failed':
      return 'bg-red-500/15 text-red-300 border-red-500/20';
    default:
      return 'bg-white/10 text-white/80 border-white/10';
  }
}

export default async function ImportPage() {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Imports</h1>
        <p className="mt-3 text-sm text-red-200">
          No server-side session found. You appear to be signed out on the server.
        </p>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Imports</h1>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          Only admins can access the import system.
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: imports, error } = await supabase
    .from('imports')
    .select(
      'id, file_name, status, row_count, valid_row_count, invalid_row_count, error_message, created_at, completed_at',
    )
    .order('created_at', { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Imports</h1>
        <p className="text-sm text-white/60">
          Upload CSV files, preview validation results, and commit clean rows into leads.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Upload CSV</h2>
          <p className="mt-1 text-sm text-white/60">
            Optional fields such as website, email, industry, address fields, and notes can be
            blank. Rows are only flagged when required values are missing or invalid.
          </p>
        </div>

        <form
          action="/api/imports/upload"
          method="post"
          encType="multipart/form-data"
          className="flex flex-col gap-4 md:flex-row md:items-end"
        >
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium text-white/80" htmlFor="file">
              CSV File
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-white/15"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.10]"
          >
            Upload and Preview
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Imports</h2>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            Failed to load imports: {error.message}
          </div>
        ) : null}

        {!error && (!imports || imports.length === 0) ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
            No imports yet.
          </div>
        ) : null}

        {!error && imports && imports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/60">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">Valid</th>
                  <th className="px-3 py-2">Invalid</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-3 py-3">
                      <div className="font-medium text-white">{item.file_name}</div>
                      {item.error_message ? (
                        <div className="mt-1 text-xs text-red-300">{item.error_message}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{item.row_count}</td>
                    <td className="px-3 py-3">{item.valid_row_count}</td>
                    <td className="px-3 py-3">{item.invalid_row_count}</td>
                    <td className="px-3 py-3 text-white/70">{formatWhen(item.created_at)}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/dashboard/import/${item.id}`}
                        className="text-blue-300 hover:text-blue-200 hover:underline"
                      >
                        Open Preview
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
