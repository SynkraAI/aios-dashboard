import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton, useToast } from '../ui';
import { cn } from '../../lib/utils';
import type { ChatSession } from '../../types';

// Icons
const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Format icons
const MarkdownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 4H2v16h20V4zM4 18V6h16v12H4zm2-3V9h2l2 3 2-3h2v6h-2v-4l-2 3-2-3v4H6zm9-6h2v6h-2v-6z"/>
  </svg>
);

const JsonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6c0-1.1.9-2 2-2h2" />
    <path d="M4 18c0 1.1.9 2 2 2h2" />
    <path d="M20 6c0-1.1-.9-2-2-2h-2" />
    <path d="M20 18c0 1.1-.9 2-2 2h-2" />
    <path d="M8 6v4c0 1.1-.9 2-2 2s2 .9 2 2v4" />
    <path d="M16 6v4c0 1.1.9 2 2 2s-2 .9-2 2v4" />
  </svg>
);

const TxtIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const HtmlIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

type ExportFormat = 'markdown' | 'json' | 'txt' | 'html';

interface FormatOption {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  icon: React.ReactNode;
  description: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    extension: '.md',
    mimeType: 'text/markdown',
    icon: <MarkdownIcon />,
    description: 'Formatação rica com headers e estilos',
  },
  {
    id: 'json',
    label: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
    icon: <JsonIcon />,
    description: 'Dados estruturados para importação',
  },
  {
    id: 'txt',
    label: 'Texto',
    extension: '.txt',
    mimeType: 'text/plain',
    icon: <TxtIcon />,
    description: 'Texto simples sem formatação',
  },
  {
    id: 'html',
    label: 'HTML',
    extension: '.html',
    mimeType: 'text/html',
    icon: <HtmlIcon />,
    description: 'Página web com estilos',
  },
];

// Convert session to different formats
function sessionToMarkdown(session: ChatSession): string {
  const lines: string[] = [];

  lines.push(`# Conversa com ${session.agentName}`);
  lines.push('');
  lines.push(`**Squad:** ${session.squadId}`);
  lines.push(`**Data:** ${new Date(session.createdAt).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`);
  lines.push(`**Mensagens:** ${session.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  session.messages.forEach((message) => {
    const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (message.role === 'user') {
      lines.push(`### [User] Você (${time})`);
    } else if (message.role === 'agent') {
      lines.push(`### [Agent] ${message.agentName || session.agentName} (${time})`);
    } else {
      lines.push(`### [System] Sistema (${time})`);
    }
    lines.push('');
    lines.push(message.content);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push(`*Exportado do AIOS Core em ${new Date().toLocaleString('pt-BR')}*`);

  return lines.join('\n');
}

function sessionToJson(session: ChatSession): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    session: {
      id: session.id,
      agentId: session.agentId,
      agentName: session.agentName,
      squadId: session.squadId,
      squadType: session.squadType,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages.length,
    },
    messages: session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      agentId: msg.agentId,
      agentName: msg.agentName,
      metadata: msg.metadata,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

function sessionToTxt(session: ChatSession): string {
  const lines: string[] = [];

  lines.push('═'.repeat(50));
  lines.push(`CONVERSA COM ${session.agentName.toUpperCase()}`);
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(`Squad: ${session.squadId}`);
  lines.push(`Data: ${new Date(session.createdAt).toLocaleString('pt-BR')}`);
  lines.push(`Mensagens: ${session.messages.length}`);
  lines.push('');
  lines.push('─'.repeat(50));
  lines.push('');

  session.messages.forEach((message, index) => {
    const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let sender = 'Sistema';
    if (message.role === 'user') {
      sender = 'Você';
    } else if (message.role === 'agent') {
      sender = message.agentName || session.agentName;
    }

    lines.push(`[${time}] ${sender}:`);
    lines.push(message.content);
    if (index < session.messages.length - 1) {
      lines.push('');
    }
  });

  lines.push('');
  lines.push('─'.repeat(50));
  lines.push(`Exportado do AIOS Core em ${new Date().toLocaleString('pt-BR')}`);

  return lines.join('\n');
}

