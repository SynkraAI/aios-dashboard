import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { searchAgents } from '../../services/api/agents';
import { useSquads } from '../../hooks/useSquads';
import { useChat } from '../../hooks/useChat';
import { useSearchStore } from '../../stores/searchStore';
import { useUIStore } from '../../stores/uiStore';
import { cn, getSquadTheme, getTierTheme } from '../../lib/utils';
import { getIconComponent } from '../../lib/icons';
import { getSquadType } from '../../types';
import { playSound } from '../../hooks/useSound';
import type { AgentSummary, SquadType } from '../../types';

// Quick-access views and commands
interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: 'view' | 'command';
  action: () => void;
}


// Icons
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const CommandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Get border color for squad from centralized theme
const getSquadBorderColor = (squadType: string): string => {
  const theme = getSquadTheme(squadType as SquadType);
  return theme.borderLeft;
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { selectAgent } = useChat();
  const { data: squads } = useSquads();
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const toggleAgentExplorer = useUIStore((s) => s.toggleAgentExplorer);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  // Build quick actions list
  const quickActions: QuickAction[] = useMemo(() => {
    const views: QuickAction[] = [
      { id: 'v-chat', label: 'Chat', description: 'Conversar com agents', icon: 'MessageCircle', type: 'view', action: () => { setCurrentView('chat'); onClose(); } },
      { id: 'v-dashboard', label: 'Dashboard', description: 'Analytics, métricas, cockpit AIOX e insights', icon: 'BarChart3', type: 'view', action: () => { setCurrentView('dashboard'); onClose(); } },
      { id: 'v-stories', label: 'Stories', description: 'Board e lista de stories', icon: 'BookOpen', type: 'view', action: () => { setCurrentView('stories'); onClose(); } },
      { id: 'v-world', label: 'World', description: 'Mapa de squads', icon: 'Globe', type: 'view', action: () => { setCurrentView('world'); onClose(); } },
      { id: 'v-agents', label: 'Agents', description: 'Gerenciar agentes', icon: 'Bot', type: 'view', action: () => { setCurrentView('agents'); onClose(); } },
      { id: 'v-monitor', label: 'Monitor', description: 'Monitoramento em tempo real', icon: 'Activity', type: 'view', action: () => { setCurrentView('monitor'); onClose(); } },
      { id: 'v-knowledge', label: 'Knowledge', description: 'Base de conhecimento', icon: 'BookOpen', type: 'view', action: () => { setCurrentView('knowledge'); onClose(); } },
      { id: 'v-settings', label: 'Settings', description: 'Configurações', icon: 'Settings', type: 'view', action: () => { setCurrentView('settings'); onClose(); } },
      { id: 'v-terminals', label: 'Terminals', description: 'Terminais de execução', icon: 'Terminal', type: 'view', action: () => { setCurrentView('terminals'); onClose(); } },
      { id: 'v-squads', label: 'Squads', description: 'Gerenciar squads', icon: 'Users', type: 'view', action: () => { setCurrentView('squads'); onClose(); } },
    ];
    const commands: QuickAction[] = [
      { id: 'c-explorer', label: 'Agent Explorer', description: 'Abrir explorador de agents', icon: 'Compass', type: 'command', action: () => { toggleAgentExplorer(); onClose(); } },
      { id: 'c-theme', label: 'Alternar Tema', description: 'Trocar tema do dashboard', icon: 'Sun', type: 'command', action: () => { toggleTheme(); onClose(); } },
    ];
    return [...views, ...commands];
  }, [setCurrentView, toggleAgentExplorer, toggleTheme, onClose]);

  // Filter quick actions by query
  const filteredActions = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return quickActions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [query, quickActions]);

  // Search agents
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search-agents', query],
    queryFn: () => searchAgents({ query, limit: 20 }),
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  const results: AgentSummary[] = useMemo(() => searchResults || [], [searchResults]);

  // Group results by squad
  interface GroupedSquad {
    squadId: string;
    squadName: string;
    agents: AgentSummary[];
  }

  const groupedResults = results.reduce<Record<string, GroupedSquad>>((acc, agent) => {
    const squadId = agent.squad;
    if (!acc[squadId]) {
      acc[squadId] = {
        squadId,
        squadName: squads?.find(s => s.id === squadId)?.name || squadId,
        agents: [],
      };
    }
    acc[squadId].agents.push(agent);
    return acc;
  }, {});

  const groupedList: GroupedSquad[] = Object.values(groupedResults);

  // Flatten for keyboard navigation: actions first, then agents
  type FlatItem = { kind: 'action'; data: QuickAction } | { kind: 'agent'; data: AgentSummary };
  const flatItems: FlatItem[] = useMemo(() => [
    ...filteredActions.map((a): FlatItem => ({ kind: 'action', data: a })),
    ...results.map((a): FlatItem => ({ kind: 'agent', data: a })),
  ], [filteredActions, results]);
  // Keep old flatResults for agent-only backward compat
  const _flatResults = results;

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      queueMicrotask(() => {
        setQuery('');
        setSelectedIndex(0);
      });
    }
  }, [isOpen]);

  const handleSelectAgent = useCallback((agent: AgentSummary) => {
    selectAgent(agent);
    onClose();
  }, [selectAgent, onClose]);

  // Keyboard navigation — use a regular function to avoid compiler memoization issues
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          const item = flatItems[selectedIndex];
          if (item.kind === 'action') {
            playSound('navigate');
            item.data.action();
          } else {
            handleSelectAgent(item.data);
          }
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const selected = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

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

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[15%] left-0 right-0 mx-auto z-50 w-full max-w-2xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card overflow-hidden shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <SearchIcon />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar agents por nome, skill ou squad..."
                  className="flex-1 bg-transparent text-primary placeholder:text-tertiary outline-none text-sm"
                  aria-label="Busca global"
                />
                <div className="flex items-center gap-1 text-[10px] text-tertiary">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">esc</kbd>
                  <span>para fechar</span>
                </div>
              </div>

              {/* Results */}
              <div
                ref={resultsRef}
                className="max-h-[400px] overflow-y-auto scrollbar-thin"
                tabIndex={0}
                role="region"
                aria-label="Resultados da busca"
              >
                {query.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-tertiary space-y-4">
                    <p>Buscar agents, views ou comandos</p>
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      {['Chat', 'Dashboard', 'Stories', 'Monitor'].map((hint) => (
                        <button
                          key={hint}
                          onClick={() => setQuery(hint)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-secondary transition-colors"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-tertiary/60">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">
                          <CommandIcon />
                        </kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">K</kbd>
                      </span>
                    </div>
                  </div>
                ) : query.length < 2 && filteredActions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <p>Continue digitando para buscar...</p>
                  </div>
                ) : (filteredActions.length === 0 && results.length === 0 && !isLoading && query.length >= 2) ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <p>Nenhum resultado para "{query}"</p>
                    <p className="text-xs mt-1">Tente outro termo</p>
                  </div>
                ) : isLoading && filteredActions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <p className="mt-2">Buscando...</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Quick Actions (views + commands) */}
                    {filteredActions.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-1.5 text-[10px] text-tertiary uppercase tracking-wider sticky top-0 bg-inherit backdrop-blur-sm">
                          Ações rápidas
                          <span className="ml-1 opacity-60">({filteredActions.length})</span>
                        </div>
                        <div className="px-2">
                          {filteredActions.map((action) => {
                            const globalIndex = flatItems.findIndex(i => i.kind === 'action' && i.data.id === action.id);
                            const isSelected = globalIndex === selectedIndex;
                            const ActionIcon = getIconComponent(action.icon);
                            return (
                              <motion.button
                                key={action.id}
                                data-index={globalIndex}
                                onClick={() => { playSound('navigate'); action.action(); }}
                                className={cn(
                                  'w-full px-3 py-2 rounded-lg text-left transition-all duration-150',
                                  'flex items-center gap-3 border-l-2',
                                  action.type === 'command' ? 'border-l-amber-500/50' : 'border-l-blue-500/50',
                                  isSelected ? 'bg-white/15' : 'hover:bg-white/5'
                                )}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
                                  <ActionIcon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-primary">{action.label}</span>
                                  <p className="text-xs text-tertiary truncate">{action.description}</p>
                                </div>
                                <span className="text-[9px] text-tertiary uppercase px-1.5 py-0.5 rounded bg-white/5">
                                  {action.type === 'command' ? 'cmd' : 'view'}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Agent Results */}
                    {groupedList.map((group) => (
                      <div key={group.squadId} className="mb-2">
                        {/* Squad header */}
                        <div className="px-4 py-1.5 text-[10px] text-tertiary uppercase tracking-wider sticky top-0 bg-inherit backdrop-blur-sm">
                          {group.squadName}
                          <span className="ml-1 opacity-60">({group.agents.length})</span>
                        </div>

                        {/* Agents */}
                        <div className="px-2">
                          {group.agents.map((agent) => {
                            const globalIndex = flatItems.findIndex(i => i.kind === 'agent' && i.data.id === agent.id);
                            const isSelected = globalIndex === selectedIndex;
                            const squadType = getSquadType(agent.squad);

                            return (
                              <motion.button
                                key={agent.id}
                                data-index={globalIndex}
                                onClick={() => handleSelectAgent(agent)}
                                className={cn(
                                  'w-full px-3 py-2 rounded-lg text-left transition-all duration-150',
                                  'flex items-center gap-3 border-l-2',
                                  getSquadBorderColor(squadType),
                                  isSelected
                                    ? 'bg-white/15'
                                    : 'hover:bg-white/5'
                                )}
                                whileTap={{ scale: 0.98 }}
                              >
                                {/* Avatar */}
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm',
                                  'bg-white/10'
                                )}>
                                  {(() => { const Icon = getIconComponent(agent.icon || 'User'); return <Icon size={16} />; })()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-primary truncate">
                                      {agent.name}
                                    </span>
                                    <span className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded-full bg-white/10',
                                      getTierTheme(agent.tier).text
                                    )}>
                                      {getTierTheme(agent.tier).label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-tertiary truncate">
                                    {agent.title || agent.description || 'Agent especializado'}
                                  </p>
                                </div>

                                {/* Arrow */}
                                <div className={cn(
                                  'text-tertiary transition-transform duration-150',
                                  isSelected && 'text-primary translate-x-1'
                                )}>
                                  <ArrowRightIcon />
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Results count */}
                    <div className="px-4 py-2 text-[10px] text-tertiary border-t border-white/5 mt-2">
                      {flatItems.length} resultado{flatItems.length !== 1 ? 's' : ''}
                      {filteredActions.length > 0 && results.length > 0 && (
                        <span className="ml-1 opacity-60">
                          ({filteredActions.length} ações, {results.length} agents)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with keyboard hints */}
              {flatItems.length > 0 && (
                <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-[10px] text-tertiary">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">↑</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">↓</kbd>
                    <span>navegar</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">↵</kbd>
                    <span>selecionar</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">esc</kbd>
                    <span>fechar</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for global keyboard shortcut - uses shared Zustand store
export function useGlobalSearch() {
  const { isOpen, open, close, toggle } = useSearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
