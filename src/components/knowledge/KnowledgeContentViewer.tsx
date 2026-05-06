import { useCallback } from 'react';
import { FileText, File, X, Copy } from 'lucide-react';
import { GlassCard, GlassButton, Badge } from '../ui';
import {
  useKnowledgeFileContent,
  formatFileSize,
  FILE_TYPE_COLORS,
} from '../../hooks/useKnowledge';

interface KnowledgeContentViewerProps {
  filePath: string | null;
  onClose: () => void;
}

export function KnowledgeContentViewer({ filePath, onClose }: KnowledgeContentViewerProps) {
  const { data: fileContent, isLoading } = useKnowledgeFileContent(filePath);

  const handleCopy = useCallback(() => {
    if (fileContent?.content) {
      navigator.clipboard.writeText(fileContent.content);
    }
  }, [fileContent]);

  if (!filePath) {
    return (
      <GlassCard className="flex-1 flex flex-col items-center justify-center">
        <FileText size={40} className="mb-3 text-tertiary opacity-30" />
        <p className="text-sm text-secondary">Selecione um arquivo</p>
        <p className="text-xs text-tertiary mt-1">
          Clique em um arquivo na lista para visualizar seu conteudo
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden">
      {/* File Header */}
      <div className="flex items-center justify-between p-3 border-b border-glass-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className={FILE_TYPE_COLORS[fileContent?.extension || ''] || 'text-gray-400'}>
            {fileContent?.extension === 'md' ? <FileText size={16} /> : <File size={16} />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-primary truncate">
              {fileContent?.name || filePath.split('/').pop()}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-tertiary">
              {fileContent?.size !== undefined && <span>{formatFileSize(fileContent.size)}</span>}
              {fileContent?.extension && (
                <Badge variant="subtle" size="sm">.{fileContent.extension}</Badge>
              )}
              {fileContent?.modified && (
                <span>{new Date(fileContent.modified).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} aria-label="Copiar conteudo">
            <Copy size={14} />
          </GlassButton>
          <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </GlassButton>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-y-auto p-4 glass-scrollbar">
        {isLoading ? (
          <div className="text-center py-8 text-tertiary text-sm">Carregando...</div>
        ) : fileContent?.content ? (
          <pre className="text-sm whitespace-pre-wrap font-mono p-4 rounded-xl bg-[rgb(0_0_0/0.2)] text-secondary leading-relaxed">
            {fileContent.content}
          </pre>
        ) : (
          <div className="text-center py-8 text-tertiary text-sm">
            Nao foi possivel carregar o conteudo
          </div>
        )}
      </div>
    </GlassCard>
  );
}
