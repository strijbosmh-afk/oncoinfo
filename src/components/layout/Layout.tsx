import { ReactNode } from 'react';
import { Header } from './Header';
import { AppSidebar, MobileModuleNav } from './AppSidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-muted/20 lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <Header />
        <MobileModuleNav />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col">{children}</main>
      </div>
    </div>
  );
}
