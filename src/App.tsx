import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { InsertLog } from './components/InsertLog';
import { EditLog } from './components/EditLog';
import { Terminal, Shield, LogOut, Activity } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="nav-container">
          <NavLink to="/dashboard" className="brand">
            <Terminal size={22} style={{ color: '#3b82f6' }} />
            SOAP<span>Logger</span>
          </NavLink>

          <nav className="nav-links">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} />
                Dashboard
              </div>
            </NavLink>
            <NavLink 
              to="/simulator" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={16} />
                Simulator (Insert)
              </div>
            </NavLink>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="user-badge">
              <Shield size={14} style={{ color: user?.role === 'Admin' ? '#f87171' : '#60a5fa' }} />
              <span style={{ fontWeight: 500 }}>{user?.username}</span>
              <span className={`role-tag ${user?.role.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>

            <button 
              onClick={logout} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '6px' }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, background: 'rgba(0,0,0,0.05)' }}>
        {children}
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '20px', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
        marginTop: '40px'
      }}>
        SOAP Log Monitor Portal &copy; {new Date().getFullYear()} - Operations Security Control
      </footer>
    </div>
  );
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

const LoginGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <LoginGuard>
            <Login />
          </LoginGuard>
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } 
      />
      <Route 
        path="/simulator" 
        element={
          <AuthGuard>
            <InsertLog />
          </AuthGuard>
        } 
      />
      <Route 
        path="/edit/:id" 
        element={
          <AuthGuard>
            <EditLog />
          </AuthGuard>
        } 
      />

      {/* Fallback routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
