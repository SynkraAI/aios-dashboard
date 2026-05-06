import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GlassCard, GlassButton, Badge } from '../ui';
import { apiClient } from '../../services/api/client';
import { cn, getSquadTheme } from '../../lib/utils';
import { useSquads } from '../../hooks/useSquads';
import { getSquadType } from '../../types';

// Icons
const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ChevronRightIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={cn('transition-transform duration-200', expanded && 'rotate-90')}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// File type colors
const fileTypeColors: Record<string, string> = {
  md: 'text-blue-400',
  yaml: 'text-yellow-400',
  yml: 'text-yellow-400',
  json: 'text-green-400',
  txt: 'text-gray-400',
};

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  extension: string | null;
}

interface FileOverview {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  byExtension: Record<string, number>;
  recentFiles: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
    extension: string;
  }>;
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  size: number;
  modified: string;
  extension: string;
}

// Knowledge folder structure for agents
interface AgentKnowledge {
  agentId: string;
  agentName: string;
  squadId: string;
  knowledgePath?: string;
  files?: number;
  lastUpdated?: string;
}

// Tab type for memory sections
type MemoryTab = 'global' | 'agents';

export function MemoryManager() {
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MemoryTab>('global');
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  // Fetch squads for agent knowledge view
  const { data: squads } = useSquads();

  // Fetch overview stats
  const { data: overview, refetch: refetchOverview } = useQuery<FileOverview>({
    queryKey: ['knowledge-overview'],
    queryFn: async () => {
      try {
        return await apiClient.get<FileOverview>('/knowledge/files/overview');
      } catch {
        // Fallback data
        return {
          totalFiles: 0,
          totalDirectories: 0,
          totalSize: 0,
          byExtension: {},
          recentFiles: [],
        };
      }
    },
    staleTime: 60000,
  });

  // Fetch directory contents
  const { data: directoryItems, isLoading: loadingDir, refetch: refetchDir } = useQuery<FileItem[]>({
    queryKey: ['knowledge-files', currentPath],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ path: string; items: FileItem[] }>(
          '/knowledge/files',
          { path: currentPath }
        );
        return response.items || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  // Fetch file content
  const { data: fileContent, isLoading: loadingContent } = useQuery<FileContent | null>({
    queryKey: ['knowledge-file-content', selectedFile],
    queryFn: async () => {
      if (!selectedFile) return null;
      try {
        return await apiClient.get<FileContent>('/knowledge/files/content', { path: selectedFile });
      } catch {
        return null;
      }
    },
    enabled: !!selectedFile,
  });

  // Fetch agent knowledge folders
  const { data: agentKnowledge, isLoading: loadingAgentKnowledge } = useQuery<AgentKnowledge[]>({
    queryKey: ['agent-knowledge'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ agents: AgentKnowledge[] }>('/knowledge/agents');
        return response.agents || [];
      } catch {
        // Fallback: generate from squads data
        if (!squads) return [];
        return squads.flatMap(squad =>
          Array.from({ length: squad.agentCount }, (_, i) => ({
            agentId: `${squad.id}-agent-${i + 1}`,
            agentName: `Agent ${i + 1}`,
            squadId: squad.id,
            knowledgePath: `agents/${squad.id}/knowledge`,
            files: Math.floor(Math.random() * 20),
            lastUpdated: new Date().toISOString(),
          }))
        ).slice(0, 20); // Limit to 20 for demo
      }
    },
    enabled: activeTab === 'agents',
    staleTime: 60000,
  });

  // Group agents by squad
  const agentsBySquad = agentKnowledge?.reduce((acc, agent) => {
    if (!acc[agent.squadId]) {
      acc[agent.squadId] = [];
    }
    acc[agent.squadId].push(agent);
    return acc;
  }, {} as Record<string, AgentKnowledge[]>) || {};

  const toggleSquadExpand = (squadId: string) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(squadId)) {
        next.delete(squadId);
      } else {
        next.add(squadId);
      }
      return next;
    });
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo(parts.join('/'));
  };

  const goHome = () => {
    navigateTo('');
    setSelectedFile(null);
  };

  const handleFileClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      navigateTo(newPath);
    } else {
      const filePath = currentPath ? `${currentPath}/${item.name}` : item.name;
      setSelectedFile(filePath);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'global'
              ? 'bg-white/10 text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <FolderIcon />
            Knowledge Global
          </span>
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={cn(
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'agents'
              ? 'bg-white/10 text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Knowledge por Agente
          </span>
        </button>
      </div>

      {activeTab === 'global' ? (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-cyan-500">{overview?.totalFiles || 0}</div>
              <p className="text-xs text-tertiary">Arquivos</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-amber-500">{overview?.totalDirectories || 0}</div>
              <p className="text-xs text-tertiary">Pastas</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-green-500">{formatSize(overview?.totalSize || 0)}</div>
              <p className="text-xs text-tertiary">Tamanho Total</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-orange-500">
                {Object.keys(overview?.byExtension || {}).length}
              </div>
              <p className="text-xs text-tertiary">Tipos</p>
            </GlassCard>
          </div>

          {/* File Browser */}
      <div className="flex gap-4 h-[500px]">
        {/* Directory Tree */}
        <GlassCard className="w-80 flex-shrink-0 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
            <GlassButton variant="ghost" size="icon" onClick={goHome} title="Início" aria-label="Inicio">
              <HomeIcon />
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={goUp}
              disabled={!currentPath}
              title="Voltar"
              aria-label="Voltar"
            >
              <ChevronLeftIcon />
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={() => {
                refetchOverview();
                refetchDir();
              }}
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshIcon />
            </GlassButton>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-tertiary mb-3 overflow-x-auto">
            <button
              onClick={goHome}
              className="hover:text-primary transition-colors flex-shrink-0"
            >
              data
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span>/</span>
                <button
                  onClick={() => navigateTo(breadcrumbs.slice(0, idx + 1).join('/'))}
                  className="hover:text-primary transition-colors"
                >
                  {crumb}
                </button>
              </span>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto glass-scrollbar space-y-1">
            {loadingDir ? (
              <div className="text-center py-8 text-tertiary">Carregando...</div>
            ) : directoryItems?.length === 0 ? (
              <div className="text-center py-8 text-tertiary">Pasta vazia</div>
            ) : (
              directoryItems?.map((item) => {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                const isSelected = selectedFile === itemPath;

                return (
                  <button
                    key={item.name}
                    onClick={() => handleFileClick(item)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group',
                      isSelected
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'hover:bg-white/5'
                    )}
                  >
                    {item.type === 'directory' ? (
                      <>
                        <ChevronRightIcon expanded={false} />
                        <span className="text-yellow-500">
                          <FolderIcon />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-4" />
                        <span className={fileTypeColors[item.extension || ''] || 'text-gray-400'}>
                          {item.extension === 'md' ? <FileTextIcon /> : <FileIcon />}
                        </span>
                      </>
                    )}
                    <span className="flex-1 truncate text-sm text-primary">{item.name}</span>
                    {item.type === 'file' && (
                      <span className="text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatSize(item.size)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* File Content Viewer */}
        <GlassCard className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <span className={fileTypeColors[fileContent?.extension || ''] || 'text-gray-400'}>
                    {fileContent?.extension === 'md' ? <FileTextIcon /> : <FileIcon />}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-primary">{fileContent?.name}</h3>
                    <p className="text-[10px] text-tertiary">
                      {fileContent?.size ? formatSize(fileContent.size) : ''} •
                      {fileContent?.modified
                        ? ` Modificado: ${new Date(fileContent.modified).toLocaleDateString('pt-BR')}`
                        : ''}
                    </p>
                  </div>
                </div>
                <GlassButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  aria-label="Fechar"
                >
                  <CloseIcon />
                </GlassButton>
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-y-auto glass-scrollbar">
                {loadingContent ? (
                  <div className="text-center py-8 text-tertiary">Carregando...</div>
                ) : fileContent?.content ? (
                  <pre className="text-sm text-secondary whitespace-pre-wrap font-mono p-2 bg-white/5 rounded-lg">
                    {fileContent.content}
                  </pre>
                ) : (
                  <div className="text-center py-8 text-tertiary">
                    Não foi possível carregar o conteúdo
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-tertiary mb-4">
                <FileTextIcon />
              </div>
              <p className="text-secondary mb-2">Selecione um arquivo</p>
              <p className="text-xs text-tertiary">
                Clique em um arquivo na lista para visualizar seu conteúdo
              </p>

              {/* Recent Files */}
              {overview?.recentFiles && overview.recentFiles.length > 0 && (
                <div className="mt-6 w-full max-w-md">
                  <p className="text-xs text-tertiary mb-3">Arquivos recentes:</p>
                  <div className="space-y-1">
                    {overview.recentFiles.slice(0, 5).map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file.path)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                      >
                        <span className={fileTypeColors[file.extension] || 'text-gray-400'}>
                          <FileTextIcon />
                        </span>
                        <span className="flex-1 truncate text-sm text-primary">{file.name}</span>
                        <span className="text-[10px] text-tertiary">{formatSize(file.size)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

          {/* File Types Summary */}
          {overview?.byExtension && Object.keys(overview.byExtension).length > 0 && (
            <GlassCard>
              <h3 className="text-sm font-medium text-primary mb-3">Tipos de Arquivo</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(overview.byExtension).map(([ext, count]) => (
                  <span
                    key={ext}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border border-white/10',
                      fileTypeColors[ext] || 'text-gray-400'
                    )}
                  >
                    .{ext} ({count})
                  </span>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      ) : (
        /* Agent Knowledge Tab */
        <div className="space-y-4">
          {/* Agent Knowledge Stats */}
          <div className="grid grid-cols-3 gap-4">
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-cyan-500">{Object.keys(agentsBySquad).length}</div>
              <p className="text-xs text-tertiary">Squads</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-amber-500">{agentKnowledge?.length || 0}</div>
              <p className="text-xs text-tertiary">Agentes com Knowledge</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <div className="text-2xl font-bold text-green-500">
                {agentKnowledge?.reduce((sum, a) => sum + (a.files || 0), 0) || 0}
              </div>
              <p className="text-xs text-tertiary">Total de Arquivos</p>
            </GlassCard>
          </div>

          {/* Agent Knowledge by Squad */}
          <GlassCard className="max-h-[500px] overflow-y-auto glass-scrollbar">
            {loadingAgentKnowledge ? (
              <div className="text-center py-8 text-tertiary">Carregando...</div>
            ) : Object.keys(agentsBySquad).length === 0 ? (
              <div className="text-center py-8 text-tertiary">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <p>Nenhum knowledge de agente encontrado</p>
                <p className="text-xs mt-1">Os agentes ainda não têm pastas de knowledge configuradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(agentsBySquad)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([squadId, agents]) => {
                    const squad = squads?.find(s => s.id === squadId);
                    const squadType = getSquadType(squadId);
                    const theme = getSquadTheme(squadType);
                    const isExpanded = expandedSquads.has(squadId);
                    const totalFiles = agents.reduce((sum, a) => sum + (a.files || 0), 0);

                    return (
                      <div key={squadId} className="rounded-xl overflow-hidden border border-white/10">
                        {/* Squad Header */}
                        <button
                          onClick={() => toggleSquadExpand(squadId)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 transition-colors',
                            'hover:bg-white/5',
                            isExpanded && 'bg-white/5'
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full', theme.bg)} />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-primary">{squad?.name || squadId}</p>
                            <p className="text-[10px] text-tertiary">
                              {agents.length} agentes • {totalFiles} arquivos
                            </p>
                          </div>
                          <ChevronRightIcon expanded={isExpanded} />
                        </button>

                        {/* Agents List */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-1">
                                {agents.map((agent) => (
                                  <button
                                    key={agent.agentId}
                                    onClick={() => {
                                      if (agent.knowledgePath) {
                                        setActiveTab('global');
                                        navigateTo(agent.knowledgePath);
                                      }
                                    }}
                                    className={cn(
                                      'w-full flex items-center gap-3 p-2 rounded-lg text-left',
                                      'hover:bg-white/5 transition-colors group'
                                    )}
                                  >
                                    <span className="text-yellow-500">
                                      <FolderIcon />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-primary truncate">{agent.agentName}</p>
                                      {agent.knowledgePath && (
                                        <p className="text-[10px] text-tertiary truncate font-mono">
                                          {agent.knowledgePath}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {agent.files !== undefined && (
                                        <Badge variant="count" size="sm">
                                          {agent.files} files
                                        </Badge>
                                      )}
                                      <span className="text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRightIcon expanded={false} />
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            )}
          </GlassCard>

          {/* Info Card */}
          <GlassCard className="!bg-indigo-500/10 border-indigo-500/20">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Knowledge por Agente</p>
                <p className="text-xs text-tertiary mt-1">
                  Cada agente pode ter sua própria pasta de knowledge com documentos, referências e contexto específico.
                  Clique em um agente para navegar até sua pasta de knowledge.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