function sessionToHtml(session: ChatSession): string {
  const messagesHtml = session.messages.map((message) => {
    const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const isUser = message.role === 'user';
    const sender = isUser ? 'Você' : (message.agentName || session.agentName);
    const bgColor = isUser ? '#3b82f6' : '#374151';
    const align = isUser ? 'right' : 'left';
    const marginSide = isUser ? 'margin-left: 20%' : 'margin-right: 20%';

    return `
      <div style="margin: 12px 0; text-align: ${align};">
        <div style="display: inline-block; max-width: 80%; ${marginSide}; text-align: left;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
            ${isUser ? '[User]' : '[Agent]'} ${sender} \u00B7 ${time}
          </div>
          <div style="background: ${bgColor}; color: white; padding: 12px 16px; border-radius: 16px; white-space: pre-wrap; line-height: 1.5;">
            ${escapeHtml(message.content)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversa com ${escapeHtml(session.agentName)} - AIOS Core</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(31, 41, 55, 0.8);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }
    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
    }
    .header h1 { color: white; font-size: 24px; margin-bottom: 8px; }
    .header p { color: #9ca3af; font-size: 14px; }
    .messages { padding: 20px; }
    .footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Conversa com ${escapeHtml(session.agentName)}</h1>
      <p>Squad: ${escapeHtml(session.squadId)} · ${session.messages.length} mensagens · ${new Date(session.createdAt).toLocaleDateString('pt-BR')}</p>
    </div>
    <div class="messages">
      ${messagesHtml}
    </div>
    <div class="footer">
      Exportado do AIOS Core em ${new Date().toLocaleString('pt-BR')}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function getExportContent(session: ChatSession, format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return sessionToMarkdown(session);
    case 'json':
      return sessionToJson(session);
    case 'txt':
      return sessionToTxt(session);
    case 'html':
      return sessionToHtml(session);
  }
}

// Download as file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
}

export function ExportChatModal({ isOpen, onClose, session }: ExportChatModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const exportContent = useMemo(() => {
    if (!session) return '';
    return getExportContent(session, selectedFormat);
  }, [session, selectedFormat]);

  if (!session) return null;

  const currentFormat = formatOptions.find((f) => f.id === selectedFormat)!;
  const filename = `conversa-${session.agentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}${currentFormat.extension}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportContent);
    setCopied(true);
    success('Copiado!', 'Conteúdo copiado para o clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadFile(exportContent, filename, currentFormat.mimeType);
    success('Download iniciado', filename);
  };

  const getPreviewContent = () => {
    if (selectedFormat === 'html') {
      // Show truncated HTML for preview
      const truncated = exportContent.length > 2000
        ? exportContent.slice(0, 2000) + '\n\n... (conteúdo truncado)'
        : exportContent;
      return truncated;
    }
    return exportContent;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(0_0_0/0.5)] backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[5%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl max-h-[90vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl glass-subtle flex items-center justify-center text-primary">
                    <ExportIcon />
                  </div>
                  <div>
                    <h2 className="text-primary font-semibold">Exportar Conversa</h2>
                    <p className="text-xs text-tertiary">{session.messages.length} mensagens · {session.agentName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Format Selection */}
              <div className="p-4 border-b border-white/10">
                <p className="text-xs text-tertiary mb-3">Selecione o formato de exportação:</p>
                <div className="grid grid-cols-4 gap-2">
                  {formatOptions.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={cn(
                        'p-3 rounded-xl border transition-all duration-200',
                        'flex flex-col items-center gap-2',
                        selectedFormat === format.id
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10 hover:text-primary'
                      )}
                    >
                      <span className={cn(
                        'transition-colors',
                        selectedFormat === format.id ? 'text-blue-400' : 'text-tertiary'
                      )}>
                        {format.icon}
                      </span>
                      <span className="text-xs font-medium">{format.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-tertiary mt-2 text-center">
                  {currentFormat.description}
                </p>
              </div>

              {/* Preview */}
              <div className="flex-1 overflow-hidden p-4 min-h-0">
                <div className="h-full overflow-y-auto glass-scrollbar rounded-xl glass-subtle p-4">
                  <pre className={cn(
                    'text-xs whitespace-pre-wrap font-mono leading-relaxed',
                    selectedFormat === 'json' ? 'text-green-400' : 'text-secondary'
                  )}>
                    {getPreviewContent()}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span className="px-2 py-1 rounded bg-white/5">{currentFormat.extension}</span>
                  <span>·</span>
                  <span>{(new Blob([exportContent]).size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    leftIcon={copied ? <CheckIcon /> : <CopyIcon />}
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleDownload}
                    leftIcon={<DownloadIcon />}
                  >
                    Download
                  </GlassButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export button for chat header
interface ExportChatButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ExportChatButton({ onClick, disabled }: ExportChatButtonProps) {
  return (
    <GlassButton
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title="Exportar conversa"
      aria-label="Exportar conversa"
      className="h-8 w-8"
    >
      <ExportIcon />
    </GlassButton>
  );
}
