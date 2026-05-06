import { lazy, Suspense, memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Avatar, Badge } from '../ui';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { Message, MessageAttachment, SquadType } from '../../types';

// Lazy load heavy markdown renderer
const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer }))
);

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

// Memoized to prevent re-renders when other messages update
export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return <SystemMessage content={message.content} />;
  }

  // Different animations for user vs agent messages
  const messageAnimation = isUser
    ? {
        initial: { opacity: 0, y: 10, x: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, x: 0, scale: 1 },
        transition: { type: 'spring', damping: 25, stiffness: 400 },
      }
    : {
        initial: { opacity: 0, y: 10, x: -10 },
        animate: { opacity: 1, y: 0, x: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <motion.div
      initial={messageAnimation.initial}
      animate={messageAnimation.animate}
      transition={messageAnimation.transition}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      {showAvatar && !isUser && (
        <Avatar
          name={message.agentName || 'Agent'}
          agentId={message.agentId || message.agentName}
          size="sm"
          squadType={(message.squadType as SquadType) || 'default'}
          className="flex-shrink-0 mt-1"
        />
      )}

      {/* Message Content */}
      <div className={cn('space-y-1', isUser && 'items-end')}>
        {/* Agent name and badge */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-medium text-secondary">
              {message.agentName}
            </span>
            {message.squadType && (
              <Badge variant="squad" squadType={message.squadType} size="sm">
                {message.squadType}
              </Badge>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className="relative group/msg">
          <div
            className={cn(
              'rounded-2xl px-4 py-3 max-w-full',
              isUser
                ? 'message-bubble-user rounded-br-md'
                : 'message-bubble-agent glass rounded-bl-md'
            )}
          >
            <MessageContent
              content={message.content}
              isStreaming={message.isStreaming}
              isUser={isUser}
            />

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments attachments={message.attachments} />
            )}
          </div>

          {/* Copy message button — appears on hover */}
          {!message.isStreaming && (
            <CopyMessageButton content={message.content} isUser={isUser} />
          )}
        </div>

        {/* Timestamp with full date tooltip */}
        {showTimestamp && (
          <span
            className={cn(
              'text-[10px] text-tertiary cursor-default',
              isUser ? 'mr-1 text-right' : 'ml-1'
            )}
            title={new Date(message.timestamp).toLocaleString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          >
            {formatRelativeTime(message.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Only re-render if message content or streaming state changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.attachments === nextProps.message.attachments &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTimestamp === nextProps.showTimestamp
  );
});

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
}

// Copy message button — hover overlay
function CopyMessageButton({ content, isUser }: { content: string; isUser: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute -bottom-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-200',
        'flex items-center gap-1 px-2 py-1 rounded-md text-[10px]',
        'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/90 backdrop-blur-sm',
        'border border-white/10',
        copied && 'bg-green-500/15 text-green-400 border-green-500/20',
        isUser ? 'right-0' : 'left-0'
      )}
      title="Copiar mensagem"
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copiar
        </>
      )}
    </button>
  );
}

// Checklist progress bar
function ChecklistProgress({ content }: { content: string }) {
  const checked = (content.match(/- \[x\]/gi) || []).length;
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  const total = checked + unchecked;

  if (total === 0) return null;

  const pct = Math.round((checked / total) * 100);

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D1FF00] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/50 font-mono whitespace-nowrap">
        {checked}/{total}
      </span>
    </div>
  );
}

