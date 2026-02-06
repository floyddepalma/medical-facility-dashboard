import { useState, FormEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: 'var(--bg-body)', position: 'relative',
      padding: '24px',
    }}>
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          position: 'absolute', top: '24px', right: '24px',
          backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)', padding: '8px 16px',
          borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
        }}
      >
        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      </button>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '18px', marginBottom: '16px',
          }}>
            MF
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
            Medical Facility Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Sign in to manage your facility
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {error && (
            <div className="error" role="alert" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="primary"
              style={{ width: '100%', fontSize: '15px', fontWeight: 600, minHeight: '44px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{
          marginTop: '20px', padding: '16px 20px',
          background: 'var(--bg-surface)', borderRadius: '10px',
          border: '1px solid var(--border-default)', fontSize: '13px',
          color: 'var(--text-secondary)', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px', fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Test Credentials
          </div>
          <div>Admin: admin@clinic.com</div>
          <div>Doctor: sarah.johnson@clinic.com</div>
          <div>Doctor: michael.chen@clinic.com</div>
          <div>Doctor: emily.rodriguez@clinic.com</div>
          <div>Assistant: assistant@clinic.com</div>
          <div style={{ marginTop: '6px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
            Password for all: password123
          </div>
        </div>
      </div>
    </div>
  );
}
