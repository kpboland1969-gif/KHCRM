import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api/adminGuard';
import { jsonErr, jsonOk, safeErrorMessage } from '@/lib/api/response';

type InviteBody = {
  email?: unknown;
  full_name?: unknown;
  role?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function toTrimmedStringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Admin guard (also ensures authenticated)
    await requireAdmin();

    const body = (await req.json()) as InviteBody;

    const email = toTrimmedStringOrEmpty(body.email).toLowerCase();
    const full_name = toTrimmedStringOrEmpty(body.full_name);
    const role = toTrimmedStringOrEmpty(body.role);

    if (!isNonEmptyString(email)) {
      return jsonErr('Email is required.', { status: 400 });
    }
    // Very light email sanity check (avoid rejecting valid-but-weird addresses)
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
      return jsonErr('Email looks invalid.', { status: 400 });
    }
    if (!isNonEmptyString(full_name)) {
      return jsonErr('Full name is required.', { status: 400 });
    }
    if (!isNonEmptyString(role)) {
      return jsonErr('Role is required.', { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Compute redirectTo for invite link
    const origin =
      req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Invite via Supabase Admin API
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/complete-invite`,
      data: {
        full_name,
        role,
      },
    });

    if (inviteRes.error) {
      return jsonErr(safeErrorMessage(inviteRes.error), { status: 400 });
    }

    const invitedUser = inviteRes.data?.user;
    if (!invitedUser?.id) {
      return jsonErr('Invite succeeded but no user id was returned.', { status: 500 });
    }

    // Create/upsert profile row (service role bypasses RLS)
    const upsertRes = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: invitedUser.id,
          email,
          full_name,
          role,
          disabled: false,
        },
        { onConflict: 'id' },
      )
      .select('id,email,full_name,role,disabled')
      .single();

    if (upsertRes.error) {
      return jsonErr(safeErrorMessage(upsertRes.error), { status: 500 });
    }

    return jsonOk({
      user: upsertRes.data,
      invited: true,
    });
  } catch (err) {
    return jsonErr(safeErrorMessage(err), { status: 500 });
  }
}
