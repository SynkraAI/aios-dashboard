import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton, Avatar, Badge } from '../ui';
import { cn } from '../../lib/utils';
import { getIconComponent } from '../../lib/icons';
import { getSquadType } from '../../types';
import type { SquadType } from '../../types';
import { getAgentAvatarUrl } from '../../lib/agent-avatars';

// Focus trap hook for accessibility
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const FrameworkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const PrincipleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const VoiceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

interface AgentProfileAgent {
  id: string;
  name: string;
  title?: string;
  icon?: string;
  tier: number;
  squad: string;
  whenToUse?: string;
  commandCount?: number;
  commands?: Array<{ command: string; description?: string }>;
  persona?: {
    role?: string;
    style?: string;
    focus?: string;
    identity?: string;
    background?: string;
  };
  corePrinciples?: Array<string | { principle: string }>;
  mindSource?: {
    name?: string;
    credentials?: string[];
    frameworks?: string[];
  };
  voiceDna?: {
    sentenceStarters?: string[];
    vocabulary?: {
      alwaysUse?: string[];
      neverUse?: string[];
    };
  };
  antiPatterns?: {
    neverDo?: string[];
  };
  integration?: {
    receivesFrom?: string[];
    handoffTo?: string[];
  };
  quality?: {
    hasVoiceDna: boolean;
    hasAntiPatterns: boolean;
    hasIntegration: boolean;
  };
}

interface AgentProfileModalProps {
  agent: AgentProfileAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: () => void;
}

// Tier configuration
const tierConfig = {
  0: { label: 'Orchestrator', color: 'from-[#D1FF00] to-[#a8cc00]', bg: 'bg-[#D1FF00]/10 border-[#D1FF00]/30 text-[#D1FF00]' },
  1: { label: 'Master', color: 'from-[#0099FF] to-[#0077cc]', bg: 'bg-[#0099FF]/10 border-[#0099FF]/30 text-[#0099FF]' },
  2: { label: 'Specialist', color: 'from-[#ED4609] to-[#c43a07]', bg: 'bg-[#ED4609]/10 border-[#ED4609]/30 text-[#ED4609]' },
};

