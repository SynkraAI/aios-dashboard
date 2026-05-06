import { useState, useCallback, memo, useMemo, lazy, Suspense, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';

// Lazy load mermaid diagram renderer (heavy dependency)
const MermaidDiagram = lazy(() => import('./MermaidDiagram'));

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// --- Pre-processing ---

function preprocessContent(content: string): string {
  let processed = content;

  // Collapse numbered list items where number is on its own line:
  // "1.\n**name**" → "1. **name**"
  processed = processed.replace(/^(\d+)\.\s*\n+(\s*\*\*)/gm, '$1. $2');

  // Collapse numbered list items where number is on its own line (no bold):
  // "1.\n  some text" → "1. some text"
  processed = processed.replace(/^(\d+)\.\s*\n+(\s*\S)/gm, '$1. $2');

  return processed;
}

// --- Utility: URL detection ---

const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:\S*)?/;
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i;
const AUDIO_EXT_REGEX = /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;
const LOOM_REGEX = /(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([\w-]+)/;
const SPOTIFY_REGEX = /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode)\/([\w]+)/;
const GIST_REGEX = /(?:https?:\/\/)?gist\.github\.com\/([\w-]+)\/([\w]+)/;

function getYouTubeId(url: string): string | null {
  const match = YOUTUBE_REGEX.exec(url);
  return match ? match[1] : null;
}

function getLoomId(url: string): string | null {
  const match = LOOM_REGEX.exec(url);
  return match ? match[1] : null;
}

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT_REGEX.test(url);
}

function isAudioUrl(url: string): boolean {
  return AUDIO_EXT_REGEX.test(url);
}

function getSpotifyInfo(url: string): { type: string; id: string } | null {
  const match = SPOTIFY_REGEX.exec(url);
  return match ? { type: match[1], id: match[2] } : null;
}

function getGistInfo(url: string): { user: string; id: string } | null {
  const match = GIST_REGEX.exec(url);
  return match ? { user: match[1], id: match[2] } : null;
}

// --- Inline content processing for @mentions and file paths ---

const AGENT_NAMES = ['dev', 'qa', 'architect', 'pm', 'po', 'sm', 'analyst', 'devops', 'data-engineer', 'aios-master', 'ux-design-expert', 'squad-creator'];
const AGENT_COLORS: Record<string, string> = {
  dev: '#60A5FA',
  qa: '#F472B6',
  architect: '#A78BFA',
  pm: '#34D399',
  po: '#FBBF24',
  sm: '#FB923C',
  analyst: '#2DD4BF',
  devops: '#D1FF00',
  'data-engineer': '#818CF8',
  'aios-master': '#F43F5E',
  'ux-design-expert': '#E879F9',
  'squad-creator': '#38BDF8',
};

const MENTION_PATTERN = AGENT_NAMES.map(n => n.replace('-', '\\-')).join('|');
const INLINE_REGEX = new RegExp(
  `(@(?:${MENTION_PATTERN})\\b)` +
  `|((?:(?:src|docs|packages|scripts|public|\\.\\.)\\/)(?:[\\w./@-]+(?:\\.[\\w]+)?))`,
  'g'
);

function AgentMention({ name }: { name: string }) {
  const color = AGENT_COLORS[name] || '#D1FF00';
  const navigateToAgent = useUIStore((s) => s.navigateToRegistryAgent);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold align-baseline cursor-pointer hover:brightness-125 transition-all"
      style={{
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
        color: color,
      }}
      title={`Ver agente @${name}`}
      onClick={() => navigateToAgent(name)}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      @{name}
    </button>
  );
}

function FilePathBadge({ path }: { path: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/[0.06] border border-white/10 text-white/70 align-baseline cursor-default"
      title={path}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      {path}
    </span>
  );
}

function processInlineContent(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return processTextString(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return <Fragment key={i}>{processTextString(child)}</Fragment>;
      }
      return child;
    });
  }
  return children;
}

function processTextString(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Reset regex state
  INLINE_REGEX.lastIndex = 0;
  let match;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const agentName = match[1].slice(1); // remove @
      parts.push(<AgentMention key={`m-${match.index}`} name={agentName} />);
    } else if (match[2]) {
      parts.push(<FilePathBadge key={`f-${match.index}`} path={match[2]} />);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// --- Copy button ---

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all',
        'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white',
        copied && 'bg-green-500/20 text-green-400'
      )}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <CheckIcon /> Copiado
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <CopyIcon /> Copiar
        </span>
      )}
    </button>
  );
}

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// --- Code block with syntax highlighting ---

