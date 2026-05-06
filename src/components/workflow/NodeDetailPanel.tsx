import { motion } from 'framer-motion';
import { GlassButton, Badge, Avatar } from '../ui';
import { cn, formatRelativeTime, getSquadTheme } from '../../lib/utils';
import { CloseIcon, ClockIcon, TokenIcon, CheckIcon, SpinnerIcon, FileIcon, CodeIcon, ImageFileIcon } from './WorkflowIcons';
import { formatDuration, formatTokens } from './workflow-utils';
import type { WorkflowMission, AgentTool } from './types';
import type { SquadType } from '../../types';

export function NodeDetailPanel({
  node,
  onClose,
}: {
  node: WorkflowMission['nodes'][0];
  onClose: () => void;
}) {
  // Get gradient color from centralized theme
  const getNodeGradient = (squadType: string | undefined): string => {
    if (!squadType) return 'from-blue-500 to-cyan-500';
    const theme = getSquadTheme(squadType as SquadType);
    return theme.gradient;
  };

  const completedTodos = node.todos?.filter((t) => t.status === 'completed').length || 0;
  const totalTodos = node.todos?.length || 0;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageFileIcon />;
      case 'code':
      case 'json':
        return <CodeIcon />;
      default:
        return <FileIcon />;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'markdown':
        return 'text-blue-500';
      case 'json':
      case 'code':
        return 'text-purple-500';
      case 'image':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div
      className="h-full flex flex-col w-80 backdrop-blur-xl"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 100% 100%, rgba(140, 60, 180, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 0% 0%, rgba(60, 180, 200, 0.10) 0%, transparent 50%),
          rgba(15, 15, 20, 0.65)
        `
      }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Detalhes do Nó</h3>
        </div>
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </GlassButton>
      </div>

      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4">
        {/* Node Header */}
        <div className="flex items-center gap-3">
          {node.agentName ? (
            <Avatar
              name={node.agentName}
              size="lg"
              squadType={node.squadType}
              status={node.status === 'active' ? 'online' : node.status === 'waiting' ? 'busy' : 'offline'}
            />
          ) : (
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center',
                node.type === 'start' && 'bg-green-500/20 text-green-500',
                node.type === 'end' && 'bg-blue-500/20 text-blue-500',
                node.type === 'checkpoint' && 'bg-yellow-500/20 text-yellow-500'
              )}
            >
              {node.type === 'start' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              {node.type === 'end' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {node.type === 'checkpoint' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-white/90 font-semibold">{node.label}</h4>
            {node.agentName && (
              <p className="text-white/60 text-sm">{node.agentName}</p>
            )}
          </div>
          <Badge
            variant="status"
            status={
              node.status === 'completed'
                ? 'success'
                : node.status === 'active'
                ? 'warning'
                : node.status === 'error'
                ? 'error'
                : 'offline'
            }
            size="sm"
          >
            {node.status === 'completed' && 'Concluído'}
            {node.status === 'active' && 'Em execução'}
            {node.status === 'waiting' && 'Aguardando'}
            {node.status === 'idle' && 'Pendente'}
            {node.status === 'error' && 'Erro'}
          </Badge>
        </div>

        {/* Progress */}
        {node.progress !== undefined && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Progresso Total</span>
              <span className="text-white font-semibold">{node.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[rgb(0_0_0/0.3)] overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  getNodeGradient(node.squadType)
                )}
                initial={{ width: 0 }}
                animate={{ width: `${node.progress}%` }}
                transition={{ duration: 0.5 }}
                style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
              />
            </div>
            {node.startedAt && (
              <p className="text-[10px] text-white/40">
                Iniciado {formatRelativeTime(node.startedAt)}
                {node.completedAt && ` · Concluído ${formatRelativeTime(node.completedAt)}`}
              </p>
            )}
          </div>
        )}

        {/* Request - What was asked */}
        {node.request && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Solicitação</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">{node.request}</p>
          </div>
        )}

        {/* Current Action */}
        {node.currentAction && node.status === 'active' && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, transparent 100%)',
              border: '1px solid rgba(249, 115, 22, 0.35)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <SpinnerIcon />
              <span className="text-xs font-semibold text-orange-400">Ação Atual</span>
            </div>
            <p className="text-sm text-white/90">{node.currentAction}</p>
          </div>
        )}

        {/* Todo List */}
        {node.todos && node.todos.length > 0 && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Todo List</span>
              </div>
              <Badge variant="count" size="sm">
                {completedTodos}/{totalTodos}
              </Badge>
            </div>
            <div className="space-y-2">
              {node.todos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-2"
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
                      todo.status === 'completed' && 'bg-green-500/20 text-green-400',
                      todo.status === 'in-progress' && 'bg-orange-500/20 text-orange-400',
                      todo.status === 'pending' && 'bg-gray-500/20 text-gray-400'
                    )}
                  >
                    {todo.status === 'completed' && <CheckIcon />}
                    {todo.status === 'in-progress' && <SpinnerIcon />}
                  </div>
                  <span
                    className={cn(
                      'text-xs leading-relaxed',
                      todo.status === 'completed' ? 'text-white/40 line-through' : 'text-white/90'
                    )}
                  >
                    {todo.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Files */}
        {node.files && node.files.length > 0 && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-indigo-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Arquivos Gerados</span>
              </div>
              <Badge variant="count" size="sm">
                {node.files.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {node.files.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className={cn('flex-shrink-0', getFileColor(file.type))}>
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/90 font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-white/40">
                      {file.size} · {formatRelativeTime(file.createdAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Output/Result */}
        {node.output && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%)',
              border: '1px solid rgba(34, 197, 94, 0.35)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-green-400">Resultado</span>
            </div>
            <p className="text-sm text-white/90">{node.output}</p>
          </div>
        )}

        {/* Waiting Message */}
        {node.status === 'waiting' && (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, transparent 100%)',
              border: '1px solid rgba(234, 179, 8, 0.35)'
            }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-xs text-yellow-400">{node.currentAction || 'Aguardando dependências...'}</span>
            </div>
          </div>
        )}

        {/* Tools & Integrations */}
        {node.tools && node.tools.length > 0 && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Ferramentas</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {node.tools.map((tool) => (
                <ToolBadge key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        )}

        {/* Token Usage */}
        {node.tokens && node.tokens.total > 0 && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <TokenIcon />
              </div>
              <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Uso de Tokens</span>
            </div>
            <div
              className="rounded-lg p-2 space-y-1.5"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Input</span>
                <span className="text-xs text-white/70 font-medium">{formatTokens(node.tokens.input)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Output</span>
                <span className="text-xs text-white/70 font-medium">{formatTokens(node.tokens.output)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                <span className="text-[10px] text-white/50 font-medium">Total</span>
                <span className="text-xs text-amber-400 font-semibold">{formatTokens(node.tokens.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Duration */}
        {node.estimatedDuration && node.status !== 'completed' && (
          <div className="pt-2 flex items-center gap-2 text-white/40">
            <ClockIcon />
            <span className="text-[10px]">
              Duração estimada: {formatDuration(node.estimatedDuration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Badge Component
export function ToolBadge({ tool }: { tool: AgentTool }) {
  const toolIcons: Record<string, React.ReactNode> = {
    'web-search': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    'web-scraper': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
      </svg>
    ),
    'code-interpreter': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    'image-gen': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    'file-system': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
    'database': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    'api': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    'email': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    'slack': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
    'notion': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    ),
    'figma': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5zM12 2h3.5a3.5 3.5 0 1 1 0 7H12V2zm0 9.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0zm-7 7a3.5 3.5 0 0 1 3.5-3.5H12v3.5a3.5 3.5 0 1 1-7 0zm0-7A3.5 3.5 0 0 1 8.5 8H12v7H8.5A3.5 3.5 0 0 1 5 11.5z" />
      </svg>
    ),
    'github': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    'analytics': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    'calendar': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    'sheets': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    'docs': (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
        'transition-all cursor-default',
        tool.connected
          ? 'bg-white/5 text-secondary hover:bg-white/10'
          : 'bg-white/3 text-tertiary opacity-50'
      )}
      title={tool.description || tool.name}
    >
      <span className="opacity-70">{toolIcons[tool.id] || toolIcons['api']}</span>
      <span>{tool.name}</span>
      {tool.connected && (
        <span className="h-1 w-1 rounded-full bg-green-500" />
      )}
    </div>
  );
}
