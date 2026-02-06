import { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