const CodeBlock = memo(function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  // Mermaid diagrams
  if (language === 'mermaid') {
    return (
      <Suspense
        fallback={
          <div className="my-3 rounded-lg bg-white/5 border border-white/10 h-32 flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-[#D1FF00] border-t-transparent rounded-full" />
              Renderizando diagrama...
            </div>
          </div>
        }
      >
        <MermaidDiagram code={value} />
      </Suspense>
    );
  }

  // Diff blocks
  if (language === 'diff') {
    return <DiffBlock value={value} />;
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50 bg-[rgb(0_0_0/0.3)] rounded-br font-mono">
          {language}
        </div>
      )}
      <CopyButton code={value} />
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '2.5rem 1rem 1rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '13px',
          lineHeight: '1.6',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-family-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace)',
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

// --- Diff block renderer ---

function DiffBlock({ value }: { value: string }) {
  const lines = value.split('\n');

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      <div className="absolute top-0 left-0 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50 bg-[rgb(0_0_0/0.3)] rounded-br font-mono">
        diff
      </div>
      <CopyButton code={value} />
      <div
        className="overflow-x-auto"
        style={{
          padding: '2.5rem 0 1rem 0',
          borderRadius: '0.5rem',
          fontSize: '13px',
          lineHeight: '1.6',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {lines.map((line, i) => {
          let bg = 'transparent';
          let color = 'rgba(255,255,255,0.7)';
          let prefix = ' ';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = 'rgba(34, 197, 94, 0.1)';
            color = '#4ade80';
            prefix = '+';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = 'rgba(239, 68, 68, 0.1)';
            color = '#f87171';
            prefix = '-';
          } else if (line.startsWith('@@')) {
            bg = 'rgba(96, 165, 250, 0.08)';
            color = '#60A5FA';
            prefix = '@';
          } else if (line.startsWith('+++') || line.startsWith('---')) {
            color = 'rgba(255,255,255,0.4)';
          }

          return (
            <div
              key={i}
              className="px-4 font-mono"
              style={{ backgroundColor: bg, color }}
            >
              <span className="inline-block w-4 text-center select-none opacity-60 mr-2">
                {prefix !== ' ' ? '' : ''}
              </span>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Inline code ---

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-[#D1FF00]/10 border border-[#D1FF00]/20 px-1.5 py-0.5 rounded text-[12px] font-mono text-[#D1FF00]/90">
    {children}
  </code>
);

// --- YouTube embed ---

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 aspect-video">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// --- Loom embed ---

function LoomEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 aspect-video">
      <iframe
        src={`https://www.loom.com/embed/${videoId}`}
        title="Loom video"
        className="w-full h-full"
        allowFullScreen
      />
    </div>
  );
}

// --- Spotify embed ---

function SpotifyEmbed({ type, id }: { type: string; id: string }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10">
      <iframe
        src={`https://open.spotify.com/embed/${type}/${id}?theme=0`}
        title="Spotify player"
        className="w-full"
        style={{ height: type === 'track' || type === 'episode' ? '152px' : '352px', borderRadius: '0.5rem' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

// --- GitHub Gist card ---

function GistCard({ user, id, href }: { user: string; id: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-3 flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors group no-underline"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 group-hover:text-[#D1FF00] transition-colors truncate">
          GitHub Gist
        </p>
        <p className="text-xs text-white/50 truncate">
          {user}/{id.slice(0, 8)}...
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

// --- Video player ---

function VideoPlayer({ src }: { src: string }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10">
      <video
        src={src}
        controls
        preload="metadata"
        className="w-full max-h-[400px]"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <track kind="captions" />
        Seu navegador não suporta o elemento de vídeo.
      </video>
    </div>
  );
}

// --- Audio player ---

function AudioPlayer({ src, title }: { src: string; title?: string }) {
  return (
    <div className="my-3 flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="text-xs text-secondary mb-1 truncate">{title}</p>}
        <audio src={src} controls preload="metadata" className="w-full h-8" style={{ colorScheme: 'dark' }}>
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
    </div>
  );
}

// --- Image with lightbox ---

const MarkdownImage = memo(function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className="relative my-3 rounded-lg overflow-hidden border border-white/10 inline-block cursor-pointer group"
        onClick={() => setShowLightbox(true)}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
        {error ? (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 text-red-400 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Erro ao carregar imagem
          </div>
        ) : (
          <img
            src={src}
            alt={alt || ''}
            className="max-w-full max-h-[400px] object-contain"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            loading="lazy"
          />
        )}
        {!error && (
          <div className="absolute inset-0 bg-[rgb(0_0_0/0.5)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="text-xs text-white bg-[rgb(0_0_0/0.5)] px-2 py-1 rounded flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
              Ampliar
            </span>
          </div>
        )}
      </div>

      {showLightbox && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[rgb(0_0_0/0.95)] flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setShowLightbox(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-sm">Download</span>
            </button>
            {alt && (
              <div className="absolute bottom-4 left-4 text-white/70 text-sm">{alt}</div>
            )}
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={src}
              alt={alt || ''}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
});

// --- Ordered list counter context ---
let listCounter = 0;

// --- Custom components for markdown ---

const components = {
  // Code blocks
  code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const value = String(children).replace(/\n$/, '');

    if (!inline && (match || value.includes('\n'))) {
      return <CodeBlock language={language} value={value} />;
    }

    return <InlineCode {...props}>{children}</InlineCode>;
  },

  // Tables
  table({ children }: React.HTMLAttributes<HTMLTableElement>) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10">{children}</table>
      </div>
    );
  },
  thead({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className="bg-white/5">{children}</thead>;
  },
  th({ children }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/80 uppercase tracking-wider font-mono">
        {children}
      </th>
    );
  },
  td({ children }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
      <td className="px-4 py-2.5 text-sm text-white/70 border-t border-white/5">
        {processInlineContent(children)}
      </td>
    );
  },

  // Links — with media embed detection
  a({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    if (!href) {
      return <span>{children}</span>;
    }

    // YouTube embed
    const ytId = getYouTubeId(href);
    if (ytId) {
      return <YouTubeEmbed videoId={ytId} />;
    }

    // Loom embed
    const loomId = getLoomId(href);
    if (loomId) {
      return <LoomEmbed videoId={loomId} />;
    }

    // Spotify embed
    const spotifyInfo = getSpotifyInfo(href);
    if (spotifyInfo) {
      return <SpotifyEmbed type={spotifyInfo.type} id={spotifyInfo.id} />;
    }

    // GitHub Gist card
    const gistInfo = getGistInfo(href);
    if (gistInfo) {
      return <GistCard user={gistInfo.user} id={gistInfo.id} href={href} />;
    }

    // Direct video URL
    if (isVideoUrl(href)) {
      return <VideoPlayer src={href} />;
    }

    // Direct audio URL
    if (isAudioUrl(href)) {
      return <AudioPlayer src={href} title={typeof children === 'string' ? children : undefined} />;
    }

    // Regular link
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#D1FF00]/80 hover:text-[#D1FF00] underline underline-offset-2 decoration-[#D1FF00]/30 hover:decoration-[#D1FF00]/60 transition-colors"
      >
        {children}
      </a>
    );
  },

  // Images
  img({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <MarkdownImage src={src} alt={alt} />;
  },

  // Headers
  h1({ children }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
      <h1 className="text-xl font-bold text-white mt-5 mb-3 pb-2 border-b border-white/10">
        {children}
      </h1>
    );
  },
  h2({ children }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
      <h2 className="text-lg font-semibold text-white mt-5 mb-2 pb-1.5 border-b border-white/5">
        {children}
      </h2>
    );
  },
  h3({ children }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">{children}</h3>;
  },
  h4({ children }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h4 className="text-sm font-semibold text-white/80 mt-3 mb-1.5">{children}</h4>;
  },

  // Unordered lists
  ul({ children }: React.HTMLAttributes<HTMLUListElement>) {
    return (
      <ul className="my-3 space-y-1.5 pl-0">
        {children}
      </ul>
    );
  },

  // Ordered lists — styled with counter badges
  ol({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) {
    listCounter = 0;
    return (
      <ol className="my-3 space-y-2 pl-0 list-none" {...props}>
        {children}
      </ol>
    );
  },

  // List items — auto-detect ordered vs unordered from parent
  li({ children, ordered, index, ...props }: React.LiHTMLAttributes<HTMLLIElement> & { ordered?: boolean; index?: number }) {
    if (ordered) {
      listCounter++;
      const num = index != null ? index + 1 : listCounter;

      return (
        <li className="flex gap-3 items-start p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] transition-colors hover:bg-white/[0.05]" {...props}>
          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[#D1FF00]/10 border border-[#D1FF00]/20 flex items-center justify-center text-[11px] font-mono font-bold text-[#D1FF00]/80 mt-px">
            {num}
          </span>
          <div className="flex-1 min-w-0 text-sm leading-relaxed text-white/80">
            {processInlineContent(children)}
          </div>
        </li>
      );
    }

    // Unordered list items
    return (
      <li className="flex gap-2.5 items-start text-sm leading-relaxed text-white/80" {...props}>
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#D1FF00]/50 mt-[7px]" />
        <div className="flex-1 min-w-0">{processInlineContent(children)}</div>
      </li>
    );
  },

  // Blockquote
  blockquote({ children }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) {
    return (
      <blockquote className="border border-[#D1FF00]/30 pl-4 my-3 py-1 bg-[#D1FF00]/[0.03] rounded-lg italic text-white/60">
        {children}
      </blockquote>
    );
  },

  // Horizontal rule
  hr() {
    return <hr className="my-5 border-white/10" />;
  },

  // Paragraphs
  p({ children }: React.HTMLAttributes<HTMLParagraphElement>) {
    if (isOnlyChild(children, 'img') || isOnlyChild(children, 'video') || isOnlyChild(children, 'iframe')) {
      return <>{children}</>;
    }
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{processInlineContent(children)}</p>;
  },

  // Strong/Bold — detect command pattern
  strong({ children }: React.HTMLAttributes<HTMLElement>) {
    const text = getTextContent(children);
    if (/^[\w-]+$/.test(text) && (text.includes('_') || text.includes('-'))) {
      return (
        <strong className="font-mono text-[12px] font-semibold text-[#D1FF00] bg-[#D1FF00]/10 border border-[#D1FF00]/20 px-1.5 py-0.5 rounded">
          {children}
        </strong>
      );
    }
    return <strong className="font-semibold text-white">{children}</strong>;
  },

  // Emphasis/Italic
  em({ children }: React.HTMLAttributes<HTMLElement>) {
    return <em className="italic text-white/90">{children}</em>;
  },

  // Task list (checkbox) support
  input({ type, checked, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    if (type === 'checkbox') {
      return (
        <span
          className={cn(
            'inline-flex items-center justify-center w-4 h-4 rounded border mr-2 align-middle',
            checked
              ? 'bg-[#D1FF00]/20 border-[#D1FF00]/40 text-[#D1FF00]'
              : 'border-white/20 bg-white/5'
          )}
          role="img"
          aria-label={checked ? 'concluído' : 'pendente'}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      );
    }
    return <input type={type} checked={checked} aria-label={checked ? 'Item concluído' : 'Item pendente'} {...props} />;
  },

  // Collapsible sections (requires rehype-raw)
  details({ children, ...props }: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
    return (
      <details
        className="my-3 rounded-lg border border-white/10 overflow-hidden group/details"
        {...props}
      >
        {children}
      </details>
    );
  },

  summary({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
    return (
      <summary
        className="px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer text-sm font-medium text-white/80 flex items-center gap-2 select-none transition-colors list-none [&::-webkit-details-marker]:hidden"
        {...props}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[#D1FF00]/60 transition-transform group-open/details:rotate-90 flex-shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {children}
      </summary>
    );
  },

  // Preformatted text (without language)
  pre({ children }: React.HTMLAttributes<HTMLPreElement>) {
    return <>{children}</>;
  },
};

// --- Utility functions ---

function getTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextContent).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextContent((children as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return '';
}

function isOnlyChild(children: React.ReactNode, _tagName: string): boolean {
  if (!Array.isArray(children) && children && typeof children === 'object' && 'type' in children) {
    return true;
  }
  return false;
}

// --- Main component ---

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const processed = useMemo(() => preprocessContent(content), [content]);

  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
