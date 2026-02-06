// AI Model Configuration
export interface AIModelConfig {
  id: string;
  name: string;
  provider: string; // "openai" | "openai_compatible"
  model: string;
  api_key?: string; // Only used when submitting
  api_key_configured?: boolean; // Returned in response
  base_url?: string | null;
}

// Single AI task config
export interface AITaskConfig {
  model_ids: string[];    // Ordered model ID list (first = primary)
  enabled: boolean;       // Whether this task auto-runs
}

// Unified AI models config (model pool + abstract tasks)
export interface AIModelsConfig {
  models: AIModelConfig[];                    // Global model pool
  tasks: Record<string, AITaskConfig>;        // Task configs keyed by task type
}

export interface UserConfig {
  id: number;
  user_id: number;
  // Retention config
  unmarked_retention_days: number;
  trash_retention_days: number;
  archive_after_days: number;
  // Legacy AI config (kept for backward compatibility)
  ai_provider: string | null;
  ai_model: string | null;
  ai_api_key: string | null;
  ai_api_key_configured: boolean;
  ai_base_url: string | null;
  sage_prompt: string | null;
  // Unified AI models config
  ai_models_config?: AIModelsConfig | null;
  // ArXiv config
  auto_translate_abstract: boolean;
  auto_interpret_arxiv: boolean;
  // Zotero config
  zotero_library_id: string | null;
  zotero_library_type: string | null;
  zotero_api_key: string | null;
  zotero_api_key_configured: boolean;
  zotero_collection: string | null;
  // UI config
  theme: string | null;
  color_theme: string | null;
  font_theme: string | null;
  font_size: string | null;
  custom_theme_json: string | null;
  entries_per_page: number;
}

export interface AIModelConfigUpdate {
  id: string;
  name: string;
  provider: string;
  model: string;
  api_key?: string;
  base_url?: string | null;
}

export interface AITaskConfigUpdate {
  model_ids: string[];
  enabled: boolean;
}

export interface AIModelsConfigUpdate {
  models: AIModelConfigUpdate[];
  tasks: Record<string, AITaskConfigUpdate>;
}

export interface UserConfigUpdateRequest {
  // Legacy AI fields
  ai_provider?: string;
  ai_model?: string;
  ai_api_key?: string;
  ai_base_url?: string;
  sage_prompt?: string;
  // Unified AI models config
  ai_models_config?: AIModelsConfigUpdate;
  auto_translate_abstract?: boolean;
  auto_interpret_arxiv?: boolean;
  zotero_library_id?: string;
  zotero_library_type?: string;
  zotero_api_key?: string;
  zotero_collection?: string;
  theme?: string;
  color_theme?: string;
  font_theme?: string;
  font_size?: string;
  custom_theme_json?: string;
  unmarked_retention_days?: number;
  trash_retention_days?: number;
  archive_after_days?: number;
}
