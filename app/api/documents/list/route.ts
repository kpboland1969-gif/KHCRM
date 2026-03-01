import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { listDocuments } from '@/lib/documents';

export async function GET(_req: NextRequest) {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await listDocuments(profile.id, profile.role);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}
