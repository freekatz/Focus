import { useState, useEffect, type ReactNode } from "react";
import { Icons } from "../icons/Icons";
import { exportApi } from "../../api";
import type { Article } from "../../types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  darkMode: boolean;
}

type ExportTab = "share" | "zotero" | "copy" | "download";

export function ExportModal({
  isOpen,
  onClose,
  articles,
  darkMode,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>("share");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [zoteroCollection, setZoteroCollection] = useState("");

  // Reset share URL when modal opens or articles change
  useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setMessage(null);
      exportApi
        .getZoteroConfig()
        .then((config) => {
          setZoteroCollection(config.default_collection || "");
        })
        .catch(() => {});
    }
  }, [isOpen, articles]);

  if (!isOpen) return null;

  const entryIds = articles
    .map((a) => a._entry?.id)
    .filter((id): id is number => id !== undefined);

  const handleShare = async () => {
    if (entryIds.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await exportApi.createShare(
        entryIds,
        undefined,
        expiresInDays
      );
      setShareUrl(response.share_url);
      setMessage({ type: "success", text: "Share link created!" });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to create share link",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleZoteroExport = async () => {
    if (entryIds.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      await exportApi.batchExportToZotero(
        entryIds,
        zoteroCollection || undefined
      );
      setMessage({
        type: "success",
        text: `Exported ${entryIds.length} item(s) to Zotero!`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to export to Zotero",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = articles
      .map((a) => `${a.title}\n${a._entry?.link || ""}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: "success", text: "Copied to clipboard!" });
    } catch {
      setMessage({ type: "error", text: "Failed to copy to clipboard" });
    }
  };

  const copyShareUrl = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage({ type: "success", text: "Link copied!" });
      } catch {
        setMessage({ type: "error", text: "Failed to copy link" });
      }
    }
  };

  const handleDownloadMarkdown = () => {
    // Generate markdown content from AI summaries
    const markdownContent = articles
      .map((a) => {
        const entry = a._entry;
        const lines: string[] = [];

        lines.push(`# ${a.title}`);
        lines.push("");

        if (entry?.rss_source_name) {
          lines.push(`**Source:** ${entry.rss_source_name}`);
        }
        if (a.author) {
          lines.push(`**Author:** ${a.author}`);
        }
        if (entry?.published_at) {
          lines.push(`**Published:** ${new Date(entry.published_at).toLocaleDateString()}`);
        }
        if (entry?.link) {
          lines.push(`**Link:** ${entry.link}`);
        }
        lines.push("");

        // AI Summary / Brief Summary
        if (entry?.ai_summary) {
          lines.push("## AI Summary");
          lines.push("");
          lines.push(entry.ai_summary);
          lines.push("");
        } else if (entry?.brief_summary) {
          lines.push("## Summary");
          lines.push("");
          lines.push(entry.brief_summary);
          lines.push("");
        }

        // Translated Abstract (for ArXiv)
        if (entry?.translated_abstract) {
          lines.push("## Translated Abstract");
          lines.push("");
          lines.push(entry.translated_abstract);
          lines.push("");
        }

        lines.push("---");
        lines.push("");

        return lines.join("\n");
      })
      .join("\n");

    // Create and download file
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename with ArXiv ID and timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
    let filename: string;

    if (articles.length === 1) {
      const article = articles[0];
      const entry = article._entry;
      // Extract ArXiv ID from link (e.g., https://arxiv.org/abs/2401.12345)
      const arxivMatch = entry?.link?.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
      const arxivId = arxivMatch ? arxivMatch[1] : null;

      if (arxivId) {
        // ArXiv article: arxiv-2401.12345-Title-2024-01-31-14-30.md
        const shortTitle = article.title.slice(0, 30).replace(/[/\\?%*:|"<>]/g, "-").trim();
        filename = `arxiv-${arxivId}-${shortTitle}-${timestamp}.md`;
      } else {
        // Regular article: Title-SourceName-2024-01-31-14-30.md
        const shortTitle = article.title.slice(0, 40).replace(/[/\\?%*:|"<>]/g, "-").trim();
        const sourceName = entry?.rss_source_name?.slice(0, 15).replace(/[/\\?%*:|"<>]/g, "-") || "focus";
        filename = `${shortTitle}-${sourceName}-${timestamp}.md`;
      }
    } else {
      // Multiple articles: focus-export-5篇-2024-01-31-14-30.md
      filename = `focus-export-${articles.length}篇-${timestamp}.md`;
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({ type: "success", text: "Markdown file downloaded!" });
  };

  const tabs: { id: ExportTab; label: string; icon: ReactNode }[] = [
    { id: "share", label: "Share", icon: <Icons.Link /> },
    { id: "zotero", label: "Zotero", icon: <Icons.Download /> },
    { id: "copy", label: "Copy", icon: <Icons.Share /> },
    { id: "download", label: "Download", icon: <Icons.Download /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Centered */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-xl ${
          darkMode ? "bg-theme-surface" : "bg-theme-surface"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-theme-border" : "border-theme-border"
          }`}
        >
          <h3
            className={`text-h3 font-bold ${
              darkMode ? "text-theme-text" : "text-theme-text"
            }`}
          >
            Export {articles.length} item{articles.length > 1 ? "s" : ""}
          </h3>
          <button
            onClick={onClose}
            className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${
              darkMode
                ? "hover:bg-theme-muted text-theme-text-secondary"
                : "hover:bg-theme-muted text-theme-text-secondary"
            }`}
          >
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={`flex p-2 mx-4 mt-4 rounded-lg ${
            darkMode ? "bg-theme-muted" : "bg-theme-muted"
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
                setShareUrl(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 min-h-touch px-3 rounded-md text-ui-sm font-medium transition-all ${
                activeTab === tab.id
                  ? darkMode
                    ? "bg-theme-selected text-theme-text shadow"
                    : "bg-theme-surface text-theme-text shadow"
                  : darkMode
                  ? "text-theme-text-secondary hover:text-theme-text"
                  : "text-theme-text-secondary hover:text-theme-text"
              }`}
            >
              <span className="scale-75">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 min-h-[200px]">
          {activeTab === "share" && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
                    darkMode ? "text-theme-text-tertiary" : "text-theme-text-tertiary"
                  }`}
                >
                  Expires in
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className={`w-full min-h-touch p-2 rounded-lg border text-body-sm ${
                    darkMode
                      ? "bg-theme-muted border-theme-border text-theme-text"
                      : "bg-theme-muted border-theme-border text-theme-text"
                  }`}
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={0}>Never</option>
                </select>
              </div>

              {shareUrl ? (
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      darkMode ? "bg-theme-muted" : "bg-theme-muted"
                    }`}
                  >
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className={`flex-1 bg-transparent text-body-sm outline-none ${
                        darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"
                      }`}
                    />
                    <button
                      onClick={copyShareUrl}
                      className={`min-h-touch min-w-touch flex items-center justify-center rounded-lg transition-colors ${
                        darkMode
                          ? "hover:bg-theme-selected text-theme-accent"
                          : "hover:bg-theme-border text-theme-accent"
                      }`}
                    >
                      <Icons.Share />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleShare}
                  disabled={loading || entryIds.length === 0}
                  className={`w-full min-h-touch py-3 rounded-xl font-medium text-ui transition-all ${
                    darkMode
                      ? "bg-theme-accent hover:bg-theme-accent-hover text-white"
                      : "bg-theme-accent hover:bg-theme-accent-hover text-white"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading ? "Creating..." : "Create Share Link"}
                </button>
              )}
            </div>
          )}

          {activeTab === "zotero" && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-caption font-medium uppercase tracking-wider mb-2 ${
                    darkMode ? "text-theme-text-tertiary" : "text-theme-text-tertiary"
                  }`}
                >
                  Collection
                </label>
                <input
                  type="text"
                  placeholder="Focus"
                  value={zoteroCollection}
                  onChange={(e) => setZoteroCollection(e.target.value)}
                  className={`w-full min-h-touch p-2 rounded-lg border text-body-sm ${
                    darkMode
                      ? "bg-theme-muted border-theme-border text-theme-text"
                      : "bg-theme-muted border-theme-border text-theme-text"
                  }`}
                />
              </div>
              <button
                onClick={handleZoteroExport}
                disabled={loading || entryIds.length === 0}
                className={`w-full min-h-touch py-3 rounded-xl font-medium text-ui transition-all ${
                  darkMode
                    ? "bg-theme-accent hover:bg-theme-accent text-white"
                    : "bg-theme-accent hover:bg-theme-accent-hover text-white"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? "Exporting..." : "Export to Zotero"}
              </button>
            </div>
          )}

          {activeTab === "copy" && (
            <div className="space-y-4">
              <div
                className={`p-3 rounded-lg max-h-32 overflow-y-auto ${
                  darkMode ? "bg-theme-muted" : "bg-theme-muted"
                }`}
              >
                {articles.map((a, i) => (
                  <div
                    key={a.id}
                    className={`text-body-sm py-1 ${
                      i > 0
                        ? "border-t " +
                          (darkMode ? "border-theme-border" : "border-theme-border")
                        : ""
                    }`}
                  >
                    <div
                      className={`font-medium truncate ${
                        darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"
                      }`}
                    >
                      {a.title}
                    </div>
                    {a._entry?.link && (
                      <div
                        className={`text-caption truncate ${
                          darkMode ? "text-theme-text-tertiary" : "text-theme-text-tertiary"
                        }`}
                      >
                        {a._entry.link}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleCopy}
                className={`w-full min-h-touch py-3 rounded-xl font-medium text-ui transition-all ${
                  darkMode
                    ? "bg-theme-accent hover:bg-theme-accent text-white"
                    : "bg-theme-accent hover:bg-theme-accent-hover text-white"
                }`}
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {activeTab === "download" && (
            <div className="space-y-4">
              <div
                className={`p-3 rounded-lg ${
                  darkMode ? "bg-theme-muted" : "bg-theme-muted"
                }`}
              >
                <p
                  className={`text-body-sm ${
                    darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"
                  }`}
                >
                  Download AI summaries as a Markdown file, including article metadata, AI analysis, and translations.
                </p>
              </div>

              <div
                className={`p-3 rounded-lg max-h-32 overflow-y-auto ${
                  darkMode ? "bg-theme-muted" : "bg-theme-muted"
                }`}
              >
                {articles.map((a, i) => {
                  const hasAiContent = a._entry?.ai_summary || a._entry?.brief_summary || a._entry?.translated_abstract;
                  return (
                    <div
                      key={a.id}
                      className={`text-body-sm py-1 flex items-center gap-2 ${
                        i > 0
                          ? "border-t " +
                            (darkMode ? "border-theme-border" : "border-theme-border")
                          : ""
                      }`}
                    >
                      <span className={hasAiContent ? "text-theme-success" : "text-theme-text-muted"}>
                        {hasAiContent ? "✓" : "○"}
                      </span>
                      <span
                        className={`font-medium truncate flex-1 ${
                          darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"
                        }`}
                      >
                        {a.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleDownloadMarkdown}
                className={`w-full min-h-touch py-3 rounded-xl font-medium text-ui transition-all ${
                  darkMode
                    ? "bg-theme-accent hover:bg-theme-accent-hover text-white"
                    : "bg-theme-accent hover:bg-theme-accent-hover text-white"
                }`}
              >
                Download Markdown
              </button>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-body-sm text-center ${
                message.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
