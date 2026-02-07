import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icons } from "../../components/icons/Icons";
import { configApi, exportApi, authApi } from "../../api";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  colorThemes,
  type ColorThemeId,
  validateCustomTheme,
} from "../../themes";
import type { UserConfig, AIProvider, AIModelEntry, AIModelsConfig, AITaskConfig } from "../../types";

type FontTheme = "sans" | "serif" | "mono";
type ThemeMode = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

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
  darkMode,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  darkMode: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border mb-6 ${
        darkMode
          ? "bg-theme-surface border-theme-border"
          : "bg-theme-surface border-theme-border"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-4 border-b ${
          darkMode ? "border-theme-border" : "border-theme-border"
        }`}
      >
        <div
          className={`p-2 rounded-lg ${
            darkMode
              ? "bg-theme-accent/20 text-theme-accent"
              : "bg-theme-accent/10 text-theme-accent"
          }`}
        >
          {icon}
        </div>
        <h3
          className={`font-semibold ${darkMode ? "text-theme-text" : "text-theme-text"}`}
        >
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Row component - defined outside to prevent re-creation
function Row({
  label,
  children,
  darkMode,
}: {
  label: string;
  children: ReactNode;
  darkMode: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 last:mb-0">
      <span
        className={`text-body-sm font-medium ${darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"}`}
      >
        {label}
      </span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Provider Edit Modal Component — edits provider credentials + inline model list
function ProviderEditModal({
  isOpen,
  provider,
  onSave,
  onClose,
  darkMode,
  t,
}: {
  isOpen: boolean;
  provider: AIProvider | null;
  onSave: (provider: AIProvider) => void;
  onClose: () => void;
  darkMode: boolean;
  t: (key: string) => string;
}) {
  const [formData, setFormData] = useState<AIProvider>({
    id: "",
    name: "",
    provider: "openai_compatible",
    api_key: "",
    base_url: "",
    models: [],
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        ...provider,
        api_key: "", // Don't show existing API key
      });
    } else {
      setFormData({
        id: crypto.randomUUID().slice(0, 8),
        name: "",
        provider: "openai_compatible",
        api_key: "",
        base_url: "",
        models: [{ id: crypto.randomUUID().slice(0, 6), name: "", model: "" }],
      });
    }
  }, [provider, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out models with empty model ID
    const validModels = formData.models.filter((m) => m.model.trim());
    onSave({ ...formData, models: validModels });
  };

  const addModelEntry = () => {
    setFormData({
      ...formData,
      models: [...formData.models, { id: crypto.randomUUID().slice(0, 6), name: "", model: "" }],
    });
  };

  const updateModelEntry = (index: number, field: keyof AIModelEntry, value: string) => {
    const newModels = [...formData.models];
    newModels[index] = { ...newModels[index], [field]: value };
    // Auto-fill name from model ID if name is empty
    if (field === "model" && !newModels[index].name) {
      newModels[index].name = value;
    }
    setFormData({ ...formData, models: newModels });
  };

  const removeModelEntry = (index: number) => {
    const newModels = formData.models.filter((_, i) => i !== index);
    setFormData({ ...formData, models: newModels });
  };

  const inputCls = "w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent placeholder-theme-text-tertiary focus:outline-none focus:ring-1 focus:ring-theme-accent";
  const labelCls = "block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[90vh] rounded-2xl shadow-xl bg-theme-surface flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme-border flex-shrink-0">
          <h3 className="text-h3 font-bold text-theme-text">
            {provider ? t("settings.editProvider") : t("settings.addProvider")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            className="min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors hover:bg-theme-muted text-theme-text-secondary"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 md:px-6 space-y-4 overflow-y-auto flex-1">
          {/* Provider Name */}
          <div>
            <label className={labelCls}>{t("settings.providerName")}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Google AI"
              className={inputCls}
            />
          </div>

          {/* Provider Type */}
          <div>
            <label className={labelCls}>{t("settings.providerType")}</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className={inputCls}
            >
              <option value="openai">{t("settings.openai")}</option>
              <option value="openai_compatible">{t("settings.openaiCompatible")}</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className={labelCls}>{t("settings.apiKey")}</label>
            <input
              type="password"
              value={formData.api_key || ""}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder={provider?.api_key_configured ? "••••••••" : t("settings.enterApiKey")}
              className={inputCls}
            />
          </div>

          {/* Base URL */}
          <div>
            <label className={labelCls}>{t("settings.apiBaseUrl")}</label>
            <input
              type="text"
              value={formData.base_url || ""}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value || undefined })}
              placeholder="https://api.openai.com/v1"
              className={inputCls}
            />
          </div>

          {/* Models list */}
          <div>
            <label className={labelCls}>
              {`${formData.models.length} ${formData.models.length === 1 ? "model" : "models"}`}
            </label>
            <div className="space-y-2">
              {formData.models.map((model, index) => (
                <div key={model.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={model.name}
                    onChange={(e) => updateModelEntry(index, "name", e.target.value)}
                    placeholder={t("settings.modelName")}
                    className="flex-1 min-h-touch p-2 rounded-lg border text-body-sm bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:outline-none focus:ring-1 focus:ring-theme-accent"
                  />
                  <input
                    type="text"
                    value={model.model}
                    onChange={(e) => updateModelEntry(index, "model", e.target.value)}
                    placeholder={t("settings.modelId")}
                    required
                    className="flex-1 min-h-touch p-2 rounded-lg border text-body-sm bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:outline-none focus:ring-1 focus:ring-theme-accent"
                  />
                  <button
                    type="button"
                    onClick={() => removeModelEntry(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Icons.X />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addModelEntry}
                onMouseDown={(e) => e.preventDefault()}
                className="w-full py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer text-theme-accent hover:bg-theme-muted"
              >
                {t("settings.addModelToProvider")}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 min-h-touch py-3 rounded-xl text-ui font-medium transition-colors bg-theme-accent hover:bg-theme-accent-hover text-white"
            >
              {t("settings.saveProvider")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Provider List Section - collapsible provider cards with nested models
function ProviderListSection({
  providers,
  tasks,
  onEditProvider,
  onDeleteProvider,
  onAddProvider,
  darkMode,
  t,
}: {
  providers: AIProvider[];
  tasks: Record<string, AITaskConfig>;
  onEditProvider: (provider: AIProvider) => void;
  onDeleteProvider: (providerId: string) => void;
  onAddProvider: () => void;
  darkMode: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (provider: AIProvider) => {
    // Check if any model in this provider is used by tasks
    const isUsed = Object.values(tasks).some((task) =>
      task.model_ids.some((cid) => cid.startsWith(provider.id + ":"))
    );
    if (isUsed) {
      alert(t("settings.providerInUse"));
      return;
    }
    if (confirm(t("settings.confirmDeleteProvider"))) {
      onDeleteProvider(provider.id);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-body-sm font-medium text-theme-text-secondary">
        {t("settings.myProviders")}
      </div>
      <div className="rounded-xl border border-theme-border p-2 space-y-2">
        {providers.map((provider) => {
          const isExpanded = expandedIds.has(provider.id);
          return (
            <div
              key={provider.id}
              className="rounded-lg bg-theme-muted overflow-hidden"
            >
              {/* Collapsed header */}
              <div className="flex items-center justify-between py-2 px-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(provider.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                >
                  <span className="w-4 h-4 flex-shrink-0 text-theme-text-tertiary transition-transform" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    <Icons.ChevronDown />
                  </span>
                  <span className="font-medium text-sm text-theme-text truncate">
                    {provider.name}
                  </span>
                  <span className="text-xs text-theme-text-tertiary flex-shrink-0">
                    {t("settings.modelCount", { count: provider.models.length })}
                  </span>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditProvider(provider)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-1.5 rounded transition-colors cursor-pointer hover:bg-theme-border text-theme-text-secondary"
                    title={t("common.edit")}
                  >
                    <Icons.Edit />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(provider)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors cursor-pointer"
                    title={t("common.delete")}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
              {/* Expanded model list */}
              {isExpanded && provider.models.length > 0 && (
                <div className="px-3 pb-2 pt-0 ml-6 space-y-1">
                  {provider.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center gap-2 py-1 text-xs text-theme-text-secondary"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-theme-accent flex-shrink-0" />
                      <span className="truncate">{model.name || model.model}</span>
                      <span className="text-theme-text-tertiary truncate hidden sm:inline">
                        {model.model}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddProvider}
          onMouseDown={(e) => e.preventDefault()}
          className="w-full py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer text-theme-accent hover:bg-theme-muted"
        >
          {t("settings.addProvider")}
        </button>
      </div>
    </div>
  );
}

// Task Assignment Section - manages compound model references (pid:mid) and auto-run toggle
function TaskAssignmentSection({
  title,
  description,
  taskConfig,
  providers,
  onChangeConfig,
  darkMode,
  t,
}: {
  title: string;
  description?: string;
  taskConfig: AITaskConfig;
  providers: AIProvider[];
  onChangeConfig: (config: AITaskConfig) => void;
  darkMode: boolean;
  t: (key: string) => string;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const taskIds = taskConfig.model_ids;

  // Resolve compound ID "pid:mid" to display info
  const resolveModel = (compoundId: string): { providerName: string; modelName: string; modelId: string } | null => {
    const [pid, mid] = compoundId.split(":", 2);
    const provider = providers.find((p) => p.id === pid);
    if (!provider) return null;
    const model = provider.models.find((m) => m.id === mid);
    if (!model) return null;
    return { providerName: provider.name, modelName: model.name || model.model, modelId: model.model };
  };

  // Build flat list of all available compound IDs not yet in this task
  const availableModels: { compoundId: string; providerName: string; modelName: string; modelId: string }[] = [];
  for (const provider of providers) {
    for (const model of provider.models) {
      const cid = `${provider.id}:${model.id}`;
      if (!taskIds.includes(cid)) {
        availableModels.push({
          compoundId: cid,
          providerName: provider.name,
          modelName: model.name || model.model,
          modelId: model.model,
        });
      }
    }
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newIds = [...taskIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    onChangeConfig({ ...taskConfig, model_ids: newIds });
  };

  const handleRemove = (index: number) => {
    const newIds = [...taskIds];
    newIds.splice(index, 1);
    onChangeConfig({ ...taskConfig, model_ids: newIds });
  };

  const handleAdd = (compoundId: string) => {
    onChangeConfig({ ...taskConfig, model_ids: [...taskIds, compoundId] });
    setDropdownOpen(false);
  };

  const handleToggleEnabled = () => {
    onChangeConfig({ ...taskConfig, enabled: !taskConfig.enabled });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-body-sm font-medium text-theme-text-secondary">
            {title}
          </div>
          {description && (
            <div className="text-xs text-theme-text-tertiary mt-0.5">
              {description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-theme-text-tertiary">
            {t("settings.autoRun")}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleEnabled}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
              taskConfig.enabled
                ? "bg-theme-accent"
                : darkMode
                  ? "bg-theme-border"
                  : "bg-zinc-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                taskConfig.enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-theme-border p-2 space-y-2">
        {taskIds.map((cid, index) => {
          const resolved = resolveModel(cid);
          if (!resolved) return null;
          const isPrimary = index === 0;
          return (
            <div
              key={cid}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-theme-muted"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-theme-text-tertiary flex-shrink-0">
                  {isPrimary ? t("settings.primaryModel") : t("settings.backupModel")}
                </span>
                <span className="font-medium text-sm text-theme-text truncate">
                  {resolved.modelName}
                </span>
                <span className="text-xs text-theme-text-tertiary truncate hidden sm:inline">
                  {resolved.providerName}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-1.5 rounded transition-colors cursor-pointer hover:bg-theme-border text-theme-text-secondary"
                    title={t("settings.moveUp")}
                  >
                    <Icons.ChevronUp />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors cursor-pointer"
                  title={t("settings.removeFromTask")}
                >
                  <Icons.X />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add to task dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (availableModels.length === 0) return;
              setDropdownOpen(!dropdownOpen);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={`w-full py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              availableModels.length === 0
                ? "text-theme-text-tertiary cursor-not-allowed"
                : "text-theme-accent hover:bg-theme-muted"
            }`}
          >
            {availableModels.length === 0 ? t("settings.noModelsAvailable") : t("settings.addToTask")}
          </button>
          {dropdownOpen && availableModels.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-xl border shadow-lg overflow-hidden bg-theme-surface border-theme-border max-h-48 overflow-y-auto">
                {availableModels.map((item) => (
                  <button
                    key={item.compoundId}
                    type="button"
                    onClick={() => handleAdd(item.compoundId)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-theme-muted text-theme-text"
                  >
                    <span className="font-medium">{item.modelName}</span>
                    <span className="text-xs text-theme-text-tertiary ml-2">
                      {item.providerName}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to change password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-xl ${
          darkMode ? "bg-theme-surface" : "bg-theme-surface"
        }`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-theme-border" : "border-theme-border"
          }`}
        >
          <h3
            className={`text-h3 font-bold ${darkMode ? "text-theme-text" : "text-theme-text"}`}
          >
            Change Password
          </h3>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${
              darkMode
                ? "hover:bg-theme-muted text-theme-text-secondary"
                : "hover:bg-theme-muted text-theme-text-secondary"
            }`}
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 md:px-6 space-y-4">
          <div>
            <label
              className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
                darkMode
                  ? "text-theme-text-tertiary"
                  : "text-theme-text-tertiary"
              }`}
            >
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
                  : "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
              } focus:outline-none focus:ring-1 ${
                darkMode ? "focus:ring-theme-accent" : "focus:ring-theme-accent"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
                darkMode
                  ? "text-theme-text-tertiary"
                  : "text-theme-text-tertiary"
              }`}
            >
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
                  : "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
              } focus:outline-none focus:ring-1 ${
                darkMode ? "focus:ring-theme-accent" : "focus:ring-theme-accent"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
                darkMode
                  ? "text-theme-text-tertiary"
                  : "text-theme-text-tertiary"
              }`}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${
                darkMode
                  ? "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
                  : "bg-theme-muted border-theme-border text-theme-text focus:border-theme-accent"
              } focus:outline-none focus:ring-1 ${
                darkMode ? "focus:ring-theme-accent" : "focus:ring-theme-accent"
              }`}
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-body-sm ${
                message.type === "success"
                  ? darkMode
                    ? "bg-green-900/30 text-green-400"
                    : "bg-green-50 text-green-600"
                  : darkMode
                    ? "bg-red-900/30 text-red-400"
                    : "bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full min-h-touch py-3 rounded-xl text-ui font-medium transition-colors ${
              darkMode
                ? "bg-theme-accent hover:bg-theme-accent-hover text-white"
                : "bg-theme-accent hover:bg-theme-accent-hover text-white"
            } disabled:opacity-50`}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Change Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SettingsView({
  darkMode,
  themeMode,
  setThemeMode,
  fontTheme,
  setFontTheme,
  fontSize,
  setFontSize,
  colorTheme,
  setColorTheme,
  customThemeJson,
  setCustomThemeJson,
}: SettingsViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { language, setLanguage, languages } = useLanguage();

  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rssFeedType, setRssFeedType] = useState<
    "all" | "interested" | "favorite"
  >("interested");
  const [rssFeedCopied, setRssFeedCopied] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [customThemeModalOpen, setCustomThemeModalOpen] = useState(false);
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [customThemeError, setCustomThemeError] = useState<string | null>(null);

  // Local form state (separate from server config)
  const [formData, setFormData] = useState({
    unmarked_retention_days: 30,
    trash_retention_days: 7,
    archive_after_days: 90,
    ai_provider: "gemini",
    ai_model: "",
    ai_api_key: "",
    ai_base_url: "",
    zotero_api_key: "",
    zotero_library_id: "",
    zotero_collection: "",
  });

  // Unified AI models config state (provider-grouped)
  const [aiModelsConfig, setAiModelsConfig] = useState<AIModelsConfig>({
    providers: [],
    tasks: {
      translation: { model_ids: [], enabled: true },
      interpret: { model_ids: [], enabled: true },
    },
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Provider edit modal state
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  const fontOptions: { value: FontTheme; label: string }[] = [
    { value: "sans", label: "Sans" },
    { value: "serif", label: "Serif" },
    { value: "mono", label: "Mono" },
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
          ai_provider: configData.ai_provider ?? "gemini",
          ai_model: configData.ai_model ?? "",
          ai_api_key: "",
          ai_base_url: configData.ai_base_url ?? "",
          zotero_api_key: "",
          zotero_library_id: configData.zotero_library_id ?? "",
          zotero_collection: configData.zotero_collection ?? "",
        });
        // Load unified AI models config (provider-grouped)
        if (configData.ai_models_config) {
          const loadedConfig = configData.ai_models_config;
          const tasks = loadedConfig.tasks ?? {};
          if (!tasks.translation) {
            tasks.translation = { model_ids: [], enabled: configData.auto_translate_abstract ?? true };
          }
          if (!tasks.interpret) {
            tasks.interpret = { model_ids: [], enabled: configData.auto_interpret_arxiv ?? true };
          }
          setAiModelsConfig({
            providers: loadedConfig.providers ?? [],
            tasks,
          });
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const updateFormField = (
    field: keyof typeof formData,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateAiModelsConfig = (newConfig: AIModelsConfig) => {
    setAiModelsConfig(newConfig);
    setHasChanges(true);
  };

  // Provider handlers
  const handleAddProvider = () => {
    setEditingProvider(null);
    setIsProviderModalOpen(true);
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider);
    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = (provider: AIProvider) => {
    const existingIndex = aiModelsConfig.providers.findIndex((p) => p.id === provider.id);
    let newProviders: AIProvider[];
    if (existingIndex >= 0) {
      newProviders = [...aiModelsConfig.providers];
      newProviders[existingIndex] = {
        ...provider,
        api_key_configured: provider.api_key ? true : aiModelsConfig.providers[existingIndex].api_key_configured,
      };
    } else {
      newProviders = [...aiModelsConfig.providers, { ...provider, api_key_configured: !!provider.api_key }];
    }
    updateAiModelsConfig({ ...aiModelsConfig, providers: newProviders });
    setIsProviderModalOpen(false);
  };

  const handleDeleteProvider = (providerId: string) => {
    const newProviders = aiModelsConfig.providers.filter((p) => p.id !== providerId);
    // Also remove all compound IDs for this provider from tasks
    const newTasks = { ...aiModelsConfig.tasks };
    for (const taskName of Object.keys(newTasks)) {
      const task = newTasks[taskName];
      newTasks[taskName] = {
        ...task,
        model_ids: task.model_ids.filter((cid) => !cid.startsWith(providerId + ":")),
      };
    }
    updateAiModelsConfig({ providers: newProviders, tasks: newTasks });
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

      // Only include AI models config if there are providers configured
      if (aiModelsConfig.providers.length > 0) {
        updates.ai_models_config = {
          providers: aiModelsConfig.providers.map((p) => ({
            id: p.id,
            name: p.name,
            provider: p.provider,
            api_key: p.api_key || undefined,
            base_url: p.base_url || undefined,
            models: p.models.map((m) => ({
              id: m.id,
              name: m.name,
              model: m.model,
            })),
          })),
          tasks: aiModelsConfig.tasks,
        };
      }

      await configApi.update(updates);

      showToast(t("settings.settingsSaved"), "success");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast(t("settings.settingsSaveFailed"), "error");
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
      <Section
        title={t("settings.general")}
        icon={<Icons.Sliders />}
        darkMode={darkMode}
      >
        <Row label={t("settings.unreadRetention")} darkMode={darkMode}>
          <input
            type="number"
            value={formData.unmarked_retention_days}
            onChange={(e) =>
              updateFormField(
                "unmarked_retention_days",
                parseInt(e.target.value) || 30,
              )
            }
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text"
                : "bg-theme-muted border-theme-border text-theme-text"
            }`}
          />
        </Row>
        <Row label={t("settings.discardedRetention")} darkMode={darkMode}>
          <input
            type="number"
            value={formData.trash_retention_days}
            onChange={(e) =>
              updateFormField(
                "trash_retention_days",
                parseInt(e.target.value) || 7,
              )
            }
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text"
                : "bg-theme-muted border-theme-border text-theme-text"
            }`}
          />
        </Row>
        <Row label={t("settings.autoArchive")} darkMode={darkMode}>
          <input
            type="number"
            value={formData.archive_after_days}
            onChange={(e) =>
              updateFormField(
                "archive_after_days",
                parseInt(e.target.value) || 90,
              )
            }
            className={`w-20 min-h-touch px-3 rounded-xl border text-body-sm text-center ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text"
                : "bg-theme-muted border-theme-border text-theme-text"
            }`}
          />
        </Row>
      </Section>

      {/* Appearance */}
      <Section
        title={t("settings.appearance")}
        icon={<Icons.Palette />}
        darkMode={darkMode}
      >
        {/* Language */}
        <Row label={t("settings.language")} darkMode={darkMode}>
          <div
            className={`flex p-1 rounded-lg ${darkMode ? "bg-theme-muted" : "bg-theme-muted"}`}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLanguage(lang.code)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  language === lang.code
                    ? darkMode
                      ? "bg-theme-selected text-theme-text shadow"
                      : "bg-theme-surface text-theme-text shadow"
                    : darkMode
                      ? "text-theme-text-secondary hover:text-theme-text"
                      : "text-theme-text-secondary hover:text-theme-text"
                }`}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        </Row>

        {/* Color Theme */}
        <Row label={t("settings.colorTheme")} darkMode={darkMode}>
          <div className="flex gap-2">
            {colorThemes.map((theme) => {
              const isSelected = colorTheme === theme.id;
              const displayName =
                t(`settings.language`) === "语言" ? theme.nameZh : theme.name;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setColorTheme(theme.id)}
                  title={displayName}
                  className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-theme-accent ring-2 ring-theme-accent/30 scale-110"
                      : "border-theme-border hover:border-theme-accent/50 hover:scale-105"
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
                const defaultTemplate = JSON.stringify(
                  {
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
                      favorite: "#F59E0B",
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
                      favorite: "#FCD34D",
                    },
                  },
                  null,
                  2,
                );
                setCustomThemeInput(customThemeJson || defaultTemplate);
                setCustomThemeError(null);
                setCustomThemeModalOpen(true);
              }}
              title={t(`settings.language`) === "语言" ? "自定义" : "Custom"}
              className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex items-center justify-center ${
                colorTheme === "custom"
                  ? "border-theme-accent ring-2 ring-theme-accent/30 scale-110 bg-theme-accent/20"
                  : "border-dashed border-theme-border hover:border-theme-accent/50 hover:scale-105 bg-theme-muted"
              }`}
            >
              <Icons.Plus />
            </button>
          </div>
        </Row>

        {/* Theme Mode */}
        <Row label={t("settings.theme")} darkMode={darkMode}>
          <div
            className={`flex p-1 rounded-lg ${darkMode ? "bg-theme-muted" : "bg-theme-muted"}`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode("light")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === "light"
                  ? darkMode
                    ? "bg-theme-selected text-theme-text shadow"
                    : "bg-theme-surface text-theme-text shadow"
                  : darkMode
                    ? "text-theme-text-secondary hover:text-theme-text"
                    : "text-theme-text-secondary hover:text-theme-text"
              }`}
            >
              <Icons.Sun />
              <span>{t("settings.themeLight")}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode("dark")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === "dark"
                  ? darkMode
                    ? "bg-theme-selected text-theme-text shadow"
                    : "bg-theme-surface text-theme-text shadow"
                  : darkMode
                    ? "text-theme-text-secondary hover:text-theme-text"
                    : "text-theme-text-secondary hover:text-theme-text"
              }`}
            >
              <Icons.Moon />
              <span>{t("settings.themeDark")}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setThemeMode("system")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                themeMode === "system"
                  ? darkMode
                    ? "bg-theme-selected text-theme-text shadow"
                    : "bg-theme-surface text-theme-text shadow"
                  : darkMode
                    ? "text-theme-text-secondary hover:text-theme-text"
                    : "text-theme-text-secondary hover:text-theme-text"
              }`}
            >
              <Icons.Monitor />
              <span>{t("settings.themeSystem")}</span>
            </button>
          </div>
        </Row>

        {/* Font Theme */}
        <Row label={t("settings.font")} darkMode={darkMode}>
          <div
            className={`flex p-1 rounded-lg ${darkMode ? "bg-theme-muted" : "bg-theme-muted"}`}
          >
            {fontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontTheme(option.value)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  option.value === "sans"
                    ? "font-sans"
                    : option.value === "serif"
                      ? "font-serif"
                      : "font-mono"
                } ${
                  fontTheme === option.value
                    ? darkMode
                      ? "bg-theme-selected text-theme-text shadow"
                      : "bg-theme-surface text-theme-text shadow"
                    : darkMode
                      ? "text-theme-text-secondary hover:text-theme-text"
                      : "text-theme-text-secondary hover:text-theme-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>

        {/* Font Size */}
        <Row label={t("settings.fontSize")} darkMode={darkMode}>
          <div
            className={`flex p-1 rounded-lg ${darkMode ? "bg-theme-muted" : "bg-theme-muted"}`}
          >
            {[
              {
                value: "small" as FontSize,
                label: t("settings.fontSizeSmall"),
              },
              {
                value: "medium" as FontSize,
                label: t("settings.fontSizeMedium"),
              },
              {
                value: "large" as FontSize,
                label: t("settings.fontSizeLarge"),
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize(option.value)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  fontSize === option.value
                    ? darkMode
                      ? "bg-theme-selected text-theme-text shadow"
                      : "bg-theme-surface text-theme-text shadow"
                    : darkMode
                      ? "text-theme-text-secondary hover:text-theme-text"
                      : "text-theme-text-secondary hover:text-theme-text"
                }`}
                style={{
                  fontSize:
                    option.value === "small"
                      ? "0.875rem"
                      : option.value === "large"
                        ? "1.125rem"
                        : "1rem",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* AI Settings */}
      <Section
        title={t("settings.aiIntelligence")}
        icon={<Icons.Robot />}
        darkMode={darkMode}
      >
        <div className="space-y-5">
          {/* Provider List */}
          <ProviderListSection
            providers={aiModelsConfig.providers}
            tasks={aiModelsConfig.tasks}
            onEditProvider={handleEditProvider}
            onDeleteProvider={handleDeleteProvider}
            onAddProvider={handleAddProvider}
            darkMode={darkMode}
            t={t}
          />

          {/* Translation Task */}
          <TaskAssignmentSection
            title={t("settings.translationTask")}
            description={t("settings.translationTaskDesc")}
            taskConfig={aiModelsConfig.tasks.translation ?? { model_ids: [], enabled: true }}
            providers={aiModelsConfig.providers}
            onChangeConfig={(config) =>
              updateAiModelsConfig({
                ...aiModelsConfig,
                tasks: { ...aiModelsConfig.tasks, translation: config },
              })
            }
            darkMode={darkMode}
            t={t}
          />

          {/* Interpretation Task */}
          <TaskAssignmentSection
            title={t("settings.interpretTask")}
            description={t("settings.interpretTaskDesc")}
            taskConfig={aiModelsConfig.tasks.interpret ?? { model_ids: [], enabled: true }}
            providers={aiModelsConfig.providers}
            onChangeConfig={(config) =>
              updateAiModelsConfig({
                ...aiModelsConfig,
                tasks: { ...aiModelsConfig.tasks, interpret: config },
              })
            }
            darkMode={darkMode}
            t={t}
          />
        </div>
      </Section>

      {/* Zotero Integration */}
      <Section
        title={t("settings.zoteroIntegration")}
        icon={<Icons.Link />}
        darkMode={darkMode}
      >
        <Row label={t("settings.apiKey")} darkMode={darkMode}>
          <input
            type="password"
            placeholder={
              config?.zotero_api_key_configured
                ? "••••••••"
                : t("settings.enterApiKey")
            }
            value={formData.zotero_api_key}
            onChange={(e) => updateFormField("zotero_api_key", e.target.value)}
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
                : "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
            }`}
          />
        </Row>
        <Row label={t("settings.libraryId")} darkMode={darkMode}>
          <input
            type="text"
            placeholder="1234567"
            value={formData.zotero_library_id}
            onChange={(e) =>
              updateFormField("zotero_library_id", e.target.value)
            }
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
                : "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
            }`}
          />
        </Row>
        <Row label={t("settings.defaultCollection")} darkMode={darkMode}>
          <input
            type="text"
            placeholder="Focus"
            value={formData.zotero_collection}
            onChange={(e) =>
              updateFormField("zotero_collection", e.target.value)
            }
            className={`w-44 min-h-touch px-3 rounded-xl border text-body-sm ${
              darkMode
                ? "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
                : "bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary"
            }`}
          />
        </Row>
      </Section>

      {/* RSS Feed */}
      <Section
        title={t("settings.rssFeed")}
        icon={<Icons.Sources />}
        darkMode={darkMode}
      >
        <Row label={t("settings.feedType")} darkMode={darkMode}>
          <div
            className={`flex p-1 rounded-lg ${darkMode ? "bg-theme-muted" : "bg-theme-muted"}`}
          >
            {(["all", "interested", "favorite"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRssFeedType(type)}
                className={`min-h-touch px-3 rounded-lg text-ui-sm font-medium transition-all ${
                  rssFeedType === type
                    ? darkMode
                      ? "bg-theme-selected text-theme-text shadow"
                      : "bg-theme-surface text-theme-text shadow"
                    : darkMode
                      ? "text-theme-text-secondary hover:text-theme-text"
                      : "text-theme-text-secondary hover:text-theme-text"
                }`}
              >
                {type === "all"
                  ? t("settings.feedAll")
                  : type === "interested"
                    ? t("settings.feedSaved")
                    : t("settings.feedFavorites")}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("settings.feedUrl")} darkMode={darkMode}>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={exportApi.getRssFeedUrl(rssFeedType)}
              className={`w-56 min-h-touch px-3 rounded-xl border text-body-sm ${
                darkMode
                  ? "bg-theme-muted border-theme-border text-theme-text-secondary"
                  : "bg-theme-muted border-theme-border text-theme-text-secondary"
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                await navigator.clipboard.writeText(
                  exportApi.getRssFeedUrl(rssFeedType),
                );
                setRssFeedCopied(true);
                showToast(t("settings.feedUrlCopied"), "success");
                setTimeout(() => setRssFeedCopied(false), 2000);
              }}
              className={`min-h-touch px-3 rounded-xl transition-colors ${
                rssFeedCopied
                  ? "bg-accent-success text-white"
                  : darkMode
                    ? "bg-theme-selected text-theme-text-secondary hover:bg-theme-muted"
                    : "bg-theme-muted text-theme-text-secondary hover:bg-theme-border"
              }`}
            >
              {rssFeedCopied ? <Icons.Check /> : <Icons.Share />}
            </button>
          </div>
        </Row>
      </Section>

      {/* Account */}
      <Section
        title={t("settings.account")}
        icon={<Icons.User />}
        darkMode={darkMode}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                darkMode ? "bg-theme-accent" : "bg-theme-accent"
              }`}
            >
              A
            </div>
            <div>
              <div
                className={`font-medium ${darkMode ? "text-theme-text" : "text-theme-text"}`}
              >
                {t("settings.adminUser")}
              </div>
              <div
                className={`text-caption ${darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"}`}
              >
                {t("settings.singleUserMode")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPasswordModalOpen(true)}
            className={`min-h-touch px-4 rounded-xl text-ui-sm font-medium border transition-colors ${
              darkMode
                ? "border-theme-border text-theme-text-secondary hover:bg-theme-muted"
                : "border-theme-border text-theme-text-secondary hover:bg-theme-muted"
            }`}
          >
            {t("settings.changePassword")}
          </button>
        </div>
      </Section>

      {/* About */}
      <Section
        title={t("settings.about")}
        icon={<Icons.Info />}
        darkMode={darkMode}
      >
        <div className="space-y-3 text-body-sm">
          <div className="flex justify-between">
            <span className="text-theme-text-secondary">
              {t("settings.version")}
            </span>
            <span className="text-theme-text">{__APP_VERSION__}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-theme-text-secondary">
              {t("settings.build")}
            </span>
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
                ? "bg-theme-accent hover:bg-theme-accent-hover text-white"
                : "bg-theme-accent hover:bg-theme-accent-hover text-white"
            } disabled:opacity-50`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("common.saving")}
              </span>
            ) : (
              t("settings.saveChanges")
            )}
          </button>
        </div>
      )}

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        darkMode={darkMode}
      />

      <ProviderEditModal
        isOpen={isProviderModalOpen}
        provider={editingProvider}
        onSave={handleSaveProvider}
        onClose={() => setIsProviderModalOpen(false)}
        darkMode={darkMode}
        t={t}
      />

      {/* Custom Theme Editor Modal */}
      {customThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCustomThemeModalOpen(false)}
          />
          <div
            className={`relative w-full max-w-lg rounded-2xl shadow-xl ${
              darkMode ? "bg-theme-surface" : "bg-theme-surface"
            }`}
          >
            <div
              className={`flex items-center justify-between p-4 border-b ${
                darkMode ? "border-theme-border" : "border-theme-border"
              }`}
            >
              <h3
                className={`text-h3 font-bold ${darkMode ? "text-theme-text" : "text-theme-text"}`}
              >
                {t(`settings.language`) === "语言"
                  ? "自定义配色"
                  : "Custom Theme"}
              </h3>
              <button
                type="button"
                onClick={() => setCustomThemeModalOpen(false)}
                onMouseDown={(e) => e.preventDefault()}
                className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${
                  darkMode
                    ? "hover:bg-theme-muted text-theme-text-secondary"
                    : "hover:bg-theme-muted text-theme-text-secondary"
                }`}
              >
                <Icons.X />
              </button>
            </div>

            <div className="px-5 py-4 md:px-6 space-y-4">
              <p
                className={`text-body-sm ${darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"}`}
              >
                {t(`settings.language`) === "语言"
                  ? "输入 JSON 格式的配色方案，包含 light 和 dark 两个调色板。"
                  : "Enter a JSON color scheme with light and dark palettes."}
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
                    ? "bg-theme-muted border-theme-border text-theme-text"
                    : "bg-theme-muted border-theme-border text-theme-text"
                } focus:outline-none focus:ring-1 focus:ring-theme-accent`}
                placeholder='{"light": {...}, "dark": {...}}'
              />

              {customThemeError && (
                <div
                  className={`p-3 rounded-xl text-body-sm ${
                    darkMode
                      ? "bg-red-900/30 text-red-400"
                      : "bg-red-50 text-red-600"
                  }`}
                >
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
                      ? "border-theme-border text-theme-text-secondary hover:bg-theme-muted"
                      : "border-theme-border text-theme-text-secondary hover:bg-theme-muted"
                  }`}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const validation = validateCustomTheme(customThemeInput);
                    if (!validation.valid) {
                      setCustomThemeError(validation.error || "Invalid theme");
                      return;
                    }
                    setCustomThemeJson(customThemeInput);
                    setColorTheme("custom");
                    setCustomThemeModalOpen(false);
                    showToast(
                      t(`settings.language`) === "语言"
                        ? "自定义配色已应用"
                        : "Custom theme applied",
                      "success",
                    );
                  }}
                  className={`flex-1 min-h-touch py-3 rounded-xl text-ui font-medium transition-colors ${
                    darkMode
                      ? "bg-theme-accent hover:bg-theme-accent-hover text-white"
                      : "bg-theme-accent hover:bg-theme-accent-hover text-white"
                  }`}
                >
                  {t(`settings.language`) === "语言"
                    ? "应用配色"
                    : "Apply Theme"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
