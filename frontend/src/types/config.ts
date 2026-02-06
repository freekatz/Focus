// A single model entry under a provider
export interface AIModelEntry {
  id: string;       // Unique within the provider (e.g. "m1")
  name: string;     // Display name (e.g. "Flash")
  model: string;    // Model ID sent to API (e.g. "gemini-2.0-flash")
}

// A provider groups credentials + multiple models
export interface AIProvider {
  id: string;                      // Unique provider ID (e.g. "p1")
  name: string;                    // Display name (e.g. "Google AI")
  provider: string;                // "openai" | "openai_compatible"
  api_key?: string;                // Only used when submitting
  api_key_configured?: boolean;    // Returned in response
  base_url?: string | null;
  models: AIModelEntry[];          // Models under this provider
}

// Single AI task config
export interface AITaskConfig {
  model_ids: string[];    // Ordered compound IDs "provider_id:model_id" (first = primary)
  enabled: boolean;       // Whether this task auto-runs
}

// Unified AI config (providers + abstract tasks)
export interface AIModelsConfig {
  providers: AIProvider[];                     // Provider list with nested models
  tasks: Record<string, AITaskConfig>;         // Task configs keyed by task type
}

// Legacy flat model config — kept for API compatibility
export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  api_key?: string;
  api_key_configured?: boolean;
  base_url?: string | null;
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

// Update types
export interface AIModelEntryUpdate {
  id: string;
  name: string;
  model: string;
}

export interface AIProviderUpdate {
  id: string;
  name: string;
  provider: string;
  api_key?: string;
  base_url?: string | null;
  models: AIModelEntryUpdate[];
}

export interface AITaskConfigUpdate {
  model_ids: string[];
  enabled: boolean;
}

export interface AIModelsConfigUpdate {
  providers: AIProviderUpdate[];
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
