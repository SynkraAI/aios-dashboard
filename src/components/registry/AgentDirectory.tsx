/**
 * AgentDirectory — Full agent browser / directory powered by the AIOS registry.
 *
 * Shows all agents in a searchable grid with a slide-in detail panel.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  ChevronRight,
  ArrowLeft,
  Terminal,
  Shield,
  GitBranch,
  Layers,
  FileText,
  CheckSquare,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAgentColor } from '../../lib/agent-colors';
import { useUIStore } from '../../stores/uiStore';
import { aiosRegistry } from '../../data/aios-registry.generated';
import type { AgentDefinition } from '../../data/registry-types';

// ---------------------------------------------------------------------------
// Card animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: [0, 0, 0.2, 1],
    },
  }),
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  icon: Icon,
  items,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'hover:bg-white/[0.04] transition-colors'
        )}
      >
        <Icon className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
        <span className="text-xs font-medium text-white/70 flex-1">{title}</span>
        <span className="text-[10px] text-white/40 tabular-nums">{items.length}</span>
        <ChevronRight
          className={cn(
            'w-3 h-3 text-white/30 transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 space-y-1">
              {items.map((item) => (
                <div
                  key={item}
                  className="text-[11px] text-white/50 font-mono truncate pl-5"
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentCard
// ---------------------------------------------------------------------------

function AgentCard({
  agent,
  index,
  onSelect,
}: {
  agent: AgentDefinition;
  index: number;
  onSelect: (agent: AgentDefinition) => void;
}) {
  const color = getAgentColor(agent.id);

  return (
    <motion.button
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={() => onSelect(agent)}
      className={cn(
        'group w-full text-left p-4 rounded-xl transition-all duration-200',
        'border border-white/10 bg-white/[0.03] backdrop-blur-sm',
        'hover:bg-white/[0.06] hover:border-white/20',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
      )}
    >
      {/* Header: icon + name + id */}
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
          }}
        >
          {agent.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90 truncate">
              {agent.name}
            </span>
            <span
              className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: `${color}15`,
                color,
              }}
            >
              @{agent.id}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-0.5 truncate">{agent.title}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0 mt-1" />
      </div>

      {/* Role (truncated) */}
      <p className="text-[11px] text-white/40 mt-2 line-clamp-2 leading-relaxed">
        {agent.role}
      </p>

      {/* Footer: command count + archetype + zodiac */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-white/30" />
          <span className="text-[10px] text-white/40 font-medium">
            {agent.commands.length} cmd{agent.commands.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-[10px] text-white/30 truncate">
          {agent.archetype} &middot; {agent.zodiac}
        </div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// AgentDetailPanel
// ---------------------------------------------------------------------------

function AgentDetailPanel({
  agent,
  onClose,
  onNavigate,
}: {
  agent: AgentDefinition;
  onClose: () => void;
  onNavigate: (agentId: string) => void;
}) {
  const color = getAgentColor(agent.id);

  const agentById = useMemo(() => {
    const map = new Map<string, AgentDefinition>();
    for (const a of aiosRegistry.agents) {
      map.set(a.id, a);
    }
    return map;
  }, []);

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'absolute inset-y-0 right-0 z-10 flex flex-col overflow-hidden',
        'w-full sm:w-[420px] lg:w-[460px]',
        'border-l border-white/10 bg-[rgb(0_0_0/0.8)] backdrop-blur-xl'
      )}
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button
          onClick={onClose}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'border border-white/10 bg-white/[0.04]',
            'hover:bg-white/[0.08] transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
          )}
          aria-label="Close detail panel"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{agent.icon}</span>
            <span className="text-base font-semibold text-white/90 truncate">
              {agent.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{ background: `${color}15`, color }}
            >
              @{agent.id}
            </span>
          </div>
          <p className="text-xs text-white/50 truncate mt-0.5">{agent.title}</p>
        </div>

        <button
          onClick={onClose}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center sm:hidden',
            'hover:bg-white/[0.08] transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
          )}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03]">
            {agent.archetype}
          </span>
          <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03]">
            {agent.zodiac}
          </span>
          <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] italic">
            {agent.tone}
          </span>
        </div>

        {/* When to use */}
        {agent.whenToUse && (
          <section>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              When to use
            </h3>
            <p className="text-[12px] text-white/50 leading-relaxed">
              {agent.whenToUse}
            </p>
          </section>
        )}

        {/* Commands */}
        {agent.commands.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Commands
              <span className="text-[10px] text-white/30 font-normal ml-1">
                ({agent.commands.length})
              </span>
            </h3>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {agent.commands.map((cmd) => (
                <div
                  key={cmd.name}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 rounded-lg',
                    'border border-white/5 bg-white/[0.02]',
                    'hover:bg-white/[0.04] transition-colors'
                  )}
                >
                  <code
                    className="text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5"
                    style={{ color }}
                  >
                    *{cmd.name}
                  </code>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      {cmd.description}
                    </p>
                    {cmd.args && (
                      <code className="text-[10px] text-white/30 font-mono mt-0.5 block">
                        {cmd.args}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tools */}
        {agent.tools.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Tools
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {agent.tools.map((tool) => (
                <span
                  key={tool}
                  className="text-[10px] text-white/50 font-mono px-2 py-1 rounded border border-white/10 bg-white/[0.03]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Exclusive ops */}
        {agent.exclusiveOps.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Exclusive Operations
            </h3>
            <div className="space-y-1">
              {agent.exclusiveOps.map((op) => (
                <div
                  key={op}
                  className="text-[11px] text-white/50 px-3 py-1.5 rounded border border-white/10 bg-white/[0.02] font-mono"
                >
                  {op}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Delegates to / Receives from */}
        {(agent.delegatesTo.length > 0 || agent.receivesFrom.length > 0) && (
          <section>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Relationships
            </h3>
            <div className="space-y-3">
              {agent.delegatesTo.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">
                    Delegates to
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.delegatesTo.map((id) => {
                      const linked = agentById.get(id);
                      const linkedColor = getAgentColor(id);
                      return (
                        <button
                          key={id}
                          onClick={() => onNavigate(id)}
                          className={cn(
                            'text-[10px] font-medium px-2 py-1 rounded-md',
                            'border border-white/10 bg-white/[0.03]',
                            'hover:bg-white/[0.08] transition-colors',
                            'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
                          )}
                          style={{ color: linkedColor }}
                        >
                          {linked ? `${linked.icon} @${id}` : `@${id}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {agent.receivesFrom.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">
                    Receives from
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.receivesFrom.map((id) => {
                      const linked = agentById.get(id);
                      const linkedColor = getAgentColor(id);
                      return (
                        <button
                          key={id}
                          onClick={() => onNavigate(id)}
                          className={cn(
                            'text-[10px] font-medium px-2 py-1 rounded-md',
                            'border border-white/10 bg-white/[0.03]',
                            'hover:bg-white/[0.08] transition-colors',
                            'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
                          )}
                          style={{ color: linkedColor }}
                        >
                          {linked ? `${linked.icon} @${id}` : `@${id}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Dependencies (collapsible) */}
        <div className="space-y-2">
          <CollapsibleSection
            title="Tasks"
            icon={FileText}
            items={agent.dependencyTasks}
          />
          <CollapsibleSection
            title="Templates"
            icon={Layers}
            items={agent.dependencyTemplates}
          />
          <CollapsibleSection
            title="Checklists"
            icon={CheckSquare}
            items={agent.dependencyChecklists}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AgentDirectory() {
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const { registryTargetAgentId, clearRegistryTarget } = useUIStore();

  // Auto-select agent when navigated from another component
  useEffect(() => {
    if (registryTargetAgentId) {
      const target = aiosRegistry.agents.find((a) => a.id === registryTargetAgentId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing selection from navigation store
      if (target) setSelectedAgent(target);
      clearRegistryTarget();
    }
  }, [registryTargetAgentId, clearRegistryTarget]);

  // Filter agents by search query
  const filtered = useMemo(() => {
    if (!search) return aiosRegistry.agents;
    const q = search.toLowerCase();
    return aiosRegistry.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = useCallback((agent: AgentDefinition) => {
    setSelectedAgent(agent);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const handleNavigate = useCallback(
    (agentId: string) => {
      const target = aiosRegistry.agents.find((a) => a.id === agentId);
      if (target) {
        setSelectedAgent(target);
      }
    },
    []
  );

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* ---- Header ---- */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-white/60" />
            <h1 className="text-lg font-semibold text-white/90">Agent Directory</h1>
          </div>
          <span className="text-xs text-white/40 px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] tabular-nums">
            {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg',
            'border border-white/10 bg-white/[0.03]',
            'focus-within:border-white/20 transition-colors'
          )}
        >
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name, id, title, or role..."
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
            aria-label="Search agents"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ---- Agent Grid ---- */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-sm text-white/40">No agents found</p>
            <p className="text-xs text-white/25 mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={i}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Detail Panel (slide-in) ---- */}
      <AnimatePresence>
        {selectedAgent && (
          <>
            {/* Backdrop (mobile: full overlay, desktop: semi-transparent) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-[5] bg-[rgb(0_0_0/0.4)] sm:bg-[rgb(0_0_0/0.2)] backdrop-blur-sm sm:backdrop-blur-none"
              onClick={handleClose}
              aria-hidden="true"
            />
            <AgentDetailPanel
              agent={selectedAgent}
              onClose={handleClose}
              onNavigate={handleNavigate}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
