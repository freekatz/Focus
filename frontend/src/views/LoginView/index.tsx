import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/icons/Icons';

interface LoginViewProps {
  darkMode: boolean;
}

export function LoginView({ darkMode }: LoginViewProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${darkMode ? 'bg-theme-base' : 'bg-theme-base'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-theme-surface' : 'bg-theme-surface'}`}>
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-theme-accent' : 'bg-theme-accent'} text-white`}>
            <Icons.Focus />
          </div>
          <h1 className={`text-3xl font-bold tracking-tight font-serif ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>Focus</h1>
        </div>

        <h2 className={`text-xl font-medium text-center mb-6 ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 rounded-lg border outline-none focus:ring-2 transition-micro ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text focus:ring-theme-accent'
                  : 'bg-theme-muted border-theme-border text-theme-text focus:ring-theme-accent/30'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 rounded-lg border outline-none focus:ring-2 transition-micro ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text focus:ring-theme-accent'
                  : 'bg-theme-muted border-theme-border text-theme-text focus:ring-theme-accent/30'
              }`}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center p-2 rounded-lg bg-red-50">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg font-medium transition-micro cursor-pointer ${
              darkMode
                ? 'bg-theme-accent hover:bg-theme-accent text-white'
                : 'bg-theme-accent hover:bg-theme-accent-hover text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
