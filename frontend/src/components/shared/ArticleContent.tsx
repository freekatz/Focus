import { useMemo, useState, useCallback, useEffect } from 'react';
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

// Image Lightbox Component
function ImageLightbox({
  src,
  alt,
  onClose
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white p-2"
        style={{ backgroundColor: '#f8f8f8' }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}

// Detect content type based on patterns
function detectContentType(content: string): ContentType {
  if (!content) return 'plain';

  const trimmed = content.trim();

  // 优先检测 HTML：检测到 HTML 标签就认定为 HTML
  // HTML 检测需要在 Markdown 之前，因为有些 RSS/Atom 内容包含 HTML
  const htmlPatterns = [
    // 常见 HTML 标签
    /<\/?(?:p|div|span|a|img|h[1-6]|ul|ol|li|table|tr|td|th|br|hr|blockquote|pre|code|em|strong|b|i|u|s|sub|sup|article|section|header|footer|nav|aside|figure|figcaption)[^>]*>/i,
    // 文档结构标签
    /<\/?(?:html|head|body|meta|link|script|style)[^>]*>/i,
    // HTML 实体
    /&(?:nbsp|lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/i,
  ];

  for (const pattern of htmlPatterns) {
    if (pattern.test(trimmed)) {
      return 'html';
    }
  }

  // Markdown 特征检测：检测到任意一个就认定为 Markdown
  // 这些特征在 HTML 中不会出现
  if (
    /^#{1,6}\s+.+$/m.test(trimmed) ||     // Headers: # Title, ## Title
    /\*\*[^*]+\*\*/.test(trimmed) ||      // Bold: **text**
    /^\|.+\|$/m.test(trimmed) ||          // Tables: |...|
    /\$\$[\s\S]+?\$\$/.test(trimmed) ||   // Block math: $$...$$
    /\$[^$\n]+\$/.test(trimmed)           // Inline math: $...$
  ) {
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
function MarkdownContent({
  content,
  darkMode,
  onImageClick
}: {
  content: string;
  darkMode: boolean;
  onImageClick: (src: string, alt: string) => void;
}) {
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
          // Custom image renderer with lightbox support
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || ''}
              {...props}
              className="cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={() => src && onImageClick(src, alt || '')}
            />
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
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  // Handle image clicks for HTML content
  const handleHtmlImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      openLightbox(img.src, img.alt || '');
    }
  }, [openLightbox]);

  // Use react-markdown for markdown content
  if (contentType === 'markdown') {
    return (
      <>
        <MarkdownContent content={content} darkMode={darkMode} onImageClick={openLightbox} />
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            onClose={closeLightbox}
          />
        )}
      </>
    );
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
    <>
      <article
        className={`article-content ${darkMode ? 'article-content-dark' : 'article-content-light'}`}
        dangerouslySetInnerHTML={{ __html: processedContent }}
        onClick={handleHtmlImageClick}
      />
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
