import { useState, useEffect, type ReactNode } from 'react';
import { Icons } from '../../components/icons/Icons';
import { configApi, aiApi, exportApi, authApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import type { UserConfig } from '../../types';

type FontTheme = 'sans' | 'serif' | 'mono';
type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsViewProps {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  fontTheme: FontTheme;
  setFontTheme: (value: FontTheme) => void;
}

// Section wrapper component - defined outside to prevent re-creation
function Section({
  title,
  icon,
  children,
  darkMode
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  darkMode: boolean;
}) {
  return (
    <section className={`rounded-2xl border mb-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-zinc-200'
    }`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${
        darkMode ? 'border-slate-700' : 'border-zinc-100'
      }`}>
        <div className={`p-2 rounded-lg ${
          darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-spira-100 text-spira-600'
        }`}>
          {icon}
        </div>
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Row component - defined outside to prevent re-creation
function Row({
  label,
  children,
  darkMode
}: {
  label: string;
  children: ReactNode;
  darkMode: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 last:mb-0">
      <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-zinc-700'}`}>
        {label}
      </span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Change Password Modal Component
function ChangePasswordModal({
  isOpen,
  onClose,
  darkMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-slate-700' : 'border-zinc-200'
        }`}>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            Change Password
          </h3>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-500'
                  : 'bg-white border-zinc-300 text-zinc-900 focus:border-spira-500'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-indigo-500' : 'focus:ring-spira-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-500'
                  : 'bg-white border-zinc-300 text-zinc-900 focus:border-spira-500'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-indigo-500' : 'focus:ring-spira-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-500'
                  : 'bg-white border-zinc-300 text-zinc-900 focus:border-spira-500'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-indigo-500' : 'focus:ring-spira-500'
              }`}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-spira-600 hover:bg-spira-700 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SettingsView({ darkMode, themeMode, setThemeMode, fontTheme, setFontTheme }: SettingsViewProps) {
  const { showToast } = useToast();

  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rssFeedType, setRssFeedType] = useState<'all' | 'interested' | 'favorite'>('interested');
  const [rssFeedCopied, setRssFeedCopied] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Local form state (separate from server config)
  const [formData, setFormData] = useState({
    unmarked_retention_days: 30,
    trash_retention_days: 7,
    archive_after_days: 90,
    ai_provider: 'gemini',
    ai_model: '',
    ai_api_key: '',
    ai_base_url: '',
    zotero_api_key: '',
    zotero_library_id: '',
    zotero_collection: '',
    systemPrompt: '',
  });
  const [isDefaultPrompt, setIsDefaultPrompt] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const fontOptions: { value: FontTheme; label: string }[] = [
    { value: 'sans', label: 'Sans' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
  ];

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [configData, promptData] = await Promise.all([
          configApi.get(),
          aiApi.getPrompt(),
        ]);
        setConfig(configData);
        setFormData({
          unmarked_retention_days: configData.unmarked_retention_days ?? 30,
          trash_retention_days: configData.trash_retention_days ?? 7,
          archive_after_days: configData.archive_after_days ?? 90,
          ai_provider: configData.ai_provider ?? 'gemini',
          ai_model: configData.ai_model ?? '',
          ai_api_key: '',
          ai_base_url: configData.ai_base_url ?? '',
          zotero_api_key: '',
          zotero_library_id: configData.zotero_library_id ?? '',
          zotero_collection: configData.zotero_collection ?? '',
          systemPrompt: promptData.prompt || '',
        });
        setIsDefaultPrompt(promptData.is_default);
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const updateFormField = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Build update object, only include non-empty values for sensitive fields
      const updates: Record<string, unknown> = {
        unmarked_retention_days: formData.unmarked_retention_days,
        trash_retention_days: formData.trash_retention_days,
        archive_after_days: formData.archive_after_days,
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
        ai_base_url: formData.ai_base_url || undefined,
        zotero_library_id: formData.zotero_library_id || undefined,
        zotero_collection: formData.zotero_collection || undefined,
      };

      // Only include API keys if they were changed (not empty)
      if (formData.ai_api_key) {
        updates.ai_api_key = formData.ai_api_key;
      }
      if (formData.zotero_api_key) {
        updates.zotero_api_key = formData.zotero_api_key;
      }

      await configApi.update(updates);

      // Save prompt if changed
      if (formData.systemPrompt !== config?.sage_prompt) {
        await aiApi.updatePrompt(formData.systemPrompt);
        setIsDefaultPrompt(false);
      }

      showToast('Settings saved', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20 max-w-3xl mx-auto">
      <header className="mb-8">
        <h2 className={`text-3xl font-serif font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
          Settings
        </h2>
      </header>

      {/* General Settings */}
      <Section title="General" icon={<Icons.Sliders />} darkMode={darkMode}>
        <Row label="Unread Article Retention (Days)" darkMode={darkMode}>
          <input
            type="number"
            value={formData.unmarked_retention_days}
            onChange={(e) => updateFormField('unmarked_retention_days', parseInt(e.target.value) || 30)}
            className={`w-20 px-3 py-1.5 rounded-lg border text-sm text-center ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          />
        </Row>
        <Row label="Discarded Article Retention (Days)" darkMode={darkMode}>
          <input
            type="number"
            value={formData.trash_retention_days}
            onChange={(e) => updateFormField('trash_retention_days', parseInt(e.target.value) || 7)}
            className={`w-20 px-3 py-1.5 rounded-lg border text-sm text-center ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          />
        </Row>
        <Row label="Auto-Archive Inbox (Days)" darkMode={darkMode}>
          <input
            type="number"
            value={formData.archive_after_days}
            onChange={(e) => updateFormField('archive_after_days', parseInt(e.target.value) || 90)}
            className={`w-20 px-3 py-1.5 rounded-lg border text-sm text-center ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          />
        </Row>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={<Icons.Palette />} darkMode={darkMode}>
        {/* Theme Mode */}
        <Row label="Theme" darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-zinc-100'}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('light')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'light'
                  ? darkMode
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-white text-zinc-900 shadow'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icons.Sun />
              <span>Light</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'dark'
                  ? darkMode
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-white text-zinc-900 shadow'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icons.Moon />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('system')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'system'
                  ? darkMode
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-white text-zinc-900 shadow'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icons.Monitor />
              <span>System</span>
            </button>
          </div>
        </Row>

        {/* Font Theme */}
        <Row label="Font" darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-zinc-100'}`}>
            {fontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontTheme(option.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  option.value === 'sans' ? 'font-sans' :
                  option.value === 'serif' ? 'font-serif' : 'font-mono'
                } ${
                  fontTheme === option.value
                    ? darkMode
                      ? 'bg-slate-700 text-white shadow'
                      : 'bg-white text-zinc-900 shadow'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-300'
                      : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* AI Settings */}
      <Section title="AI Intelligence" icon={<Icons.Robot />} darkMode={darkMode}>
        <Row label="AI Provider" darkMode={darkMode}>
          <select
            value={formData.ai_provider}
            onChange={(e) => updateFormField('ai_provider', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai_compatible">OpenAI Compatible</option>
          </select>
        </Row>
        <Row label="Model" darkMode={darkMode}>
          <input
            type="text"
            placeholder="gemini-2.5-flash"
            value={formData.ai_model}
            onChange={(e) => updateFormField('ai_model', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>
        <Row label="API Key" darkMode={darkMode}>
          <input
            type="password"
            placeholder={config?.ai_api_key_configured ? '••••••••' : 'Enter API key'}
            value={formData.ai_api_key}
            onChange={(e) => updateFormField('ai_api_key', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>
        <Row label="API Base URL" darkMode={darkMode}>
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={formData.ai_base_url}
            onChange={(e) => updateFormField('ai_base_url', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-xs ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-zinc-700'}`}>
              System Prompt
            </span>
            {!isDefaultPrompt && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={async () => {
                  try {
                    const response = await aiApi.resetPrompt();
                    updateFormField('systemPrompt', response.prompt);
                    setIsDefaultPrompt(true);
                    showToast('Prompt reset to default', 'success');
                  } catch {
                    showToast('Failed to reset prompt', 'error');
                  }
                }}
                className={`text-xs font-medium ${
                  darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-spira-600 hover:text-spira-700'
                }`}
              >
                Reset to default
              </button>
            )}
          </div>
          <textarea
            className={`w-full h-48 px-3 py-2 rounded-lg border text-xs font-mono leading-relaxed resize-none ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-800 placeholder-zinc-400'
            }`}
            placeholder="Enter custom instructions for AI summaries..."
            value={formData.systemPrompt}
            onChange={(e) => updateFormField('systemPrompt', e.target.value)}
          />
        </div>
      </Section>

      {/* Zotero Integration */}
      <Section title="Zotero Integration" icon={<Icons.Link />} darkMode={darkMode}>
        <Row label="API Key" darkMode={darkMode}>
          <input
            type="password"
            placeholder={config?.zotero_api_key_configured ? '••••••••' : 'Enter API key'}
            value={formData.zotero_api_key}
            onChange={(e) => updateFormField('zotero_api_key', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>
        <Row label="Library ID" darkMode={darkMode}>
          <input
            type="text"
            placeholder="1234567"
            value={formData.zotero_library_id}
            onChange={(e) => updateFormField('zotero_library_id', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>
        <Row label="Default Collection" darkMode={darkMode}>
          <input
            type="text"
            placeholder="Focus"
            value={formData.zotero_collection}
            onChange={(e) => updateFormField('zotero_collection', e.target.value)}
            className={`w-44 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </Row>
      </Section>

      {/* RSS Feed */}
      <Section title="RSS Feed" icon={<Icons.Sources />} darkMode={darkMode}>
        <Row label="Feed Type" darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-zinc-100'}`}>
            {(['all', 'interested', 'favorite'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRssFeedType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  rssFeedType === type
                    ? darkMode
                      ? 'bg-slate-700 text-white shadow'
                      : 'bg-white text-zinc-900 shadow'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-300'
                      : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {type === 'all' ? 'All' : type === 'interested' ? 'Saved' : 'Favorites'}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Feed URL" darkMode={darkMode}>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={exportApi.getRssFeedUrl(rssFeedType)}
              className={`w-56 px-3 py-1.5 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-slate-300'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-700'
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                await navigator.clipboard.writeText(exportApi.getRssFeedUrl(rssFeedType));
                setRssFeedCopied(true);
                showToast('Feed URL copied', 'success');
                setTimeout(() => setRssFeedCopied(false), 2000);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                rssFeedCopied
                  ? 'bg-green-500 text-white'
                  : darkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {rssFeedCopied ? <Icons.Check /> : <Icons.Share />}
            </button>
          </div>
        </Row>
      </Section>

      {/* Account */}
      <Section title="Account" icon={<Icons.User />} darkMode={darkMode}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              darkMode ? 'bg-indigo-600' : 'bg-spira-600'
            }`}>
              A
            </div>
            <div>
              <div className={`font-medium ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                Admin User
              </div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                Single User Mode
              </div>
            </div>
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPasswordModalOpen(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              darkMode
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Change Password
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={<Icons.Info />} darkMode={darkMode}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={darkMode ? 'text-slate-400' : 'text-zinc-500'}>Version</span>
            <span className={darkMode ? 'text-slate-200' : 'text-zinc-800'}>1.0.0 (Beta)</span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-slate-400' : 'text-zinc-500'}>Build</span>
            <span className={darkMode ? 'text-slate-200' : 'text-zinc-800'}>2025.12.16</span>
          </div>
        </div>
      </Section>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSaveAll}
            className={`px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
              darkMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-spira-600 hover:bg-spira-500 text-white'
            } disabled:opacity-50`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
