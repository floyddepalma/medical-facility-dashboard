import { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { useTheme } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import AIAssistant from './components/AIAssistant';

type View = 'dashboard' | 'calendar';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Update timestamp every 10 seconds
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(interval);
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
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: 'var(--text-secondary)', fontSize: '15px',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Extract initials from first and last name only (ignore titles like Dr.)
  const getInitials = (fullName: string): string => {
    const words = fullName.trim().split(/\s+/).filter(word => 
      word.length > 0 && !word.match(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss)$/i)
    );
    if (words.length === 0) return '??';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    // First and last name initials
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const roleLabel = user.role === 'doctor' ? 'Doctor'
    : user.role === 'medical_assistant' ? 'Medical Assistant'
    : 'Admin';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'var(--bg-nav)',
        boxShadow: 'var(--shadow-nav)',
        padding: '0',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: '56px',
        }}>
          {/* Logo / Brand */}
          <div
            onClick={() => setCurrentView('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentView('dashboard'); } }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginRight: '32px',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '14px',
            }}>
              MF
            </div>
            <span style={{
              color: 'var(--text-on-primary)',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}>
              MedFacility
            </span>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {(['dashboard', 'calendar'] as View[]).map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                aria-current={currentView === view ? 'page' : undefined}
                style={{
                  backgroundColor: currentView === view ? 'var(--bg-nav-hover)' : 'transparent',
                  color: currentView === view ? 'var(--text-on-primary)' : 'var(--text-on-nav)',
                  border: 'none',
                  borderBottom: currentView === view ? '2px solid var(--color-primary)' : '2px solid transparent',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: currentView === view ? 600 : 400,
                  transition: 'all 0.15s ease',
                  minHeight: '40px',
                }}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{
                backgroundColor: 'var(--bg-nav-hover)',
                color: 'var(--text-on-nav)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '34px',
                transition: 'all 0.15s ease',
              }}
            >
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '4px 12px 4px 4px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-nav-hover)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--color-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px', fontWeight: 600,
              }}>
                {getInitials(user.name)}
              </div>
              <div>
                <div style={{ color: 'var(--text-on-primary)', fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>
                  {user.name}
                </div>
                <div style={{ color: 'var(--text-on-nav)', fontSize: '11px', lineHeight: 1.3 }}>
                  {roleLabel}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-on-nav)',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '34px',
                transition: 'all 0.15s ease',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1 }}>
        {currentView === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
        {currentView === 'calendar' && <CalendarView user={user} />}
      </main>

      {/* AI Assistant */}
      <AIAssistant />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 24px',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-accent-success)',
              }} />
              <span>System Operational</span>
            </div>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>v1.0.0</span>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('Support: support@medfacility.com'); }}
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Help & Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
