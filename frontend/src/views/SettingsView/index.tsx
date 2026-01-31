import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { configApi, exportApi, authApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { colorThemes, type ColorThemeId, validateCustomTheme } from '../../themes';
import type { UserConfig } from '../../types';

type FontTheme = 'sans' | 'serif' | 'mono';
type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsViewProps {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  fontTheme: FontTheme;
  setFontTheme: (value: FontTheme) => void;
  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (value: ColorThemeId) => void;
  customThemeJson: string | null;
  setCustomThemeJson: (value: string | null) => void;
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
      darkMode ? 'bg-theme-surface border-theme-border' : 'bg-theme-surface border-theme-border'
    }`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${
        darkMode ? 'border-theme-border' : 'border-theme-border'
      }`}>
        <div className={`p-2 rounded-lg ${
          darkMode ? 'bg-theme-accent/20 text-theme-accent' : 'bg-theme-accent/10 text-theme-accent'
        }`}>
          {icon}
        </div>
        <h3 className={`font-semibold ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>{title}</h3>
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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 last:mb-0">
      <span className={`text-body-sm font-medium ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
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
        darkMode ? 'bg-theme-surface' : 'bg-theme-surface'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-theme-border' : 'border-theme-border'
        }`}>
          <h3 className={`text-h3 font-bold ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>
            Change Password
          </h3>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${
              darkMode ? 'hover:bg-theme-muted text-theme-text-secondary' : 'hover:bg-theme-muted text-theme-text-secondary'
            }`}
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 md:px-6 space-y-4">
          <div>
            <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'
            }`}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
                  : 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-theme-accent' : 'focus:ring-theme-accent'
              }`}
            />
          </div>

          <div>
            <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'
            }`}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
                  : 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-theme-accent' : 'focus:ring-theme-accent'
              }`}
            />
          </div>

          <div>
            <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'
            }`}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
                  : 'bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent'
              } focus:outline-none focus:ring-1 ${
                darkMode ? 'focus:ring-theme-accent' : 'focus:ring-theme-accent'
              }`}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-body-sm ${
              message.type === 'success'
                ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600')
                : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full min-h-touch py-3 rounded-xl text-ui font-medium transition-colors ${
              darkMode
                ? 'bg-theme-accent hover:bg-theme-accent-hover text-white'
                : 'bg-theme-accent hover:bg-theme-accent-hover text-white'
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

export function SettingsView({ darkMode, themeMode, setThemeMode, fontTheme, setFontTheme, fontSize, setFontSize, colorTheme, setColorTheme, customThemeJson, setCustomThemeJson }: SettingsViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { language, setLanguage, languages } = useLanguage();

  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rssFeedType, setRssFeedType] = useState<'all' | 'interested' | 'favorite'>('interested');
  const [rssFeedCopied, setRssFeedCopied] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [customThemeModalOpen, setCustomThemeModalOpen] = useState(false);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [customThemeError, setCustomThemeError] = useState<string | null>(null);

  // Local form state (separate from server config)
  const [formData, setFormData] = useState({
    unmarked_retention_days: 30,
    trash_retention_days: 7,
    archive_after_days: 90,
    ai_provider: 'gemini',
    ai_model: '',
    ai_api_key: '',
    ai_base_url: '',
    auto_translate_abstract: true,
    zotero_api_key: '',
    zotero_library_id: '',
    zotero_collection: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const fontOptions: { value: FontTheme; label: string }[] = [
    { value: 'sans', label: 'Sans' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
  ];

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await configApi.get();
        setConfig(configData);
        setFormData({
          unmarked_retention_days: configData.unmarked_retention_days ?? 30,
          trash_retention_days: configData.trash_retention_days ?? 7,
          archive_after_days: configData.archive_after_days ?? 90,
          ai_provider: configData.ai_provider ?? 'gemini',
          ai_model: configData.ai_model ?? '',
          ai_api_key: '',
          ai_base_url: configData.ai_base_url ?? '',
          auto_translate_abstract: configData.auto_translate_abstract ?? true,
          zotero_api_key: '',
          zotero_library_id: configData.zotero_library_id ?? '',
          zotero_collection: configData.zotero_collection ?? '',
        });
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const updateFormField = (field: keyof typeof formData, value: string | number | boolean) => {
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
        auto_translate_abstract: formData.auto_translate_abstract,
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

      showToast(t('settings.settingsSaved'), 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast(t('settings.settingsSaveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-theme-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20 pt-4 md:pt-6 space-y-6">
      {/* General Settings */}
      <Section title={t('settings.general')} icon={<Icons.Sliders />} darkMode={darkMode}>
        <Row label={t('settings.unreadRetention')} darkMode={darkMode}>
          <input
            type="number"
            value={formData.unmarked_retention_days}
            onChange={(e) => updateFormField('unmarked_retention_days', parseInt(e.target.value) || 30)}
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text'
                : 'bg-theme-muted border-theme-border text-theme-text'
            }`}
          />
        </Row>
        <Row label={t('settings.discardedRetention')} darkMode={darkMode}>
          <input
            type="number"
            value={formData.trash_retention_days}
            onChange={(e) => updateFormField('trash_retention_days', parseInt(e.target.value) || 7)}
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text'
                : 'bg-theme-muted border-theme-border text-theme-text'
            }`}
          />
        </Row>
        <Row label={t('settings.autoArchive')} darkMode={darkMode}>
          <input
            type="number"
            value={formData.archive_after_days}
            onChange={(e) => updateFormField('archive_after_days', parseInt(e.target.value) || 90)}
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text'
                : 'bg-theme-muted border-theme-border text-theme-text'
            }`}
          />
        </Row>
      </Section>

      {/* Appearance */}
      <Section title={t('settings.appearance')} icon={<Icons.Palette />} darkMode={darkMode}>
        {/* Language */}
        <Row label={t('settings.language')} darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLanguage(lang.code)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  language === lang.code
                    ? darkMode
                      ? 'bg-theme-selected text-theme-text shadow'
                      : 'bg-theme-surface text-theme-text shadow'
                    : darkMode
                      ? 'text-theme-text-secondary hover:text-theme-text'
                      : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        </Row>

        {/* Color Theme */}
        <Row label={t('settings.colorTheme')} darkMode={darkMode}>
          <div className="flex gap-2">
            {colorThemes.map((theme) => {
              const isSelected = colorTheme === theme.id;
              const displayName = t(`settings.language`) === '语言' ? theme.nameZh : theme.name;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setColorTheme(theme.id)}
                  title={displayName}
                  className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-theme-accent ring-2 ring-theme-accent/30 scale-110'
                      : 'border-theme-border hover:border-theme-accent/50 hover:scale-105'
                  }`}
                >
                  {/* Top half: light mode color */}
                  <div
                    className="absolute inset-x-0 top-0 h-1/2"
                    style={{ backgroundColor: theme.light.base }}
                  />
                  {/* Bottom half: dark mode color */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1/2"
                    style={{ backgroundColor: theme.dark.base }}
                  />
                  {/* Accent dot in center */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: theme.light.accent }}
                  />
                  {/* Selection checkmark */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-4 h-4 text-white drop-shadow">
                        <Icons.Check />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
            {/* Custom Theme Button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const defaultTemplate = JSON.stringify({
                  light: {
                    base: "#F5FBF7",
                    surface: "#FAFCFB",
                    muted: "#EDF5F0",
                    border: "#D4E5DA",
                    selected: "#E5F0E9",
                    text: "#2D4A3E",
                    textSecondary: "#4A6B5D",
                    textTertiary: "#6B8F7D",
                    textMuted: "#9BB5A6",
                    accent: "#10B981",
                    accentHover: "#059669",
                    accentSoft: "#34D399",
                    success: "#10B981",
                    warning: "#D97706",
                    error: "#DC2626",
                    favorite: "#F59E0B"
                  },
                  dark: {
                    base: "#1A2F23",
                    surface: "#243D2E",
                    muted: "#2D4A3A",
                    border: "#3D6B52",
                    selected: "#2D4A3A",
                    text: "#E8F0EA",
                    textSecondary: "#C8D9CC",
                    textTertiary: "#9BB5A6",
                    textMuted: "#6B8F7D",
                    accent: "#4ADE80",
                    accentHover: "#22C55E",
                    accentSoft: "#86EFAC",
                    success: "#4ADE80",
                    warning: "#FBBF24",
                    error: "#F87171",
                    favorite: "#FCD34D"
                  }
                }, null, 2);
                setCustomThemeInput(customThemeJson || defaultTemplate);
                setCustomThemeError(null);
                setCustomThemeModalOpen(true);
              }}
              title={t(`settings.language`) === '语言' ? '自定义' : 'Custom'}
              className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex items-center justify-center ${
                colorTheme === 'custom'
                  ? 'border-theme-accent ring-2 ring-theme-accent/30 scale-110 bg-theme-accent/20'
                  : 'border-dashed border-theme-border hover:border-theme-accent/50 hover:scale-105 bg-theme-muted'
              }`}
            >
              <Icons.Plus />
            </button>
          </div>
        </Row>

        {/* Theme Mode */}
        <Row label={t('settings.theme')} darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('light')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'light'
                  ? darkMode
                    ? 'bg-theme-selected text-theme-text shadow'
                    : 'bg-theme-surface text-theme-text shadow'
                  : darkMode
                    ? 'text-theme-text-secondary hover:text-theme-text'
                    : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <Icons.Sun />
              <span>{t('settings.themeLight')}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'dark'
                  ? darkMode
                    ? 'bg-theme-selected text-theme-text shadow'
                    : 'bg-theme-surface text-theme-text shadow'
                  : darkMode
                    ? 'text-theme-text-secondary hover:text-theme-text'
                    : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <Icons.Moon />
              <span>{t('settings.themeDark')}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode('system')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === 'system'
                  ? darkMode
                    ? 'bg-theme-selected text-theme-text shadow'
                    : 'bg-theme-surface text-theme-text shadow'
                  : darkMode
                    ? 'text-theme-text-secondary hover:text-theme-text'
                    : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <Icons.Monitor />
              <span>{t('settings.themeSystem')}</span>
            </button>
          </div>
        </Row>

        {/* Font Theme */}
        <Row label={t('settings.font')} darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            {fontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontTheme(option.value)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  option.value === 'sans' ? 'font-sans' :
                  option.value === 'serif' ? 'font-serif' : 'font-mono'
                } ${
                  fontTheme === option.value
                    ? darkMode
                      ? 'bg-theme-selected text-theme-text shadow'
                      : 'bg-theme-surface text-theme-text shadow'
                    : darkMode
                      ? 'text-theme-text-secondary hover:text-theme-text'
                      : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>

        {/* Font Size */}
        <Row label={t('settings.fontSize')} darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            {([
              { value: 'small' as FontSize, label: t('settings.fontSizeSmall') },
              { value: 'medium' as FontSize, label: t('settings.fontSizeMedium') },
              { value: 'large' as FontSize, label: t('settings.fontSizeLarge') },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize(option.value)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  fontSize === option.value
                    ? darkMode
                      ? 'bg-theme-selected text-theme-text shadow'
                      : 'bg-theme-surface text-theme-text shadow'
                    : darkMode
                      ? 'text-theme-text-secondary hover:text-theme-text'
                      : 'text-theme-text-secondary hover:text-theme-text'
                }`}
                style={{
                  fontSize: option.value === 'small' ? '0.875rem' : option.value === 'large' ? '1.125rem' : '1rem'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* AI Settings */}
      <Section title={t('settings.aiIntelligence')} icon={<Icons.Robot />} darkMode={darkMode}>
        <Row label={t('settings.aiProvider')} darkMode={darkMode}>
          <select
            value={formData.ai_provider}
            onChange={(e) => updateFormField('ai_provider', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text'
                : 'bg-theme-muted border-theme-border text-theme-text'
            }`}
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai_compatible">OpenAI Compatible</option>
          </select>
        </Row>
        <Row label={t('settings.aiModel')} darkMode={darkMode}>
          <input
            type="text"
            placeholder="gemini-2.5-flash"
            value={formData.ai_model}
            onChange={(e) => updateFormField('ai_model', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
        <Row label={t('settings.apiKey')} darkMode={darkMode}>
          <input
            type="password"
            placeholder={config?.ai_api_key_configured ? '••••••••' : t('settings.enterApiKey')}
            value={formData.ai_api_key}
            onChange={(e) => updateFormField('ai_api_key', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
        <Row label={t('settings.apiBaseUrl')} darkMode={darkMode}>
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={formData.ai_base_url}
            onChange={(e) => updateFormField('ai_base_url', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-caption ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
        <Row label={t('settings.autoTranslateAbstract')} darkMode={darkMode}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateFormField('auto_translate_abstract', !formData.auto_translate_abstract)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              formData.auto_translate_abstract
                ? darkMode ? 'bg-theme-accent' : 'bg-theme-accent'
                : darkMode ? 'bg-theme-border' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                formData.auto_translate_abstract ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </Row>
      </Section>

      {/* Zotero Integration */}
      <Section title={t('settings.zoteroIntegration')} icon={<Icons.Link />} darkMode={darkMode}>
        <Row label={t('settings.apiKey')} darkMode={darkMode}>
          <input
            type="password"
            placeholder={config?.zotero_api_key_configured ? '••••••••' : t('settings.enterApiKey')}
            value={formData.zotero_api_key}
            onChange={(e) => updateFormField('zotero_api_key', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
        <Row label={t('settings.libraryId')} darkMode={darkMode}>
          <input
            type="text"
            placeholder="1234567"
            value={formData.zotero_library_id}
            onChange={(e) => updateFormField('zotero_library_id', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
        <Row label={t('settings.defaultCollection')} darkMode={darkMode}>
          <input
            type="text"
            placeholder="Focus"
            value={formData.zotero_collection}
            onChange={(e) => updateFormField('zotero_collection', e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
                : 'bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary'
            }`}
          />
        </Row>
      </Section>

      {/* RSS Feed */}
      <Section title={t('settings.rssFeed')} icon={<Icons.Sources />} darkMode={darkMode}>
        <Row label={t('settings.feedType')} darkMode={darkMode}>
          <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            {(['all', 'interested', 'favorite'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRssFeedType(type)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  rssFeedType === type
                    ? darkMode
                      ? 'bg-theme-selected text-theme-text shadow'
                      : 'bg-theme-surface text-theme-text shadow'
                    : darkMode
                      ? 'text-theme-text-secondary hover:text-theme-text'
                      : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                {type === 'all' ? t('settings.feedAll') : type === 'interested' ? t('settings.feedSaved') : t('settings.feedFavorites')}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t('settings.feedUrl')} darkMode={darkMode}>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={exportApi.getRssFeedUrl(rssFeedType)}
              className={`w-56 min-h-touch px-3 rounded-xl border text-body-sm ${
                darkMode
                  ? 'bg-theme-muted border-theme-border text-theme-text-secondary'
                  : 'bg-theme-muted border-theme-border text-theme-text-secondary'
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                await navigator.clipboard.writeText(exportApi.getRssFeedUrl(rssFeedType));
                setRssFeedCopied(true);
                showToast(t('settings.feedUrlCopied'), 'success');
                setTimeout(() => setRssFeedCopied(false), 2000);
              }}
              className={`min-h-touch px-3 rounded-xl transition-colors ${
                rssFeedCopied
                  ? 'bg-accent-success text-white'
                  : darkMode
                    ? 'bg-theme-selected text-theme-text-secondary hover:bg-theme-muted'
                    : 'bg-theme-muted text-theme-text-secondary hover:bg-theme-border'
              }`}
            >
              {rssFeedCopied ? <Icons.Check /> : <Icons.Share />}
            </button>
          </div>
        </Row>
      </Section>

      {/* Account */}
      <Section title={t('settings.account')} icon={<Icons.User />} darkMode={darkMode}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              darkMode ? 'bg-theme-accent' : 'bg-theme-accent'
            }`}>
              A
            </div>
            <div>
              <div className={`font-medium ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>
                {t('settings.adminUser')}
              </div>
              <div className={`text-caption ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
                {t('settings.singleUserMode')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPasswordModalOpen(true)}
            className={`min-h-touch px-4 rounded-xl text-ui-sm font-medium border transition-colors ${
              darkMode
                ? 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'
                : 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'
            }`}
          >
            {t('settings.changePassword')}
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title={t('settings.about')} icon={<Icons.Info />} darkMode={darkMode}>
        <div className="space-y-3 text-body-sm">
          <div className="flex justify-between">
            <span className="text-theme-text-secondary">{t('settings.version')}</span>
            <span className="text-theme-text">{__APP_VERSION__}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-theme-text-secondary">{t('settings.build')}</span>
            <span className="text-theme-text">{__BUILD_DATE__}</span>
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
            className={`min-h-touch px-6 rounded-xl text-ui font-medium shadow-lg transition-all ${
              darkMode
                ? 'bg-theme-accent hover:bg-theme-accent-hover text-white'
                : 'bg-theme-accent hover:bg-theme-accent-hover text-white'
            } disabled:opacity-50`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('common.saving')}
              </span>
            ) : (
              t('settings.saveChanges')
            )}
          </button>
        </div>
      )}

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        darkMode={darkMode}
      />

      {/* Custom Theme Editor Modal */}
      {customThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCustomThemeModalOpen(false)} />
          <div className={`relative w-full max-w-lg rounded-2xl shadow-xl ${
            darkMode ? 'bg-theme-surface' : 'bg-theme-surface'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              darkMode ? 'border-theme-border' : 'border-theme-border'
            }`}>
              <h3 className={`text-h3 font-bold ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>
                {t(`settings.language`) === '语言' ? '自定义配色' : 'Custom Theme'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomThemeModalOpen(false)}
                onMouseDown={(e) => e.preventDefault()}
                className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${
                  darkMode ? 'hover:bg-theme-muted text-theme-text-secondary' : 'hover:bg-theme-muted text-theme-text-secondary'
                }`}
              >
                <Icons.X />
              </button>
            </div>

            <div className="px-5 py-4 md:px-6 space-y-4">
              <p className={`text-body-sm ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
                {t(`settings.language`) === '语言'
                  ? '输入 JSON 格式的配色方案，包含 light 和 dark 两个调色板。'
                  : 'Enter a JSON color scheme with light and dark palettes.'}
              </p>

              <textarea
                value={customThemeInput}
                onChange={(e) => {
                  setCustomThemeInput(e.target.value);
                  setCustomThemeError(null);
                }}
                rows={12}
                className={`w-full p-3 rounded-xl border text-body-sm font-mono ${
                  darkMode
                    ? 'bg-theme-muted border-theme-border text-theme-text'
                    : 'bg-theme-muted border-theme-border text-theme-text'
                } focus:outline-none focus:ring-1 focus:ring-theme-accent`}
                placeholder='{"light": {...}, "dark": {...}}'
              />

              {customThemeError && (
                <div className={`p-3 rounded-xl text-body-sm ${
                  darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                }`}>
                  {customThemeError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCustomThemeModalOpen(false)}
                  className={`flex-1 min-h-touch py-3 rounded-xl text-ui font-medium border transition-colors ${
                    darkMode
                      ? 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'
                      : 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'
                  }`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const validation = validateCustomTheme(customThemeInput);
                    if (!validation.valid) {
                      setCustomThemeError(validation.error || 'Invalid theme');
                      return;
                    }
                    setCustomThemeJson(customThemeInput);
                    setColorTheme('custom');
                    setCustomThemeModalOpen(false);
                    showToast(t(`settings.language`) === '语言' ? '自定义配色已应用' : 'Custom theme applied', 'success');
                  }}
                  className={`flex-1 min-h-touch py-3 rounded-xl text-ui font-medium transition-colors ${
                    darkMode
                      ? 'bg-theme-accent hover:bg-theme-accent-hover text-white'
                      : 'bg-theme-accent hover:bg-theme-accent-hover text-white'
                  }`}
                >
                  {t(`settings.language`) === '语言' ? '应用配色' : 'Apply Theme'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