export function AgentProfileModal({ agent, isOpen, onClose, onStartChat }: AgentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'voice' | 'integration'>('overview');
  const focusTrapRef = useFocusTrap(isOpen);
  const modalTitleId = 'agent-profile-modal-title';

  // Handle Escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  if (!agent) return null;

  const squadType = getSquadType(agent.squad) as SquadType;
  const tier = tierConfig[agent.tier as keyof typeof tierConfig] || tierConfig[2];

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: <PrincipleIcon /> },
    { id: 'commands', label: 'Comandos', icon: <CommandIcon />, count: agent.commands?.length },
    { id: 'voice', label: 'Voz & Estilo', icon: <VoiceIcon />, disabled: !agent.quality?.hasVoiceDna && !agent.voiceDna },
    { id: 'integration', label: 'Integrações', icon: <LinkIcon />, disabled: !agent.quality?.hasIntegration && !agent.integration },
  ];

  // Portal to document.body to escape any ancestor transform/will-change
  // that would break fixed positioning (e.g. framer-motion ViewWrapper)
  return createPortal(
    <AnimatePresence>
      {isOpen && (
          <motion.div
            key="agent-profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgb(0_0_0/0.6)] backdrop-blur-sm p-4"
          >
          {/* Modal */}
          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full md:w-[700px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            }}
          >
            {/* Close button — floating over hero */}
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="absolute top-4 right-4 z-10 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <CloseIcon aria-hidden="true" />
            </button>

            {/* Hero Avatar Section */}
            <div className="relative flex flex-col items-center pt-8 pb-6 border-b border-white/10">
              {/* Background gradient accent */}
              <div
                className={cn('absolute inset-0 opacity-20 bg-gradient-to-b', tier.color)}
                style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }}
              />

              {/* Avatar — large hero size */}
              <div className="relative">
                {getAgentAvatarUrl(agent.id) ? (
                  <img
                    src={getAgentAvatarUrl(agent.id)}
                    alt={agent.name}
                    className="h-36 w-36 rounded-2xl object-cover ring-2 ring-white/20 shadow-2xl"
                    style={{ boxShadow: '0 0 40px rgba(209, 255, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)' }}
                  />
                ) : agent.icon ? (
                  <div className={cn(
                    'h-36 w-36 rounded-2xl flex items-center justify-center',
                    `bg-gradient-to-br ${tier.color}`
                  )}>
                    {(() => { const Icon = getIconComponent(agent.icon); return <Icon size={56} />; })()}
                  </div>
                ) : (
                  <div className="h-36 w-36">
                    <Avatar name={agent.name} size="xl" squadType={squadType} className="!h-36 !w-36 !text-4xl !rounded-2xl" />
                  </div>
                )}
                {/* Tier badge on avatar */}
                <span className={cn(
                  'absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 rounded-full border font-bold whitespace-nowrap',
                  tier.bg
                )}>
                  {tier.label}
                </span>
              </div>

              {/* Name & title */}
              <div className="text-center mt-5 px-6 relative">
                <h2 id={modalTitleId} className="text-2xl font-bold text-white">{agent.name}</h2>
                <p className="text-white/60 text-sm mt-1">{agent.title}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <Badge variant="squad" squadType={squadType} size="sm">
                    {agent.squad}
                  </Badge>
                  {(agent.commandCount ?? 0) > 0 && (
                    <span className="text-xs text-white/40">{agent.commandCount} comandos</span>
                  )}
                </div>
              </div>

              {/* When to use */}
              {agent.whenToUse && (
                <div className="mt-4 mx-6 p-3 rounded-xl bg-[#0099FF]/10 border border-[#0099FF]/20 relative">
                  <p className="text-sm text-[#0099FF] leading-relaxed">
                    <span className="font-semibold">Quando usar:</span> {agent.whenToUse}
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Informacoes do agente" className="flex border-b border-white/10 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => !tab.disabled && setActiveTab(tab.id as typeof activeTab)}
                  disabled={tab.disabled}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-white'
                      : tab.disabled
                        ? 'text-white/20 cursor-not-allowed'
                        : 'text-white/50 hover:text-white/80'
                  )}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10" aria-label={`${tab.count} itens`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D1FF00] to-[#a8cc00]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto p-6"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <TabOverview key="overview" agent={agent} />
                )}
                {activeTab === 'commands' && (
                  <TabCommands key="commands" agent={agent} />
                )}
                {activeTab === 'voice' && (
                  <TabVoice key="voice" agent={agent} />
                )}
                {activeTab === 'integration' && (
                  <TabIntegration key="integration" agent={agent} />
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <GlassButton variant="ghost" onClick={onClose}>
                Fechar
              </GlassButton>
              <GlassButton variant="primary" onClick={onStartChat}>
                Iniciar Conversa
              </GlassButton>
            </div>
          </motion.div>
          </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Tab: Overview
function TabOverview({ agent }: { agent: AgentProfileAgent }) {
  const hasPersonaFields = agent.persona && (
    agent.persona.role || agent.persona.style || agent.persona.focus ||
    agent.persona.identity || agent.persona.background
  );
  const hasPrinciples = agent.corePrinciples && agent.corePrinciples.length > 0;
  const hasFrameworks = agent.mindSource?.frameworks && agent.mindSource.frameworks.length > 0;
  const hasAntiPatterns = agent.antiPatterns?.neverDo && agent.antiPatterns.neverDo.length > 0;
  const hasAnyContent = hasPersonaFields || hasPrinciples || hasFrameworks || hasAntiPatterns || agent.whenToUse;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {!hasAnyContent && (
        <div className="text-center py-8">
          <PrincipleIcon />
          <p className="mt-3 text-sm text-white/40">Detalhes do perfil não disponíveis para este agente</p>
          <p className="text-xs text-white/25 mt-1">{agent.title || agent.name}</p>
        </div>
      )}

      {/* Persona */}
      {hasPersonaFields && (
        <Section title="Persona" icon={<VoiceIcon />}>
          <div className="grid grid-cols-2 gap-3">
            {agent.persona!.role && (
              <InfoCard label="Papel" value={agent.persona!.role} />
            )}
            {agent.persona!.style && (
              <InfoCard label="Estilo" value={agent.persona!.style} />
            )}
            {agent.persona!.focus && (
              <InfoCard label="Foco" value={agent.persona!.focus} />
            )}
            {agent.persona!.identity && (
              <InfoCard label="Identidade" value={agent.persona!.identity} />
            )}
          </div>
          {agent.persona!.background && (
            <p className="text-sm text-white/60 mt-3 leading-relaxed whitespace-pre-line">
              {agent.persona!.background}
            </p>
          )}
        </Section>
      )}

      {/* Core Principles */}
      {agent.corePrinciples && agent.corePrinciples.length > 0 && (
        <Section title="Princípios Core" icon={<PrincipleIcon />}>
          <ul className="space-y-2">
            {agent.corePrinciples.map((principle: string | { principle: string }, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#D1FF00] mt-1">•</span>
                <span className="text-sm text-white/70">
                  {typeof principle === 'string' ? principle : principle.principle}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Frameworks */}
      {agent.mindSource?.frameworks && agent.mindSource.frameworks.length > 0 && (
        <Section title="Frameworks & Metodologias" icon={<FrameworkIcon />}>
          <div className="flex flex-wrap gap-2">
            {agent.mindSource.frameworks.map((framework: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-[#0099FF]/10 border border-[#0099FF]/20 text-[#0099FF] text-sm"
              >
                {framework}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Anti-patterns */}
      {agent.antiPatterns?.neverDo && agent.antiPatterns.neverDo.length > 0 && (
        <Section title="Anti-Patterns (O que NÃO fazer)" icon={<WarningIcon />} variant="warning">
          <ul className="space-y-2">
            {agent.antiPatterns.neverDo.slice(0, 5).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-1">{'\u2715'}</span>
                <span className="text-sm text-white/70">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  );
}

// Tab: Commands
function TabCommands({ agent }: { agent: AgentProfileAgent }) {
  const commands = agent.commands || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {commands.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <CommandIcon />
          <p className="mt-2">Nenhum comando específico definido</p>
        </div>
      ) : (
        commands.map((cmd: { command: string; description?: string }, i: number) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-[#D1FF00] bg-[#D1FF00]/10 px-2 py-0.5 rounded">
                {cmd.command}
              </code>
            </div>
            <p className="text-sm text-white/60">{cmd.description}</p>
          </div>
        ))
      )}
    </motion.div>
  );
}

// Tab: Voice & Style
function TabVoice({ agent }: { agent: AgentProfileAgent }) {
  const voiceDna = agent.voiceDna;

  if (!voiceDna) {
    return (
      <div className="text-center py-8 text-white/40">
        <VoiceIcon />
        <p className="mt-2">Voice DNA não definido para este agente</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Sentence starters */}
      {voiceDna.sentenceStarters && (
        <Section title="Frases de Abertura" icon={<VoiceIcon />}>
          <div className="space-y-2">
            {voiceDna.sentenceStarters.slice(0, 6).map((starter: string, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-white/5 border border-[#0099FF]/30">
                <p className="text-sm text-white/70 italic">"{starter}..."</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Vocabulary */}
      {voiceDna.vocabulary && (
        <div className="grid grid-cols-2 gap-4">
          {voiceDna.vocabulary.alwaysUse && (
            <Section title="Sempre Usar" icon={<PrincipleIcon />} compact>
              <div className="flex flex-wrap gap-1.5">
                {voiceDna.vocabulary.alwaysUse.slice(0, 10).map((word: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-[#D1FF00]/10 text-[#D1FF00] text-xs">
                    {word}
                  </span>
                ))}
              </div>
            </Section>
          )}
          {voiceDna.vocabulary.neverUse && (
            <Section title="Nunca Usar" icon={<WarningIcon />} compact variant="warning">
              <div className="flex flex-wrap gap-1.5">
                {voiceDna.vocabulary.neverUse.slice(0, 10).map((word: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs line-through">
                    {word}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Tab: Integration
function TabIntegration({ agent }: { agent: AgentProfileAgent }) {
  const integration = agent.integration;

  if (!integration) {
    return (
      <div className="text-center py-8 text-white/40">
        <LinkIcon />
        <p className="mt-2">Integrações não definidas para este agente</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Receives from */}
      {integration.receivesFrom && integration.receivesFrom.length > 0 && (
        <Section title="Recebe de" icon={<LinkIcon />}>
          <div className="flex flex-wrap gap-2">
            {integration.receivesFrom.map((agentName: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-[#0099FF]/10 border border-[#0099FF]/20 text-[#0099FF] text-sm">
                {'\u2190'} {agentName}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Hands off to */}
      {integration.handoffTo && integration.handoffTo.length > 0 && (
        <Section title="Entrega para" icon={<LinkIcon />}>
          <div className="flex flex-wrap gap-2">
            {integration.handoffTo.map((agentName: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-[#D1FF00]/10 border border-[#D1FF00]/20 text-[#D1FF00] text-sm">
                {agentName} {'\u2192'}
              </span>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

// Helper components
function Section({ title, icon, children, variant, compact }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'warning';
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      variant === 'warning'
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-white/5 border-white/10',
      compact && 'p-3'
    )}>
      <div className={cn(
        'flex items-center gap-2 mb-3',
        variant === 'warning' ? 'text-red-400' : 'text-white/60'
      )}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/5">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  );
}

export default AgentProfileModal;
