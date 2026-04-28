'use client';

import Navigation from '@/components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
