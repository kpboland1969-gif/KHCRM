import 'server-only';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function formatDate(dt: string | null) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default function AnalyticsPage() {
  return <div style={{ padding: 24, color: 'white' }}>Analytics page is rendering ✅</div>;
}
