'use client';

import Navigation from '@/components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