function MessageContent({ content, isStreaming, isUser }: MessageContentProps) {
  if (!content && isStreaming) {
    return <TypingIndicator />;
  }

  // Check if content has markdown formatting (for user messages)
  const hasMarkdown = isUser && /[*_`#[\]|>]/.test(content);

  // For user messages with markdown formatting, use markdown renderer
  // For simple user messages, use plain text for performance
  if (isUser && !hasMarkdown) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }

  // For agent messages or user messages with markdown, use full Markdown rendering (lazy loaded)
  return (
    <div className="relative">
      <ChecklistProgress content={content} />
      <Suspense fallback={<MarkdownFallback content={content} />}>
        <MarkdownRenderer content={content} />
      </Suspense>
      {isStreaming && <StreamingCursor />}
    </div>
  );
}

// Attachments component for media display
interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const images = attachments.filter(a => a.type === 'image');
  const videos = attachments.filter(a => a.type === 'video');
  const audios = attachments.filter(a => a.type === 'audio');
  const files = attachments.filter(a => a.type !== 'image' && a.type !== 'video' && a.type !== 'audio');

  return (
    <div className="mt-3 space-y-2">
      {/* Image grid */}
      {images.length > 0 && (
        <div className={cn(
          'grid gap-2',
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' :
          'grid-cols-2 md:grid-cols-3'
        )}>
          {images.map((img) => (
            <ImageAttachment key={img.id} attachment={img} />
          ))}
        </div>
      )}

      {/* Video players */}
      {videos.map((vid) => (
        <VideoAttachment key={vid.id} attachment={vid} />
      ))}

      {/* Audio players */}
      {audios.map((aud) => (
        <AudioAttachment key={aud.id} attachment={aud} />
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <FileAttachment key={file.id} attachment={file} />
          ))}
        </div>
      )}
    </div>
  );
}

// Image attachment with lightbox
function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const imageUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10"
        onClick={() => setShowLightbox(true)}
      >
        <img
          src={attachment.thumbnailUrl || imageUrl}
          alt={attachment.name}
          className="w-full h-auto max-h-[300px] object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[rgb(0_0_0/0.5)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="text-xs text-white bg-[rgb(0_0_0/0.5)] px-2 py-1 rounded">
            Clique para ampliar
          </span>
        </div>
      </motion.div>

      {/* Lightbox */}
      {showLightbox && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[rgb(0_0_0/0.95)] flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Fechar visualização"
              onClick={() => setShowLightbox(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Download button */}
            <button
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              aria-label="Baixar imagem"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-sm">Download</span>
            </button>

            {/* Image info */}
            <div className="absolute bottom-4 left-4 text-white/70 text-sm">
              {attachment.name}
            </div>

            {/* Full image */}
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={imageUrl}
              alt={attachment.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// Video attachment with player
function VideoAttachment({ attachment }: { attachment: MessageAttachment }) {
  const videoUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-lg overflow-hidden border border-white/10"
    >
      <video
        src={videoUrl}
        controls
        preload="metadata"
        poster={attachment.thumbnailUrl}
        className="w-full max-h-[400px]"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <track kind="captions" />
        Seu navegador não suporta o elemento de vídeo.
      </video>
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03]">
        <span className="text-xs text-tertiary truncate">{attachment.name}</span>
        <span className="text-[10px] text-tertiary">{formatFileSize(attachment.size)}</span>
      </div>
    </motion.div>
  );
}

// Audio attachment with player
function AudioAttachment({ attachment }: { attachment: MessageAttachment }) {
  const audioUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-secondary mb-1 truncate">{attachment.name}</p>
        <audio src={audioUrl} controls preload="metadata" className="w-full h-8" style={{ colorScheme: 'dark' }}>
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// File attachment with download
function FileAttachment({ attachment }: { attachment: MessageAttachment }) {
  const fileUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = () => {
    const type = attachment.mimeType;
    if (type.includes('pdf')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    }
    if (type.includes('audio')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    }
    if (type.includes('video')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    }
    // Default file icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-white/5">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">{attachment.name}</p>
        <p className="text-xs text-tertiary">{formatFileSize(attachment.size)}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex-shrink-0 p-2 text-tertiary hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Baixar arquivo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </motion.div>
  );
}

// Simple text fallback while markdown loads
function MarkdownFallback({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="typing-dot" style={{ animationDelay: '0ms' }} />
      <div className="typing-dot" style={{ animationDelay: '200ms' }} />
      <div className="typing-dot" style={{ animationDelay: '400ms' }} />
    </div>
  );
}

function StreamingCursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
    />
  );
}

interface SystemMessageProps {
  content: string;
}

function SystemMessage({ content }: SystemMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center py-2"
    >
      <span className="text-xs text-tertiary glass-subtle px-3 py-1 rounded-full">
        {content}
      </span>
    </motion.div>
  );
}
