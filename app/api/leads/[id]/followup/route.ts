import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { updateLeadFollowUp } from '@/lib/leads';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { followUpDate } = await req.json();
  await updateLeadFollowUp(params.id, profile.id, profile.username, followUpDate);
  return NextResponse.json({ ok: true });
}
