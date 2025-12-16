/**
 * Format a date string to relative time (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

/**
 * Estimate read time based on content length
 * Average reading speed: ~200 words per minute
 */
export function estimateReadTime(content: string | null): string {
  if (!content) return '1 min';

  // Strip HTML tags for word count
  const text = content.replace(/<[^>]+>/g, '');
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));

  return `${minutes} min`;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Format author string to show first author + "et al." if multiple authors
 * Handles common separators: comma, semicolon, "and", "&"
 */
export function formatAuthors(author: string | null): string {
  if (!author) return 'Unknown';

  // Common separators for multiple authors
  const separators = /[,;]|\s+and\s+|\s*&\s*/i;
  const authors = author.split(separators).map(a => a.trim()).filter(a => a.length > 0);

  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return authors[0];

  return `${authors[0]} et al.`;
}
