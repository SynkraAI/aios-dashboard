/**
 * OrchestrationActivityPanel — replaces ActivityPanel content
 * when the user is on the orchestration view (bob).
 * Reads from orchestrationStore.liveTask.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, GlassCard, Avatar } from '../ui';
import { useOrchestrationStore, type OrchestrationTaskSnapshot } from '../../stores/orchestrationStore';
import { getSquadType } from '../../types';
import { Section, EmptyState } from './ActivitySection';
import { SpinnerIcon, CheckIcon, ClockIcon, RocketIcon, ChatBubbleIcon } from './activity-panel-icons';
import type { TabType, SectionKey } from './activity-panel-types';

export function OrchestrationActivityPanel() {
  const liveTask = useOrchestrationStore((s) => s.liveTask);

  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    agent: true,
    activity: true,
    commands: true,
    tools: false,
    tokens: true,
    health: true,
    stats: true,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Elapsed time
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate timer subscription syncing with external task state
    if (!liveTask?.startTime || liveTask.status === 'idle') { setElapsed(0); return; }
    if (liveTask.status === 'completed' || liveTask.status === 'failed') {
      setElapsed(Math.floor((Date.now() - liveTask.startTime) / 1000));
      return;
    }
    const update = () => setElapsed(Math.floor((Date.now() - liveTask.startTime!) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [liveTask?.startTime, liveTask?.status]);

  const isRunning = liveTask && ['analyzing', 'planning', 'executing'].includes(liveTask.status);
  const isAwaitingApproval = liveTask?.status === 'awaiting_approval';

  return (
    <aside aria-label="Painel de atividade - Orquestração" className="h-screen glass-panel border-l border-glass-border flex flex-col w-[320px]">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
        <h2 className="text-primary font-semibold">Orquestração</h2>
        {isRunning && (
          <Badge variant="status" status="warning" size="sm">
            <span className="flex items-center gap-1.5">
              <SpinnerIcon />
              Executando
            </span>
          </Badge>
        )}
        {isAwaitingApproval && (
          <Badge variant="status" status="warning" size="sm">
            <span className="flex items-center gap-1.5">Aguardando Aprovação</span>
          </Badge>
        )}
        {liveTask?.status === 'completed' && (
          <Badge variant="status" status="success" size="sm">Concluído</Badge>
        )}
        {liveTask?.status === 'failed' && (
          <Badge variant="status" status="error" size="sm">Falhou</Badge>
        )}
        {!liveTask && (
          <Badge variant="status" status="offline" size="sm">Inativo</Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-glass-border">
        <div className="flex gap-1 p-1 glass-subtle rounded-xl" role="tablist" aria-label="Abas do painel de orquestração">
          {[
            { id: 'activity', label: 'Status' },
            { id: 'history', label: 'Eventos' },
            { id: 'metrics', label: 'Métricas' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'glass text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4" tabIndex={0} role="region" aria-label="Conteúdo do painel de orquestração">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div key="orch-activity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {liveTask ? (
                <OrchStatusTab task={liveTask} elapsed={elapsed} expandedSections={expandedSections} toggleSection={toggleSection} />
              ) : (
                <EmptyState icon={<RocketIcon />} title="Nenhuma orquestração" description="Execute uma tarefa no orquestrador para ver status em tempo real" />
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="orch-history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {liveTask && liveTask.events.length > 0 ? (
                <OrchEventsTab events={liveTask.events} />
              ) : (
                <EmptyState icon={<ChatBubbleIcon />} title="Sem eventos" description="Eventos aparecerão aqui durante a execução" />
              )}
            </motion.div>
          )}

          {activeTab === 'metrics' && (
            <motion.div key="orch-metrics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {liveTask ? (
                <OrchMetricsTab task={liveTask} elapsed={elapsed} />
              ) : (
                <EmptyState icon={<ClockIcon />} title="Sem métricas" description="Métricas aparecerão após a execução de tarefas" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

// ============ STATUS TAB ============

function OrchStatusTab({
  task,
  elapsed,
  expandedSections,
  toggleSection,
}: {
  task: OrchestrationTaskSnapshot;
  elapsed: number;
  expandedSections: Record<SectionKey, boolean>;
  toggleSection: (s: SectionKey) => void;
}) {
  const statusInfo = getStatusInfo(task.status);
  const totalAgents = task.squadSelections.reduce((s, sq) => s + sq.agentCount, 0);
  const completedOutputs = task.agentOutputs.length;
  const _streamingCount = task.streamingAgents.length;

  return (
    <>
      {/* Orchestrator Card */}
      <Section title="Orquestrador" expanded={expandedSections.agent} onToggle={() => toggleSection('agent')}>
        <GlassCard variant="subtle" padding="md">
          <div className="flex items-center gap-3">
            <Avatar name="Master Orchestrator" size="lg" squadType="orchestrator" />
            <div className="flex-1 min-w-0">
              <h4 className="text-primary font-medium truncate">Master Orchestrator</h4>
              <p className="text-tertiary text-xs truncate">{task.demand.length > 50 ? task.demand.slice(0, 47) + '...' : task.demand}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="squad" squadType="orchestrator" size="sm">orchestrator</Badge>
              </div>
            </div>
          </div>
        </GlassCard>
      </Section>

      {/* Current Status */}
      <Section title="Status Atual" expanded={expandedSections.activity} onToggle={() => toggleSection('activity')}>
        <GlassCard variant="subtle" padding="md" className={`border ${statusInfo.borderClass}`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${statusInfo.bgClass}`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <p className="text-primary text-sm font-medium">{statusInfo.label}</p>
              <p className="text-tertiary text-xs">{statusInfo.description(task)}</p>
            </div>
          </div>
          {/* Progress bar */}
          {(task.status === 'analyzing' || task.status === 'planning' || task.status === 'executing') && (
            <div className="mt-3">
              <div className="h-1.5 bg-[rgb(0_0_0/0.2)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: task.status === 'analyzing' ? '20%' : task.status === 'planning' ? '40%' : totalAgents > 0 ? `${Math.min(95, 40 + (completedOutputs / totalAgents) * 60)}%` : '50%' }}
                  transition={{ duration: 0.5 }}
                  style={{ background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}
                />
              </div>
            </div>
          )}
        </GlassCard>
      </Section>

      {/* Timer */}
      {task.startTime && (
        <GlassCard variant="subtle" padding="sm">
          <div className="flex items-center gap-2 text-xs">
            <ClockIcon />
            <span className="text-secondary">Tempo decorrido:</span>
            <span className="text-primary font-mono font-semibold">{formatTime(elapsed)}</span>
          </div>
        </GlassCard>
      )}

      {/* Squads */}
      {task.squadSelections.length > 0 && (
        <Section title="Squads Ativados" badge={String(task.squadSelections.length)} expanded={expandedSections.commands} onToggle={() => toggleSection('commands')}>
          <div className="space-y-2">
            {task.squadSelections.map((squad) => {
              const squadType = getSquadType(squad.squadId);
              const completedInSquad = task.agentOutputs.filter(o => o.agent.squad === squad.squadId).length;
              const streamingInSquad = task.streamingAgents.filter(a => a.squad === squad.squadId).length;

              return (
                <GlassCard key={squad.squadId} variant="subtle" padding="sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="squad" squadType={squadType} size="sm">{squad.squadId}</Badge>
                    </div>
                    <span className="text-[10px] text-tertiary">
                      {completedInSquad}/{squad.agentCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-tertiary">
                    <span>Chief: {squad.chief}</span>
                    {streamingInSquad > 0 && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <SpinnerIcon /> {streamingInSquad} ativo(s)
                      </span>
                    )}
                  </div>
                  {/* Mini progress */}
                  <div className="mt-1.5 h-1 bg-[rgb(0_0_0/0.2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${squad.agentCount > 0 ? (completedInSquad / squad.agentCount) * 100 : 0}%`,
                        background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))',
                      }}
                    />
                  </div>
                  {/* Agent list */}
                  <div className="mt-2 space-y-1">
                    {squad.agents.map((agent) => {
                      const hasOutput = task.agentOutputs.some(o => o.agent.id === agent.id);
                      const isStreaming = task.streamingAgents.some(a => a.agentId === agent.id);
                      return (
                        <div key={agent.id} className="flex items-center gap-2 text-[10px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? 'bg-orange-400 animate-pulse' : hasOutput ? 'bg-green-400' : 'bg-white/20'}`} />
                          <span className={isStreaming ? 'text-orange-400' : hasOutput ? 'text-green-400' : 'text-tertiary'}>
                            {agent.name}
                          </span>
                          {isStreaming && <span className="text-orange-400/70 ml-auto">gerando...</span>}
                          {hasOutput && <span className="text-green-400/70 ml-auto"><CheckIcon /></span>}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </Section>
      )}

      {/* Completed Outputs */}
      {task.agentOutputs.length > 0 && (
        <Section title="Outputs Produzidos" badge={String(task.agentOutputs.length)} expanded={expandedSections.tools} onToggle={() => toggleSection('tools')}>
          <div className="space-y-2">
            {task.agentOutputs.map((output) => {
              const squadType = getSquadType(output.agent.squad);
              return (
                <GlassCard key={output.stepId} variant="subtle" padding="sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={output.agent.name} size="sm" squadType={squadType} />
                    <span className="text-xs font-medium text-primary truncate">{output.agent.name}</span>
                    <Badge variant="squad" squadType={squadType} size="sm" className="ml-auto">{output.agent.squad}</Badge>
                  </div>
                  <p className="text-[10px] text-tertiary line-clamp-2">{output.response.slice(0, 120)}{output.response.length > 120 ? '...' : ''}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-tertiary">
                    <span>{output.role}</span>
                    <span>{output.processingTimeMs > 0 ? `${(output.processingTimeMs / 1000).toFixed(1)}s` : ''}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </Section>
      )}

      {/* Error */}
      {task.error && (
        <GlassCard variant="subtle" padding="md" className="border border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-400">Erro</span>
          </div>
          <p className="text-xs text-red-300">{task.error}</p>
        </GlassCard>
      )}
    </>
  );
}

// ============ EVENTS TAB ============

function OrchEventsTab({ events }: { events: Array<{ event: string; timestamp?: string }> }) {
  const reversed = [...events].reverse();

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-tertiary mb-2">{events.length} evento(s)</p>
      {reversed.map((evt, i) => {
        const info = getEventInfo(evt.event);
        return (
          <motion.div
            key={`${evt.event}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs ${info.bg}`}
          >
            <span className={`mt-0.5 ${info.textColor}`}>{info.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-primary font-medium text-[11px]">{info.label}</span>
              {evt.timestamp && (
                <p className="text-[9px] text-tertiary">
                  {new Date(evt.timestamp).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============ METRICS TAB ============

function OrchMetricsTab({ task, elapsed }: { task: OrchestrationTaskSnapshot; elapsed: number }) {
  const totalAgents = task.squadSelections.reduce((s, sq) => s + sq.agentCount, 0);
  const completedOutputs = task.agentOutputs.length;
  const totalInputTokens = task.agentOutputs.reduce((s, o) => s + (o.llmMetadata?.inputTokens || 0), 0);
  const totalOutputTokens = task.agentOutputs.reduce((s, o) => s + (o.llmMetadata?.outputTokens || 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const totalProcessingMs = task.agentOutputs.reduce((s, o) => s + o.processingTimeMs, 0);
  const avgProcessingMs = completedOutputs > 0 ? totalProcessingMs / completedOutputs : 0;

  // Provider breakdown
  const byProvider = new Map<string, { input: number; output: number; count: number }>();
  for (const o of task.agentOutputs) {
    if (o.llmMetadata) {
      const key = o.llmMetadata.provider || 'unknown';
      const prev = byProvider.get(key) || { input: 0, output: 0, count: 0 };
      byProvider.set(key, {
        input: prev.input + (o.llmMetadata.inputTokens || 0),
        output: prev.output + (o.llmMetadata.outputTokens || 0),
        count: prev.count + 1,
      });
    }
  }

  const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="space-y-4">
      {/* Execution Stats */}
      <Section title="Execução" expanded={true}>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Squads" value={task.squadSelections.length} color="blue" />
          <MetricCard label="Agentes" value={totalAgents} color="purple" />
          <MetricCard label="Concluídos" value={completedOutputs} color="green" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <MetricCard label="Eventos" value={task.events.length} color="blue" />
          <MetricCard label="Duração" value={formatTime(elapsed)} color="orange" isText />
        </div>
      </Section>

      {/* Performance */}
      {completedOutputs > 0 && (
        <Section title="Performance" expanded={true}>
          <GlassCard variant="subtle" padding="md">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-tertiary">Tempo médio/agente</span>
                <span className="text-primary font-semibold">{(avgProcessingMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Tempo total processamento</span>
                <span className="text-primary font-semibold">{(totalProcessingMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Taxa de conclusão</span>
                <span className="text-primary font-semibold">
                  {totalAgents > 0 ? `${Math.round((completedOutputs / totalAgents) * 100)}%` : '—'}
                </span>
              </div>
            </div>
          </GlassCard>
        </Section>
      )}

      {/* Token Usage */}
      {totalTokens > 0 && (
        <Section title="Uso de Tokens" expanded={true}>
          <div
            className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs">Total de Tokens</span>
              <Badge variant="count" size="sm">{formatNum(totalTokens)}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Input</p>
                <p className="text-white font-semibold text-sm">{formatNum(totalInputTokens)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Output</p>
                <p className="text-white font-semibold text-sm">{formatNum(totalOutputTokens)}</p>
              </div>
            </div>
          </div>

          {/* Provider breakdown */}
          {byProvider.size > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Array.from(byProvider.entries()).map(([provider, data]) => (
                <div key={provider} className="rounded-xl p-2.5 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                  <p className="text-[10px] text-white/50 mb-1">{provider}</p>
                  <p className="text-white font-semibold text-sm mb-0.5">{formatNum(data.input + data.output)}</p>
                  <p className="text-[10px] text-white/40">{data.count} requests</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Response Lengths */}
      {completedOutputs > 0 && (
        <Section title="Volume de Output" expanded={true}>
          <GlassCard variant="subtle" padding="md">
            <div className="space-y-2 text-xs">
              {task.agentOutputs.map((o) => (
                <div key={o.stepId} className="flex items-center justify-between">
                  <span className="text-tertiary truncate max-w-[140px]">{o.agent.name}</span>
                  <span className="text-primary font-mono">{formatNum(o.response.length)} chars</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </Section>
      )}
    </div>
  );
}

// ============ HELPERS ============

function MetricCard({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  const colors: Record<string, { text: string; bg: string }> = {
    blue: { text: 'text-blue-400', bg: 'from-blue-500/20' },
    purple: { text: 'text-purple-400', bg: 'from-purple-500/20' },
    green: { text: 'text-green-400', bg: 'from-green-500/20' },
    red: { text: 'text-red-400', bg: 'from-red-500/20' },
    orange: { text: 'text-orange-400', bg: 'from-orange-500/20' },
  };
  const style = colors[color] || colors.blue;

  return (
    <div
      className={`rounded-xl p-2.5 bg-gradient-to-br ${style.bg} to-transparent`}
      style={{ border: '1px solid var(--glass-border-color-subtle)' }}
    >
      <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
      <p className={`${isText ? 'text-sm' : 'text-lg'} font-bold ${style.text}`}>{value}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

function getStatusInfo(status: OrchestrationTaskSnapshot['status']) {
  const map: Record<string, {
    label: string;
    borderClass: string;
    bgClass: string;
    icon: React.ReactNode;
    description: (t: OrchestrationTaskSnapshot) => string;
  }> = {
    idle: {
      label: 'Aguardando',
      borderClass: 'border-white/10',
      bgClass: 'bg-white/5 text-white/50',
      icon: <ClockIcon />,
      description: () => 'Pronto para receber uma demanda',
    },
    analyzing: {
      label: 'Analisando Demanda',
      borderClass: 'border-cyan-500/20',
      bgClass: 'bg-cyan-500/10 text-cyan-500',
      icon: <SpinnerIcon />,
      description: (t) => `Identificando squads para: "${t.demand.slice(0, 40)}..."`,
    },
    planning: {
      label: 'Planejando Execução',
      borderClass: 'border-purple-500/20',
      bgClass: 'bg-purple-500/10 text-purple-500',
      icon: <SpinnerIcon />,
      description: (t) => `${t.squadSelections.length} squad(s) sendo planejado(s)`,
    },
    executing: {
      label: 'Executando',
      borderClass: 'border-orange-500/20',
      bgClass: 'bg-orange-500/10 text-orange-500',
      icon: <SpinnerIcon />,
      description: (t) => `${t.agentOutputs.length} de ${t.squadSelections.reduce((s, sq) => s + sq.agentCount, 0)} agentes concluídos`,
    },
    completed: {
      label: 'Concluído',
      borderClass: 'border-green-500/20',
      bgClass: 'bg-green-500/10 text-green-500',
      icon: <CheckIcon />,
      description: (t) => `${t.agentOutputs.length} agente(s) executados com sucesso`,
    },
    failed: {
      label: 'Falhou',
      borderClass: 'border-red-500/20',
      bgClass: 'bg-red-500/10 text-red-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
      description: (t) => t.error || 'Erro desconhecido',
    },
  };
  return map[status] || map.idle;
}

function getEventInfo(event: string) {
  const map: Record<string, { label: string; icon: string; bg: string; textColor: string }> = {
    'task:analyzing': { label: 'Analisando demanda', icon: '🔍', bg: 'bg-cyan-500/10', textColor: 'text-cyan-400' },
    'task:squads-selected': { label: 'Squads selecionados', icon: '👥', bg: 'bg-purple-500/10', textColor: 'text-purple-400' },
    'task:planning': { label: 'Planejando execução', icon: '📋', bg: 'bg-purple-500/10', textColor: 'text-purple-400' },
    'task:squad-planned': { label: 'Squad planejado', icon: '✅', bg: 'bg-blue-500/10', textColor: 'text-blue-400' },
    'task:workflow-created': { label: 'Workflow criado', icon: '🔗', bg: 'bg-blue-500/10', textColor: 'text-blue-400' },
    'task:executing': { label: 'Iniciando execução', icon: '⚡', bg: 'bg-orange-500/10', textColor: 'text-orange-400' },
    'step:started': { label: 'Step iniciado', icon: '▶️', bg: 'bg-orange-500/10', textColor: 'text-orange-400' },
    'step:completed': { label: 'Step concluído', icon: '✅', bg: 'bg-green-500/10', textColor: 'text-green-400' },
    'step:streaming:start': { label: 'Streaming iniciado', icon: '📡', bg: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
    'step:streaming:chunk': { label: 'Chunk recebido', icon: '📦', bg: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
    'step:streaming:end': { label: 'Streaming finalizado', icon: '📡', bg: 'bg-green-500/10', textColor: 'text-green-400' },
    'task:completed': { label: 'Tarefa concluída', icon: '🎉', bg: 'bg-green-500/10', textColor: 'text-green-400' },
    'task:failed': { label: 'Tarefa falhou', icon: '❌', bg: 'bg-red-500/10', textColor: 'text-red-400' },
  };
  return map[event] || { label: event, icon: '📌', bg: 'bg-white/5', textColor: 'text-white/60' };
}
