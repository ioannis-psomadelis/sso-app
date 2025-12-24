import { ReactNode } from 'react';
import { Layout, useDebug } from '@repo/shared-app';
import { useAuth } from '../context/AuthContext';

interface ConnectedLayoutProps {
  children: ReactNode;
}

/**
 * Connects the shared Layout component to local auth and debug contexts.
 * This bridges the app-specific state to the shared component.
 */
export function ConnectedLayout({ children }: ConnectedLayoutProps) {
  const {
    isAuthenticated,
    isAdmin,
    user,
    login,
    logout,
    tokens,
    decodedTokens,
    accessTokenExpiry
  } = useAuth();
  const { events } = useDebug();

  return (
    <Layout
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      user={user}
      onLogin={login}
      onLogout={logout}
      events={events}
      tokens={tokens}
      decodedTokens={decodedTokens}
      accessTokenExpiry={accessTokenExpiry}
    >
      {children}
    </Layout>
  );
}
