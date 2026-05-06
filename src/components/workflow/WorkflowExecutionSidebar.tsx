import { motion } from 'framer-motion';
import { Badge, Avatar } from '../ui';
import type { LiveExecutionState } from '../../hooks/useWorkflows';
import type { SquadType } from '../../types';
import { cn } from '../../lib/utils';
import {
  CheckIcon, XIcon, SpinnerIcon, ClockIcon,
  RocketIcon, ActivityIcon,
} from './workflow-execution-icons';
import { formatDuration } from './workflow-execution-helpers';
import { STEP_TYPE_LABELS, STEP_TYPE_TO_SQUAD, getSquadStyle } from './workflow-execution-constants';
import type { StepOutput, OrchestrationPlan } from './workflow-execution-types';

interface WorkflowExecutionSidebarProps {
  state: LiveExecutionState;
  orchestrationPlan?: OrchestrationPlan;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  completedSteps: number;
  runningSteps: number;
  pendingSteps: number;
  totalSteps: number;
  progress: number;
}

export function WorkflowExecutionSidebar({
  state,
  orchestrationPlan,
  selectedNodeId,
  setSelectedNodeId,
  completedSteps,
  runningSteps,
  pendingSteps,
  totalSteps,
  progress,
}: WorkflowExecutionSidebarProps) {
  return (
    <div
      className="w-80 border-r border-white/10 flex flex-col overflow-hidden backdrop-blur-xl"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 0% 100%, rgba(209, 255, 0, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 100% 0%, rgba(209, 255, 0, 0.04) 0%, transparent 50%),
          var(--glass-background-panel, rgba(15,15,17,0.92))
        `
      }}
    >
      {/* Execution Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}>
            <RocketIcon />
          </div>
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Execução Ativa
          </h2>
          <Badge variant="count" size="sm" className="ml-auto">
            #{state.executionId?.slice(-6) || '...'}
          </Badge>
        </div>

        {/* Orchestration Plan (if available) */}
        {orchestrationPlan && (orchestrationPlan.phase === 'analyzing' || orchestrationPlan.phase === 'planning') && (
          <div
            className="relative rounded-xl p-3 mb-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.08) 0%, rgba(209, 255, 0, 0.04) 100%)',
              border: '1px solid rgba(209, 255, 0, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <SpinnerIcon size={14} />
              <span className="text-xs font-semibold" style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 65%, transparent)' }}>
                {orchestrationPlan.phase === 'analyzing' ? 'Analisando demanda...' : 'Criando plano de execução...'}
              </span>
            </div>
            <p className="text-[10px] text-white/50">
              O orquestrador está selecionando os melhores squads e agentes para sua demanda.
            </p>
          </div>
        )}

        {/* Orchestration Analysis */}
        {orchestrationPlan?.analysis && (
          <div
            className="relative rounded-xl p-3 mb-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, transparent 100%)',
              border: '1px solid rgba(209, 255, 0, 0.12)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 65%, transparent)' }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 65%, transparent)' }}>Análise do Orquestrador</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{orchestrationPlan.analysis}</p>
            {orchestrationPlan.expectedOutputs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-[10px] text-white/60 mb-1">Outputs esperados:</p>
                <div className="flex flex-wrap gap-1">
                  {orchestrationPlan.expectedOutputs.map((output, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(209,255,0,0.08)]" style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 65%, transparent)' }}>
                      {output}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Card */}
        <div
          className="relative rounded-xl p-3 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, rgba(209, 255, 0, 0.04) 100%)',
            border: '1px solid rgba(209, 255, 0, 0.12)'
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Progresso geral</span>
              <span className="text-white font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[rgb(0_0_0/0.3)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                style={{ background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))', boxShadow: '0 0 10px rgba(209, 255, 0, 0.3)' }}
              />
            </div>
            <p className="text-[10px] text-white/60">
              {completedSteps} de {totalSteps} steps concluídos
              {state.startedAt && ` · ${formatDuration(state.startedAt, state.completedAt || undefined)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Steps Log */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 80%, #000))' }}>
            <ActivityIcon />
          </div>
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Log de Steps
          </h2>
          <Badge variant="count" size="sm" className="ml-auto">
            {totalSteps}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto glass-scrollbar px-4 pb-4" tabIndex={0} role="region" aria-label="Passos do workflow">
          {state.steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/60 py-8">
              <SpinnerIcon size={24} />
              <p className="mt-3 text-sm">Aguardando steps...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {state.steps.map((step, index) => {
                const output = step.output as StepOutput | undefined;
                const agent = output?.agent;
                const squadType = agent?.squad || STEP_TYPE_TO_SQUAD[step.type] || 'orchestrator';
                const style = getSquadStyle(squadType);
                const isSelected = selectedNodeId === step.id;

                return (
                  <motion.button
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedNodeId(step.id)}
                    className={cn(
                      'w-full rounded-xl p-3 border transition-all text-left hover:translate-x-1',
                      style.border,
                      `bg-gradient-to-r ${style.bg} to-transparent`,
                      isSelected && 'ring-1 ring-white/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={agent?.name || `Step ${index + 1}`}
                          size="sm"
                          squadType={squadType as SquadType}
                        />
                        <span className="text-white text-xs font-medium">
                          {agent?.name || `Step ${index + 1}`}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border',
                          step.status === 'running' && 'bg-[rgba(209,255,0,0.12)] border-[rgba(209,255,0,0.2)]',
                          step.status === 'completed' && 'bg-[rgba(209,255,0,0.08)] border-[rgba(209,255,0,0.15)]',
                          step.status === 'failed' && 'bg-red-500/20 text-red-400 border-red-500/30',
                          step.status === 'pending' && 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        )}
                        style={
                          step.status === 'running' ? { color: 'var(--color-accent, #D1FF00)' } :
                          step.status === 'completed' ? { color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' } :
                          undefined
                        }
                      >
                        {step.status === 'running' && <SpinnerIcon size={10} />}
                        {step.status === 'completed' && <CheckIcon size={10} />}
                        {step.status === 'pending' && <ClockIcon size={10} />}
                        {step.status === 'failed' && <XIcon />}
                        <span>
                          {step.status === 'running' ? 'Executando' :
                           step.status === 'completed' ? 'Concluído' :
                           step.status === 'failed' ? 'Erro' : 'Pendente'}
                        </span>
                      </span>
                    </div>

                    <p className="text-white/60 text-xs mb-1.5 line-clamp-2">
                      {output?.role || STEP_TYPE_LABELS[step.type] || step.type}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>{agent?.squad || squadType}</span>
                      {step.startedAt && <span>{formatDuration(step.startedAt, step.completedAt)}</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Concluídos" value={completedSteps} color="green" />
          <StatBox label="Em execução" value={runningSteps} color="orange" />
          <StatBox label="Pendentes" value={pendingSteps} color="gray" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatBox({ label, value, color }: { label: string; value: number; color: 'green' | 'orange' | 'gray' }) {
  const colors = {
    green: {
      text: 'text-status-success-muted',
      bg: 'from-status-success-20',
      glowVar: 'var(--color-status-success)',
    },
    orange: {
      text: 'text-squad-copywriting-muted',
      bg: 'from-squad-copywriting-20',
      glowVar: 'var(--squad-copywriting-default)',
    },
    gray: {
      text: 'text-squad-default-muted',
      bg: 'from-squad-default-20',
      glowVar: 'var(--squad-default-default)',
    },
  };

  const style = colors[color];

  return (
    <div
      className={cn('rounded-xl p-2.5 bg-gradient-to-b to-transparent border border-white/5', style.bg)}
      style={{
        boxShadow: value > 0 ? `0 0 15px color-mix(in srgb, ${style.glowVar} 30%, transparent)` : 'none'
      }}
    >
      <p className={cn('text-xl font-bold', style.text)}>{value}</p>
      <p className="text-[10px] text-white/60">{label}</p>
    </div>
  );
}
