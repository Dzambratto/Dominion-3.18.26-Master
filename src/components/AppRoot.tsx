import { useState } from 'react';
import { AppProvider } from '@/lib/store';
import { LandingPage } from '@/components/LandingPage';
import { DashboardShell } from '@/components/DashboardShell';

export function AppRoot() {
  const [inApp, setInApp] = useState(false);

  return (
    <AppProvider>
      {inApp ? (
        <DashboardShell />
      ) : (
        <LandingPage onEnterApp={() => setInApp(true)} />
      )}
    </AppProvider>
  );
}
