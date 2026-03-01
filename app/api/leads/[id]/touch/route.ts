import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { markLeadTouched } from '@/lib/leads';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await context.params;
  try {
    const profile = await getUserProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await markLeadTouched(leadId, profile.id, profile.username);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to touch lead' }, { status: 400 });
  }
}
