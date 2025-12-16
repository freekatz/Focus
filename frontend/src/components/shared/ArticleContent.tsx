import { useMemo } from 'react';

interface ArticleContentProps {
  content: string;
  darkMode: boolean;
}

type ContentType = 'html' | 'markdown' | 'plain';

// Detect content type based on patterns
function detectContentType(content: string): ContentType {
  if (!content) return 'plain';

  const trimmed = content.trim();

  // Check for HTML: look for common HTML tags
  const htmlPatterns = [
    /<\/?(?:p|div|span|a|img|h[1-6]|ul|ol|li|table|tr|td|th|br|hr|blockquote|pre|code|em|strong|b|i|u|s|sub|sup|article|section|header|footer|nav|aside|figure|figcaption)[^>]*>/i,
    /<\/?(?:html|head|body|meta|link|script|style)[^>]*>/i,
    /&(?:nbsp|lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/i,
  ];

  for (const pattern of htmlPatterns) {
    if (pattern.test(trimmed)) {
      return 'html';
    }
  }

  // Check for Markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,                    // Headers: # Title
    /^\s*[-*+]\s+.+$/m,                  // Unordered lists
    /^\s*\d+\.\s+.+$/m,                  // Ordered lists
    /\[.+?\]\(.+?\)/,                    // Links: [text](url)
    /!\[.*?\]\(.+?\)/,                   // Images: ![alt](url)
    /`{1,3}[^`]+`{1,3}/,                 // Inline code or code blocks
    /^\s*>\s+.+$/m,                      // Blockquotes
    /\*\*[^*]+\*\*/,                     // Bold: **text**
    /\*[^*]+\*/,                         // Italic: *text*
    /__[^_]+__/,                         // Bold: __text__
    /_[^_]+_/,                           // Italic: _text_
    /~~[^~]+~~/,                         // Strikethrough: ~~text~~
    /^\s*[-*_]{3,}\s*$/m,                // Horizontal rule
    /^\|.+\|$/m,                         // Tables
  ];

  let markdownMatches = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(trimmed)) {
      markdownMatches++;
    }
  }

  // If multiple markdown patterns match, it's likely markdown
  if (markdownMatches >= 2) {
    return 'markdown';
  }

  return 'plain';
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return sanitized;
}

// Convert Markdown to HTML
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first (but preserve existing HTML-like structures)
  // We'll be more conservative here

  // Code blocks (must be processed first to protect content)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr />');

  // Unordered lists
  html = html.replace(/^(\s*)[-*+]\s+(.+)$/gm, '$1<li>$2</li>');

  // Ordered lists
  html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1<li>$2</li>');

  // Wrap consecutive li elements in ul/ol
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (match) => {
    return '<ul>' + match + '</ul>';
  });

  // Paragraphs: wrap text blocks not already in tags
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    // Skip if already wrapped in a block element
    if (/^<(?:h[1-6]|p|div|ul|ol|li|pre|blockquote|hr|table|tr|td|th)/.test(trimmed)) {
      return line;
    }
    // Skip if it's a closing tag
    if (/^<\//.test(trimmed)) {
      return line;
    }
    return `<p>${line}</p>`;
  });
  html = processedLines.join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// Convert plain text to HTML with proper formatting
function plainTextToHtml(text: string): string {
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Convert URLs to links
  html = html.replace(
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>'
  );

  // Convert paragraphs (double newlines)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map(p => p.trim())
    .filter(p => p)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('\n');

  return html;
}

export function ArticleContent({ content, darkMode }: ArticleContentProps) {
  const processedContent = useMemo(() => {
    if (!content) return '';

    const contentType = detectContentType(content);

    switch (contentType) {
      case 'html':
        return sanitizeHtml(content);
      case 'markdown':
        return markdownToHtml(content);
      case 'plain':
      default:
        return plainTextToHtml(content);
    }
  }, [content]);

  return (
    <article
      className={`article-content ${darkMode ? 'article-content-dark' : 'article-content-light'}`}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
