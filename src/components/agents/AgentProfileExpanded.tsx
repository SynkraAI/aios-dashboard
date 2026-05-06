import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, Badge, GlassButton, useToast } from '../ui';
import { useFavoritesStore } from '../../hooks/useFavorites';
import { cn, getTierTheme } from '../../lib/utils';
import { getIconComponent } from '../../lib/icons';
import type { Agent, AgentCommand } from '../../types';
import { getSquadType } from '../../types';
import { getAgentAvatarUrl } from '../../lib/agent-avatars';

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Tier theme colors are now accessed via getTierTheme() from centralized theme

interface AgentProfileExpandedProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: () => void;
}

export function AgentProfileExpanded({ agent, isOpen, onClose, onStartChat }: AgentProfileExpandedProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'persona'>('overview');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { success } = useToast();

  // Normalize tier to valid value (0, 1, or 2)
  const normalizedTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;

  const favorited = isFavorite(agent.id);
  const squadType = getSquadType(agent.squad);

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(`/${command}`);
    setCopiedCommand(command);
    success('Comando copiado', `/${command}`);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleFavoriteToggle = () => {
    toggleFavorite({
      id: agent.id,
      name: agent.name,
      squad: agent.squad,
    });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen centering wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgb(0_0_0/0.6)] backdrop-blur-sm p-4"
          >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-2xl max-h-[85vh] flex flex-col"
          >
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Actions — floating over hero */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <GlassButton
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className={cn('backdrop-blur-sm', favorited && 'text-yellow-500')}
                  aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <StarIcon filled={favorited} />
                </GlassButton>
                <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar" className="backdrop-blur-sm">
                  <CloseIcon />
                </GlassButton>
              </div>

              {/* Hero Avatar Section */}
              <div className="relative flex flex-col items-center pt-8 pb-6 border-b border-white/10">
                {/* Background gradient */}
                <div
                  className={cn('absolute inset-0 opacity-20 bg-gradient-to-b', getTierTheme(normalizedTier).gradient)}
                  style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }}
                />

                {/* Avatar — large hero */}
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
                      `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
                    )}>
                      {(() => { const Icon = getIconComponent(agent.icon); return <Icon size={56} />; })()}
                    </div>
                  ) : (
                    <div className="h-36 w-36">
                      <Avatar name={agent.name} size="xl" squadType={squadType} className="!h-36 !w-36 !text-4xl !rounded-2xl" />
                    </div>
                  )}
                  {/* Tier badge */}
                  <div className={cn(
                    'absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap',
                    `bg-gradient-to-r ${getTierTheme(normalizedTier).gradient}`
                  )}>
                    {getTierTheme(normalizedTier).label}
                  </div>
                </div>

                {/* Name & title */}
                <div className="text-center mt-5 px-6 relative">
                  <h2 className="text-2xl font-bold text-primary">{agent.name}</h2>
                  <p className="text-secondary text-sm mt-1">{agent.title}</p>
                  <p className="text-tertiary text-xs mt-1">{agent.squad}</p>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-secondary text-sm mt-4 px-6 text-center leading-relaxed relative">
                    {agent.description}
                  </p>
                )}

                {/* When to use */}
                {agent.whenToUse && (
                  <div className="mt-4 mx-6 p-3 glass-subtle rounded-xl relative">
                    <p className="text-xs text-tertiary">
                      <span className="text-primary font-medium">Quando usar:</span> {agent.whenToUse}
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="px-6 py-3 border-b border-white/10">
                <div className="flex gap-1 p-1 glass-subtle rounded-xl" role="tablist" aria-label="Informacoes do agente">
                  {[
                    { id: 'overview', label: 'Visão Geral' },
                    { id: 'commands', label: `Comandos ${agent.commands?.length ? `(${agent.commands.length})` : ''}` },
                    { id: 'persona', label: 'Persona' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        activeTab === tab.id
                          ? 'glass text-primary shadow-sm'
                          : 'text-secondary hover:text-primary'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 glass-scrollbar" tabIndex={0} role="region" aria-label="Conteudo do perfil do agente">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-6"
                    >
                      {/* Core Principles */}
                      {agent.corePrinciples && agent.corePrinciples.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Princípios Fundamentais</h3>
                          <ul className="space-y-2">
                            {agent.corePrinciples.map((principle, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                                <span className="text-primary mt-0.5">•</span>
                                {principle}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Mind Source */}
                      {agent.mindSource && (
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Fonte de Conhecimento</h3>
                          <div className="glass-subtle rounded-xl p-4 space-y-3">
                            {agent.mindSource.name && (
                              <p className="text-sm text-primary font-medium">{agent.mindSource.name}</p>
                            )}
                            {agent.mindSource.credentials && agent.mindSource.credentials.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {agent.mindSource.credentials.map((cred, i) => (
                                  <Badge key={i} variant="squad" squadType={squadType} size="sm">
                                    {cred}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {agent.mindSource.frameworks && agent.mindSource.frameworks.length > 0 && (
                              <div>
                                <p className="text-xs text-tertiary mb-1">Frameworks:</p>
                                <div className="flex flex-wrap gap-1">
                                  {agent.mindSource.frameworks.map((fw, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-secondary">
                                      {fw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Integration */}
                      {agent.integration && (agent.integration.receivesFrom?.length || agent.integration.handoffTo?.length) && (
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Integração</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {agent.integration.receivesFrom && agent.integration.receivesFrom.length > 0 && (
                              <div className="glass-subtle rounded-xl p-3">
                                <p className="text-xs text-tertiary mb-2">Recebe de:</p>
                                <div className="space-y-1">
                                  {agent.integration.receivesFrom.map((src, i) => (
                                    <p key={i} className="text-xs text-secondary">{src}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {agent.integration.handoffTo && agent.integration.handoffTo.length > 0 && (
                              <div className="glass-subtle rounded-xl p-3">
                                <p className="text-xs text-tertiary mb-2">Passa para:</p>
                                <div className="space-y-1">
                                  {agent.integration.handoffTo.map((dest, i) => (
                                    <p key={i} className="text-xs text-secondary">{dest}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'commands' && (
                    <motion.div
                      key="commands"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3"
                    >
                      {agent.commands && agent.commands.length > 0 ? (
                        agent.commands.map((cmd, i) => (
                          <CommandCard
                            key={i}
                            command={cmd}
                            onCopy={() => handleCopyCommand(cmd.command)}
                            copied={copiedCommand === cmd.command}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="h-12 w-12 mx-auto rounded-full glass-subtle flex items-center justify-center mb-3">
                            <CommandIcon />
                          </div>
                          <p className="text-secondary text-sm">Nenhum comando disponível</p>
                          <p className="text-tertiary text-xs mt-1">Este agent aceita mensagens livres</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'persona' && (
                    <motion.div
                      key="persona"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-6"
                    >
                      {/* Persona Details */}
                      {agent.persona && (
                        <div className="space-y-4">
                          {agent.persona.role && (
                            <div>
                              <h4 className="text-xs text-tertiary uppercase tracking-wider mb-1">Papel</h4>
                              <p className="text-sm text-secondary">{agent.persona.role}</p>
                            </div>
                          )}
                          {agent.persona.style && (
                            <div>
                              <h4 className="text-xs text-tertiary uppercase tracking-wider mb-1">Estilo</h4>
                              <p className="text-sm text-secondary">{agent.persona.style}</p>
                            </div>
                          )}
                          {agent.persona.identity && (
                            <div>
                              <h4 className="text-xs text-tertiary uppercase tracking-wider mb-1">Identidade</h4>
                              <p className="text-sm text-secondary">{agent.persona.identity}</p>
                            </div>
                          )}
                          {agent.persona.background && (
                            <div>
                              <h4 className="text-xs text-tertiary uppercase tracking-wider mb-1">Background</h4>
                              <p className="text-sm text-secondary">{agent.persona.background}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Voice DNA */}
                      {agent.voiceDna && (
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Voice DNA</h3>
                          <div className="space-y-3">
                            {agent.voiceDna.sentenceStarters && agent.voiceDna.sentenceStarters.length > 0 && (
                              <div className="glass-subtle rounded-xl p-3">
                                <p className="text-xs text-tertiary mb-2">Frases iniciais típicas:</p>
                                <div className="flex flex-wrap gap-2">
                                  {agent.voiceDna.sentenceStarters.slice(0, 5).map((starter, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-secondary italic">
                                      "{starter}..."
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {agent.voiceDna.vocabulary?.alwaysUse && agent.voiceDna.vocabulary.alwaysUse.length > 0 && (
                              <div className="glass-subtle rounded-xl p-3">
                                <p className="text-xs text-tertiary mb-2">Vocabulário preferido:</p>
                                <div className="flex flex-wrap gap-1">
                                  {agent.voiceDna.vocabulary.alwaysUse.slice(0, 8).map((word, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                      {word}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Anti-patterns */}
                      {agent.antiPatterns?.neverDo && agent.antiPatterns.neverDo.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-primary mb-3">Anti-padrões</h3>
                          <div className="glass-subtle rounded-xl p-3">
                            <ul className="space-y-1">
                              {agent.antiPatterns.neverDo.slice(0, 5).map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-red-400">
                                  <span className="text-red-500">{'\u2715'}</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <GlassButton
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    onStartChat?.();
                    onClose();
                  }}
                  leftIcon={<ChatIcon />}
                >
                  Iniciar Conversa com {agent.name}
                </GlassButton>
              </div>
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Command Card Component
interface CommandCardProps {
  command: AgentCommand;
  onCopy: () => void;
  copied: boolean;
}

function CommandCard({ command, onCopy, copied }: CommandCardProps) {
  return (
    <div className="glass-subtle rounded-xl p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-primary font-mono text-sm">/{command.command}</span>
            <button
              onClick={onCopy}
              className={cn(
                'p-1 rounded transition-colors',
                copied ? 'text-green-500' : 'text-tertiary hover:text-primary'
              )}
              aria-label="Copiar comando"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <p className="text-xs text-tertiary mt-1">{command.action}</p>
          {command.description && (
            <p className="text-xs text-secondary mt-2">{command.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
