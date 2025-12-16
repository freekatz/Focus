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
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-spira-50'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-500' : 'bg-spira-600'} text-white`}>
            <Icons.Focus />
          </div>
          <h1 className={`text-3xl font-bold tracking-tight font-serif ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Focus</h1>
        </div>

        <h2 className={`text-xl font-medium text-center mb-6 ${darkMode ? 'text-slate-300' : 'text-zinc-600'}`}>
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-spira-200'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-spira-200'
              }`}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-xl font-medium transition-all ${
              darkMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-spira-600 hover:bg-spira-500 text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
