import * as React from 'react';

interface PageSidebarContextType {
  // Register a sidebar open handler for the current page
  registerSidebar: (openFn: () => void) => void;
  unregisterSidebar: () => void;
  // Open the registered sidebar
  openPageSidebar: () => void;
  // Check if a page sidebar is registered
  hasPageSidebar: boolean;
}

const PageSidebarContext = React.createContext<PageSidebarContextType | null>(null);

export function PageSidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpenFn, setSidebarOpenFn] = React.useState<(() => void) | null>(null);

  const registerSidebar = React.useCallback((openFn: () => void) => {
    setSidebarOpenFn(() => openFn);
  }, []);

  const unregisterSidebar = React.useCallback(() => {
    setSidebarOpenFn(null);
  }, []);

  const openPageSidebar = React.useCallback(() => {
    sidebarOpenFn?.();
  }, [sidebarOpenFn]);

  return (
    <PageSidebarContext.Provider value={{
      registerSidebar,
      unregisterSidebar,
      openPageSidebar,
      hasPageSidebar: sidebarOpenFn !== null,
    }}>
      {children}
    </PageSidebarContext.Provider>
  );
}

export function usePageSidebar() {
  const context = React.useContext(PageSidebarContext);
  if (!context) {
    throw new Error('usePageSidebar must be used within PageSidebarProvider');
  }
  return context;
}
