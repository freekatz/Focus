import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
    /\$\$[\s\S]+?\$\$/,                  // Block math: $$...$$
    /\$[^$\n]+\$/,                       // Inline math: $...$
    /\\\[[\s\S]+?\\\]/,                  // Block math: \[...\]
    /\\\([\s\S]+?\\\)/,                  // Inline math: \(...\)
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

  // Also check for math formulas specifically - if found, treat as markdown
  if (/\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(trimmed)) {
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

// Markdown content component using react-markdown with KaTeX support
function MarkdownContent({ content, darkMode }: { content: string; darkMode: boolean }) {
  return (
    <article className={`article-content ${darkMode ? 'article-content-dark' : 'article-content-light'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom link renderer to open in new tab
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
          // Custom code block renderer
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }

            return (
              <pre className={`code-block ${match ? `language-${match[1]}` : ''}`}>
                <code {...props}>{children}</code>
              </pre>
            );
          },
          // Custom table renderer for better styling
          table: ({ children, ...props }) => (
            <div className="table-wrapper">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

export function ArticleContent({ content, darkMode }: ArticleContentProps) {
  const contentType = useMemo(() => detectContentType(content), [content]);

  // Use react-markdown for markdown content
  if (contentType === 'markdown') {
    return <MarkdownContent content={content} darkMode={darkMode} />;
  }

  // For HTML and plain text, use dangerouslySetInnerHTML
  const processedContent = useMemo(() => {
    if (!content) return '';

    switch (contentType) {
      case 'html':
        return sanitizeHtml(content);
      case 'plain':
      default:
        return plainTextToHtml(content);
    }
  }, [content, contentType]);

  return (
    <article
      className={`article-content ${darkMode ? 'article-content-dark' : 'article-content-light'}`}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
