import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { updateLeadFollowUp } from '@/lib/leads';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await context.params;
  try {
    const body = await req.json();
    const followUpDate = body?.followUpDate ?? null;
    const profile = await getUserProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await updateLeadFollowUp(leadId, profile.id, profile.username, followUpDate);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to update follow-up' }, { status: 400 });
  }
}
