import { Outlet } from 'react-router-dom';
import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';
import { DesktopSidebar } from './desktop-sidebar';
import { VoiceAssistantWidget } from '@/components/domain/voice-assistant-widget';

function AppShell() {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col md:flex-row">
      <DesktopSidebar />

      <div className="flex-1 md:pl-60">
        <AppHeader />

        <main className="pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
      <VoiceAssistantWidget />
    </div>
  );
}

export { AppShell };
