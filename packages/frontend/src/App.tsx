import { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { useTheme } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';

type View = 'dashboard' | 'calendar';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      if (api.getToken()) {
        const { user } = await api.getCurrentUser();
        setUser(user);
      }
    } catch (err) {
      api.clearToken();
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(email: string, password: string) {
    const { user } = await api.login(email, password);
    setUser(user);
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      {/* Sticky Navigation Header */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#1f2937',
        padding: '12px 0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{
                backgroundColor: currentView === 'dashboard' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              style={{
                backgroundColor: currentView === 'calendar' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Calendar
            </button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid #4b5563',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <div style={{ color: '#d1d5db', fontSize: '14px' }}>
              {user.name} {user.role === 'doctor' && '(Doctor)'}
              {user.role === 'medical_assistant' && '(Medical Assistant)'}
              {user.role === 'admin' && '(Admin)'}
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* View Content */}
      {currentView === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
      {currentView === 'calendar' && <CalendarView user={user} />}
    </>
  );
}

export default App;
