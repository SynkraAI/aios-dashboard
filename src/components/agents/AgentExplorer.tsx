import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton, Badge, Avatar } from '../ui';
import { AgentExplorerCard } from './AgentCard';
import { useAgents, useSquads, useAgent, useAgentCommands } from '../../hooks';
import { useChat } from '../../hooks/useChat';
import { cn, getTierTheme } from '../../lib/utils';
import type { AgentSummary, AgentTier } from '../../types';
import { getSquadType } from '../../types';
import { useUIStore } from '../../stores/uiStore';

// Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

interface AgentExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tier colors are now accessed via getTierTheme() from centralized theme

export function AgentExplorer({ isOpen, onClose }: AgentExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<AgentTier | 'all'>('all');
  const [selectedSquadId, setSelectedSquadId] = useState<string | 'all'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentSquadId, setSelectedAgentSquadId] = useState<string | null>(null);

  const { data: allAgents, isLoading: loadingAgents } = useAgents();
  const { data: squads } = useSquads();
  const { selectAgent: startChat } = useChat();
  const isAiox = useUIStore((s) => s.theme) === 'aiox';

  // Filter agents
  const filteredAgents = useMemo(() => {
    if (!allAgents) return [];

    return allAgents.filter((agent) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          agent.name.toLowerCase().includes(query) ||
          agent.title?.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.whenToUse?.toLowerCase().includes(query) ||
          agent.squad.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Tier filter
      if (selectedTier !== 'all' && agent.tier !== selectedTier) {
        return false;
      }

      // Squad filter
      if (selectedSquadId !== 'all' && agent.squad !== selectedSquadId) {
        return false;
      }

      return true;
    });
  }, [allAgents, searchQuery, selectedTier, selectedSquadId]);

  // Group agents by tier
  const groupedAgents = useMemo(() => {
    const groups: Record<AgentTier, AgentSummary[]> = { 0: [], 1: [], 2: [] };
    filteredAgents.forEach((agent) => {
      // Ensure tier is valid (0, 1, or 2), default to 2 (Specialist) if invalid
      const tier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;
      groups[tier].push(agent);
    });
    return groups;
  }, [filteredAgents]);

  const handleAgentSelect = (agent: AgentSummary) => {
    setSelectedAgentId(agent.id);
    setSelectedAgentSquadId(agent.squad);
  };

  const handleStartChat = (agent: AgentSummary) => {
    startChat(agent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn('absolute inset-0', isAiox ? 'bg-[var(--color-background-base)]' : 'bg-[rgb(0_0_0/0.6)] backdrop-blur-sm')}
          onClick={onClose}
        />

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full h-full flex overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: isAiox
              ? '#050505'
              : `
              radial-gradient(ellipse 80% 60% at 20% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 80% 0%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
              rgba(10, 10, 15, 0.98)
            `,
          }}
        >
          {/* Left Panel - Agent List */}
          <div className="flex-1 flex flex-col border-r border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', isAiox ? 'bg-[#D1FF00]/20 text-[#D1FF00]' : 'bg-gradient-to-br from-blue-500 to-purple-500')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-lg">Agent Explorer</h1>
                    <p className="text-white/50 text-sm">
                      {filteredAgents.length} agents encontrados
                    </p>
                  </div>
                </div>
                <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
                  <CloseIcon />
                </GlassButton>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Buscar agents por nome, função ou squad..."
                  aria-label="Buscar agents por nome, função ou squad"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none',
                    isAiox
                      ? 'bg-[#111] border border-[rgba(156,156,156,0.15)] focus:border-[#D1FF00] focus:ring-1 focus:ring-[#D1FF00]'
                      : 'rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50'
                  )}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Tier Filter */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                  <button
                    onClick={() => setSelectedTier('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      selectedTier === 'all'
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white/70'
                    )}
                  >
                    Todos
                  </button>
                  {([0, 1, 2] as AgentTier[]).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                        selectedTier === tier
                          ? `${getTierTheme(tier).bg} ${getTierTheme(tier).text}`
                          : 'text-white/50 hover:text-white/70'
                      )}
                    >
                      {getTierTheme(tier).label}
                    </button>
                  ))}
                </div>

                {/* Squad Filter */}
                <select
                  value={selectedSquadId}
                  onChange={(e) => setSelectedSquadId(e.target.value)}
                  className={cn(
                    'px-3 py-1.5 text-white text-xs focus:outline-none',
                    isAiox
                      ? 'bg-[#111] border border-[rgba(156,156,156,0.15)] focus:border-[#D1FF00]'
                      : 'rounded-lg bg-white/5 border border-white/10 focus:border-blue-500/50'
                  )}
                  aria-label="Filtrar por squad"
                >
                  <option value="all">Todos os Squads</option>
                  {squads?.map((squad) => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name} ({squad.agentCount})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Agent Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAgents ? (
                <div className="flex items-center justify-center h-40">
                  <SpinnerIcon />
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/30">
                    <SearchIcon />
                  </div>
                  <p className="text-white/50 text-sm">Nenhum agent encontrado</p>
                  <p className="text-white/30 text-xs mt-1">Tente ajustar os filtros</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Orchestrators */}
                  {groupedAgents[0].length > 0 && (
                    <AgentSection
                      tier={0}
                      agents={groupedAgents[0]}
                      selectedId={selectedAgentId}
                      onSelect={handleAgentSelect}
                    />
                  )}

                  {/* Masters */}
                  {groupedAgents[1].length > 0 && (
                    <AgentSection
                      tier={1}
                      agents={groupedAgents[1]}
                      selectedId={selectedAgentId}
                      onSelect={handleAgentSelect}
                    />
                  )}

                  {/* Specialists */}
                  {groupedAgents[2].length > 0 && (
                    <AgentSection
                      tier={2}
                      agents={groupedAgents[2]}
                      selectedId={selectedAgentId}
                      onSelect={handleAgentSelect}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Agent Detail */}
          <AnimatePresence mode="wait">
            {selectedAgentId && selectedAgentSquadId ? (
              <AgentDetailPanel
                key={selectedAgentId}
                squadId={selectedAgentSquadId}
                agentId={selectedAgentId}
                isAiox={isAiox}
                onClose={() => {
                  setSelectedAgentId(null);
                  setSelectedAgentSquadId(null);
                }}
                onStartChat={handleStartChat}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-96 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className={cn('h-16 w-16 flex items-center justify-center mb-4 text-white/20', isAiox ? 'bg-[#111] border border-[rgba(156,156,156,0.15)]' : 'rounded-2xl bg-white/5')}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <p className="text-white/50 text-sm">Selecione um agent</p>
                <p className="text-white/30 text-xs mt-1">
                  Clique em um agent para ver detalhes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Agent Section Component
interface AgentSectionProps {
  tier: AgentTier;
  agents: AgentSummary[];
  selectedId: string | null;
  onSelect: (agent: AgentSummary) => void;
}

function AgentSection({ tier, agents, selectedId, onSelect }: AgentSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold',
          getTierTheme(tier).bg,
          getTierTheme(tier).text
        )}>
          {tier}
        </div>
        <h2 className={cn('text-sm font-semibold', getTierTheme(tier).text)}>
          {getTierTheme(tier).label}s
        </h2>
        <Badge variant="count" size="sm">{agents.length}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {agents.map((agent, index) => (
          <motion.div
            key={`${agent.squad}-${agent.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <AgentExplorerCard
              agent={agent}
              selected={selectedId === agent.id}
              onClick={() => onSelect(agent)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Agent Detail Panel Component
interface AgentDetailPanelProps {
  squadId: string;
  agentId: string;
  isAiox: boolean;
  onClose: () => void;
  onStartChat: (agent: AgentSummary) => void;
}

function AgentDetailPanel({ squadId, agentId, isAiox, onClose, onStartChat }: AgentDetailPanelProps) {
  const { data: agent, isLoading } = useAgent(squadId, agentId);
  const { data: commands, isLoading: loadingCommands } = useAgentCommands(squadId, agentId);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="w-96 border-l border-white/10 flex items-center justify-center"
      >
        <SpinnerIcon />
      </motion.div>
    );
  }

  if (!agent) {
    return null;
  }

  // Normalize tier to valid value (0, 1, or 2)
  const normalizedTier: AgentTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;

  const squadType = getSquadType(agent.squad);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-96 flex flex-col overflow-hidden"
      style={{
        background: isAiox
          ? '#0a0a0a'
          : `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)`,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={agent.name} agentId={agent.id} size="xl" squadType={squadType} />
            <div>
              <h2 className="text-white font-bold text-lg">{agent.name}</h2>
              <p className="text-white/50 text-sm">{agent.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                  getTierTheme(normalizedTier).badge
                )}>
                  {getTierTheme(normalizedTier).label}
                </span>
                <span className="text-[10px] text-white/30">{agent.squad}</span>
              </div>
            </div>
          </div>
          <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </GlassButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        {agent.description && (
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Descrição
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">{agent.description}</p>
          </div>
        )}

        {/* When to Use */}
        {agent.whenToUse && (
          <div
            className={isAiox ? 'p-3 border border-[rgba(156,156,156,0.15)]' : 'rounded-xl p-3'}
            style={isAiox ? {} : {
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <h3 className={cn('text-xs font-semibold mb-1.5 flex items-center gap-1.5', isAiox ? 'text-[#D1FF00]' : 'text-blue-400')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
              Quando Usar
            </h3>
            <p className="text-white/70 text-sm">{agent.whenToUse}</p>
          </div>
        )}

        {/* Persona */}
        {agent.persona && (
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Persona
            </h3>
            <div className="space-y-2">
              {agent.persona.role && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-white/30 w-16 flex-shrink-0">Role</span>
                  <span className="text-white/70 text-xs">{agent.persona.role}</span>
                </div>
              )}
              {agent.persona.style && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-white/30 w-16 flex-shrink-0">Estilo</span>
                  <span className="text-white/70 text-xs">{agent.persona.style}</span>
                </div>
              )}
              {agent.persona.focus && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-white/30 w-16 flex-shrink-0">Foco</span>
                  <span className="text-white/70 text-xs">{agent.persona.focus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core Principles */}
        {agent.corePrinciples && agent.corePrinciples.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Princípios
            </h3>
            <div className="space-y-1.5">
              {agent.corePrinciples.slice(0, 5).map((principle, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs text-white/60"
                >
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>{principle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commands */}
        <div>
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
            <CommandIcon />
            Comandos
            {commands && <Badge variant="count" size="sm">{commands.length}</Badge>}
          </h3>
          {loadingCommands ? (
            <div className="flex items-center justify-center py-4">
              <SpinnerIcon />
            </div>
          ) : commands && commands.length > 0 ? (
            <div className="space-y-2">
              {commands.map((cmd, index) => (
                <motion.div
                  key={cmd.command}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-2.5 border transition-colors',
                    isAiox
                      ? 'bg-[#111] border-[rgba(156,156,156,0.15)] hover:border-[#D1FF00]/30'
                      : 'rounded-lg bg-white/5 border-white/5 hover:border-white/10'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-purple-400">/{cmd.command}</code>
                    <span className="text-[10px] text-white/30">{cmd.action}</span>
                  </div>
                  {cmd.description && (
                    <p className="text-[11px] text-white/50">{cmd.description}</p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">Nenhum comando específico</p>
          )}
        </div>

        {/* Mind Source */}
        {agent.mindSource && (
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Fonte de Conhecimento
            </h3>
            <div
              className={isAiox ? 'p-3 border border-[rgba(156,156,156,0.15)]' : 'rounded-xl p-3'}
              style={isAiox ? {} : {
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, transparent 100%)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
              }}
            >
              <p className={cn('text-sm font-medium', isAiox ? 'text-[#D1FF00]' : 'text-purple-300')}>{agent.mindSource.name}</p>
              {agent.mindSource.frameworks && agent.mindSource.frameworks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.mindSource.frameworks.map((fw) => (
                    <span
                      key={fw}
                      className={cn('text-[10px] px-1.5 py-0.5', isAiox ? 'bg-[#D1FF00]/10 text-[#D1FF00]' : 'rounded bg-purple-500/20 text-purple-300')}
                    >
                      {fw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <GlassButton
          variant="primary"
          className="w-full"
          onClick={() => onStartChat(agent)}
          leftIcon={<ChatIcon />}
        >
          Iniciar Conversa
        </GlassButton>
      </div>
    </motion.div>
  );
}

export default AgentExplorer;
