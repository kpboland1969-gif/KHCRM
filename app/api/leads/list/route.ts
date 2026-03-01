import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { listLeadsPaged } from '@/lib/leads';

export async function GET(req: NextRequest) {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = [25, 50, 100].includes(Number(url.searchParams.get('pageSize'))) ? Number(url.searchParams.get('pageSize')) : 25;

  const rawSort = url.searchParams.get('sort') ?? 'followup';
  const sort: 'followup' | 'created' | 'company' =
    rawSort === 'followup' || rawSort === 'created' || rawSort === 'company'
      ? rawSort
      : 'followup';

  const rawDir = url.searchParams.get('dir') ?? 'asc';
  const dir: 'asc' | 'desc' = rawDir === 'asc' || rawDir === 'desc' ? rawDir : 'asc';

  const status = url.searchParams.get('status') || undefined;
  const industry = url.searchParams.get('industry') || undefined;
  const dueOnly = url.searchParams.get('dueOnly') === 'true';
  const q = url.searchParams.get('q') || undefined;
  try {
    const { leads, total } = await listLeadsPaged({
      userId: profile.id,
      role: profile.role,
      page,
      pageSize,
      sort,
      dir,
      status,
      industry,
      dueOnly,
      q
    });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total,
      totalPages,
      leads
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch leads' }, { status: 500 });
  }
}
