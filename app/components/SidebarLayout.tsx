import { ReactNode } from 'react';
import SidebarNavClient from './SidebarNavClient';

interface SidebarLayoutProps {
  children: ReactNode;
  profile: {
    username: string;
    role: 'admin' | 'user' | 'manager';
  } | null;
}



export default function SidebarLayout({ children, profile }: SidebarLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-[16rem_1fr]">
      <aside className="bg-[var(--card)]/80 backdrop-blur-md border-r border-[var(--border-strong)] flex flex-col justify-between">
        <div>
          <div className="p-6 font-bold text-xl border-b border-[var(--border-strong)]">KHCRM</div>
          <SidebarNavClient profile={profile} />
        </div>
        <div className="p-6 border-t border-[var(--border-strong)]">
          {profile ? (
            <div>
              <div className="font-semibold">{profile.username}</div>
              <div className="text-xs text-[var(--muted)]">{profile.role}</div>
            </div>
          ) : (
            <div className="text-xs text-[var(--muted)]">Not signed in</div>
          )}
        </div>
      </aside>
      <main className="bg-transparent p-8">{children}</main>
    </div>
  );
}
