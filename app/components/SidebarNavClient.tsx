"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/ui/cn';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'user', 'manager'] },
  { name: 'Leads', href: '/dashboard/leads', roles: ['admin', 'user', 'manager'] },
  { name: 'Documents', href: '/dashboard/documents', roles: ['admin', 'user', 'manager'] },
  { name: 'Import', href: '/dashboard/import', roles: ['admin', 'user', 'manager'] },
  { name: 'Manager Queue', href: '/dashboard/manager-queue', roles: ['admin', 'manager'] },
  { name: 'Settings', href: '/dashboard/settings', roles: ['admin'] },
];

export default function SidebarNavClient({ profile }: {
  profile: {
    username: string;
    role: 'admin' | 'user' | 'manager';
  } | null;
}) {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-2">
      {navItems
        .filter(item => profile && item.roles.includes(profile.role))
        .map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-6 py-2 rounded-[var(--radius-ctl)] hover:bg-[var(--primary)]/10 transition',
              pathname === item.href ? 'bg-[var(--primary)]/20 font-bold' : ''
            )}
          >
            {item.name}
          </Link>
        ))}
    </nav>
  );
}
