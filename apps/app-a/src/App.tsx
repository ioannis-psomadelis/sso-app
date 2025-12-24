import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, DebugProvider, taskFlowTheme } from '@repo/shared-app';
import { ConnectedLayout } from './components/ConnectedLayout';
import { Home } from './pages/Home';
import { Callback } from './pages/Callback';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { AuthProvider, IDP_URL, OTHER_APP_URL } from './context/AuthContext';

export default function App() {
  return (
    <ThemeProvider theme={taskFlowTheme} otherAppUrl={OTHER_APP_URL} idpUrl={IDP_URL}>
      <DebugProvider>
        <AuthProvider>
          <ConnectedLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/callback" element={<Callback />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </ConnectedLayout>
        </AuthProvider>
      </DebugProvider>
    </ThemeProvider>
  );
}
