import { createAuthProvider } from '@repo/auth-client';
import { toast } from '@repo/ui';

// Use Vite env vars for production deployment
const IDP_URL = import.meta.env.VITE_IDP_URL || 'http://localhost:3000';
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3001';
const OTHER_APP_URL = import.meta.env.VITE_OTHER_APP_URL || 'http://localhost:3002';

const { AuthProvider, useAuth } = createAuthProvider({
  clientId: 'app-a',
  redirectUri: `${APP_URL}/callback`,
  idpUrl: IDP_URL,
  onSuccess: (message) => toast.success(message),
  onError: (message) => toast.error(message),
});

export { AuthProvider, useAuth };
export { IDP_URL, APP_URL, OTHER_APP_URL };
