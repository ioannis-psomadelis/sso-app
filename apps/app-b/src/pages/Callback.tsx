import { Callback as SharedCallback } from '@repo/shared-app';
import { useAuth } from '../context/AuthContext';

export function Callback() {
  const { handleCallback, isAuthenticated, isLoading } = useAuth();

  return (
    <SharedCallback
      handleCallback={handleCallback}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
    />
  );
}
