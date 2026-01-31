export interface UserConfig {
  id: number;
  user_id: number;
  // Retention config
  unmarked_retention_days: number;
  trash_retention_days: number;
  archive_after_days: number;
  // AI config
  ai_provider: string | null;
  ai_model: string | null;
  ai_api_key: string | null;
  ai_api_key_configured: boolean;
  ai_base_url: string | null;
  sage_prompt: string | null;
  // ArXiv config
  auto_translate_abstract: boolean;
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
  custom_theme_json: string | null;
  entries_per_page: number;
}

export interface UserConfigUpdateRequest {
  ai_provider?: string;
  ai_model?: string;
  ai_api_key?: string;
  ai_base_url?: string;
  sage_prompt?: string;
  auto_translate_abstract?: boolean;
  zotero_library_id?: string;
  zotero_library_type?: string;
  zotero_api_key?: string;
  zotero_collection?: string;
  theme?: string;
  color_theme?: string;
  font_theme?: string;
  custom_theme_json?: string;
  unmarked_retention_days?: number;
  trash_retention_days?: number;
  archive_after_days?: number;
}
