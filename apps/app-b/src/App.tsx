import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Callback } from './pages/Callback';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { AuthProvider } from './context/AuthContext';
import { DebugProvider } from './context/DebugContext';

export default function App() {
  return (
    <DebugProvider>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </DebugProvider>
  );
}
