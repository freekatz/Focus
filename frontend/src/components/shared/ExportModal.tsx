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

type ExportTab = "share" | "zotero" | "copy";

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

  const tabs: { id: ExportTab; label: string; icon: ReactNode }[] = [
    { id: "share", label: "Share", icon: <Icons.Link /> },
    { id: "zotero", label: "Zotero", icon: <Icons.Download /> },
    { id: "copy", label: "Copy", icon: <Icons.Share /> },
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
          darkMode ? "bg-slate-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-slate-700" : "border-zinc-200"
          }`}
        >
          <h3
            className={`text-lg font-bold ${
              darkMode ? "text-white" : "text-zinc-900"
            }`}
          >
            Export {articles.length} item{articles.length > 1 ? "s" : ""}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              darkMode
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-zinc-100 text-zinc-500"
            }`}
          >
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={`flex p-2 mx-4 mt-4 rounded-lg ${
            darkMode ? "bg-slate-900" : "bg-zinc-100"
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
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? darkMode
                    ? "bg-slate-700 text-white shadow"
                    : "bg-white text-zinc-900 shadow"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-zinc-500 hover:text-zinc-700"
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
                  className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
                    darkMode ? "text-slate-500" : "text-zinc-400"
                  }`}
                >
                  Expires in
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className={`w-full p-2 rounded-lg border text-sm ${
                    darkMode
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-zinc-50 border-zinc-200"
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
                      darkMode ? "bg-slate-900" : "bg-zinc-50"
                    }`}
                  >
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className={`flex-1 bg-transparent text-sm outline-none ${
                        darkMode ? "text-slate-300" : "text-zinc-700"
                      }`}
                    />
                    <button
                      onClick={copyShareUrl}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? "hover:bg-slate-700 text-indigo-400"
                          : "hover:bg-zinc-200 text-spira-600"
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
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    darkMode
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-spira-600 hover:bg-spira-500 text-white"
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
                  className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
                    darkMode ? "text-slate-500" : "text-zinc-400"
                  }`}
                >
                  Collection
                </label>
                <input
                  type="text"
                  placeholder="Focus"
                  value={zoteroCollection}
                  onChange={(e) => setZoteroCollection(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${
                    darkMode
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                />
              </div>
              <button
                onClick={handleZoteroExport}
                disabled={loading || entryIds.length === 0}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  darkMode
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-spira-600 hover:bg-spira-500 text-white"
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
                  darkMode ? "bg-slate-900" : "bg-zinc-50"
                }`}
              >
                {articles.map((a, i) => (
                  <div
                    key={a.id}
                    className={`text-sm py-1 ${
                      i > 0
                        ? "border-t " +
                          (darkMode ? "border-slate-700" : "border-zinc-200")
                        : ""
                    }`}
                  >
                    <div
                      className={`font-medium truncate ${
                        darkMode ? "text-slate-300" : "text-zinc-700"
                      }`}
                    >
                      {a.title}
                    </div>
                    {a._entry?.link && (
                      <div
                        className={`text-xs truncate ${
                          darkMode ? "text-slate-500" : "text-zinc-400"
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
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  darkMode
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-spira-600 hover:bg-spira-500 text-white"
                }`}
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm text-center ${
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
        </div>
      </div>
    </div>
  );
}
