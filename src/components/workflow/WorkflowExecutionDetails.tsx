import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton, Badge, Avatar } from '../ui';
import type { LiveExecutionState, LiveExecutionStep } from '../../hooks/useWorkflows';
import type { SquadType } from '../../types';
import { cn } from '../../lib/utils';
import {
  CheckIcon, XIcon, CloseIcon, SpinnerIcon, ClockIcon,
  RocketIcon, TargetIcon, CopyIcon, MessageIcon,
  CodeIcon, FileTextIcon, CpuIcon, ActivityIcon,
} from './workflow-execution-icons';
import { formatDuration } from './workflow-execution-helpers';
import { STEP_TYPE_LABELS, getSquadStyle } from './workflow-execution-constants';
import type { StepOutput } from './workflow-execution-types';

interface WorkflowExecutionDetailsProps {
  state: LiveExecutionState;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedStep: LiveExecutionStep | null;
  copiedText: string | null;
  handleCopy: (text: string) => void;
}

export function WorkflowExecutionDetails({
  state,
  selectedNodeId,
  setSelectedNodeId,
  selectedStep,
  copiedText,
  handleCopy,
}: WorkflowExecutionDetailsProps) {
  const isStartNode = selectedNodeId === 'start';
  const isEndNode = selectedNodeId === 'end';

  const completedSteps = state.steps.filter((s) => s.status === 'completed').length;
  const runningSteps = state.steps.filter((s) => s.status === 'running').length;
  const pendingSteps = state.steps.filter((s) => s.status === 'pending').length;
  const totalSteps = state.steps.length;

  return (
    <AnimatePresence>
      {(selectedStep || isStartNode || isEndNode) && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-white/10 flex flex-col overflow-hidden backdrop-blur-xl"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 100% 100%, rgba(209, 255, 0, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 0% 0%, rgba(209, 255, 0, 0.05) 0%, transparent 50%),
              var(--glass-background-panel, rgba(15,15,17,0.92))
            `
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-6 w-6 rounded-lg flex items-center justify-center',
                  isEndNode && state.status !== 'completed' && 'bg-gradient-to-br from-gray-500 to-slate-500'
                )}
                style={{
                  background: isStartNode
                    ? 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))'
                    : isEndNode && state.status === 'completed'
                      ? 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 50%, #000))'
                      : !isStartNode && !isEndNode
                        ? 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))'
                        : undefined
                }}
              >
                {isStartNode ? <RocketIcon /> : isEndNode ? <TargetIcon /> : <TargetIcon />}
              </div>
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                {isStartNode ? 'Início do Workflow' : isEndNode ? 'Resultado Final' : 'Detalhes do Step'}
              </h2>
            </div>
            <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNodeId(null)} aria-label="Fechar detalhes">
              <CloseIcon />
            </GlassButton>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4">

            {/* ========== START NODE ========== */}
            {isStartNode && (
              <>
                {/* Workflow Info */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-[rgba(209,255,0,0.08)]">
                    <RocketIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 font-semibold">{state.workflowName || 'Workflow'}</h3>
                    <p className="text-white/60 text-sm">{totalSteps} etapas planejadas</p>
                  </div>
                  <Badge variant="status" status="success" size="sm">Iniciado</Badge>
                </div>

                {/* Demand/Input */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, transparent 100%)',
                    border: '1px solid rgba(209, 255, 0, 0.12)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}>
                      <MessageIcon />
                    </div>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Demanda Solicitada</span>
                  </div>
                  <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                    {(state.input?.demand as string) || (state.input?.message as string) || 'Demanda não especificada'}
                  </p>
                </div>

                {/* Expected Outputs */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 65%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 40%, #000))' }}>
                      <TargetIcon />
                    </div>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Outputs Esperados</span>
                  </div>
                  <ul className="space-y-2 text-sm text-white/80">
                    {state.steps.map((step, idx) => {
                      const output = step.output as StepOutput | undefined;
                      const agentName = output?.agent?.name || `Step ${idx + 1}`;
                      const role = output?.role || STEP_TYPE_LABELS[step.type] || step.type;
                      return (
                        <li key={step.id} className="flex items-start gap-2">
                          <span className="text-white/60 text-xs mt-1">{idx + 1}.</span>
                          <div>
                            <span className="text-white/90 font-medium">{agentName}</span>
                            <span className="text-white/50"> — {role}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Timeline Preview */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 50%, #000))' }}>
                      <ClockIcon size={10} />
                    </div>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Status</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-lg font-bold" style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' }}>{completedSteps}</p>
                      <p className="text-[10px] text-white/60">Concluídos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #D1FF00)' }}>{runningSteps}</p>
                      <p className="text-[10px] text-white/60">Executando</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-lg font-bold text-gray-400">{pendingSteps}</p>
                      <p className="text-[10px] text-white/60">Pendentes</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========== END NODE ========== */}
            {isEndNode && (
              <>
                {/* Final Status */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-12 w-12 rounded-xl flex items-center justify-center',
                    state.status === 'completed' && 'bg-[rgba(209,255,0,0.10)]',
                    state.status === 'failed' && 'bg-gradient-to-br from-red-500/30 to-rose-500/30',
                    state.status === 'running' && 'bg-[rgba(209,255,0,0.12)]'
                  )}>
                    {state.status === 'completed' && <span style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' }}><CheckIcon size={20} /></span>}
                    {state.status === 'failed' && <span className="text-red-400"><XIcon /></span>}
                    {state.status === 'running' && <SpinnerIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 font-semibold">
                      {state.status === 'completed' ? 'Workflow Concluído' :
                       state.status === 'failed' ? 'Workflow Falhou' : 'Em Execução'}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {completedSteps}/{totalSteps} etapas · {formatDuration(state.startedAt, state.completedAt)}
                    </p>
                  </div>
                  <Badge
                    variant="status"
                    status={state.status === 'completed' ? 'success' : state.status === 'failed' ? 'error' : 'warning'}
                    size="sm"
                  >
                    {state.status === 'completed' && 'Sucesso'}
                    {state.status === 'failed' && 'Erro'}
                    {state.status === 'running' && 'Executando'}
                  </Badge>
                </div>

                {/* Original Demand */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}>
                      <MessageIcon />
                    </div>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Demanda Original</span>
                  </div>
                  <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed line-clamp-3">
                    {(state.input?.demand as string) || (state.input?.message as string) || 'Demanda não especificada'}
                  </p>
                </div>

                {/* All Outputs Summary */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 65%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 40%, #000))' }}>
                      <FileTextIcon />
                    </div>
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Produção de Cada Etapa</span>
                  </div>
                  <div className="space-y-3">
                    {state.steps.filter(s => s.status === 'completed').map((step, idx) => {
                      const output = step.output as StepOutput | undefined;
                      const agentName = output?.agent?.name || `Step ${idx + 1}`;
                      const squadType = output?.agent?.squad || 'orchestrator';
                      const response = output?.response || '';
                      const style = getSquadStyle(squadType);

                      return (
                        <div
                          key={step.id}
                          className={cn('rounded-lg p-2 border', style.border)}
                          style={{ background: 'var(--color-background-disabled)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar name={agentName} size="sm" squadType={squadType as SquadType} />
                            <span className="text-xs font-medium text-white/80">{agentName}</span>
                            <span className="text-[10px] text-white/60 ml-auto">{squadType}</span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2">{response || 'Sem resposta'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Final Result */}
                {state.status === 'completed' && state.steps.length > 0 && (
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, transparent 100%)',
                      border: '1px solid rgba(209, 255, 0, 0.12)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 50%, #000))' }}>
                          <CheckIcon size={10} />
                        </div>
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Resultado Final</span>
                      </div>
                      {(() => {
                        const lastStep = [...state.steps].reverse().find(s => s.status === 'completed');
                        const response = (lastStep?.output as StepOutput | undefined)?.response || '';
                        return response ? (
                          <button
                            onClick={() => handleCopy(response)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all',
                              copiedText === response ? 'bg-[rgba(209,255,0,0.08)]' : 'hover:bg-white/10 text-white/60 hover:text-white'
                            )}
                            style={copiedText === response ? { color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' } : undefined}
                            aria-label="Copiar resultado"
                          >
                            {copiedText === response ? <CheckIcon size={12} /> : <CopyIcon />}
                          </button>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
                      {(() => {
                        const lastStep = [...state.steps].reverse().find(s => s.status === 'completed');
                        return (lastStep?.output as StepOutput | undefined)?.response || 'Nenhum resultado disponível';
                      })()}
                    </p>
                  </div>
                )}

                {/* Error if failed */}
                {state.status === 'failed' && state.error && (
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <XIcon />
                      <span className="text-xs font-semibold text-red-400">Erro</span>
                    </div>
                    <p className="text-sm text-red-300">{state.error}</p>
                  </div>
                )}
              </>
            )}

            {/* ========== SPECIALIST STEP ========== */}
            {selectedStep && !isStartNode && !isEndNode && (() => {
              const output = selectedStep.output as StepOutput | undefined;
              const config = selectedStep.config;
              const agent = output?.agent;
              // Use config for agent info before completion, output.agent after completion
              const agentName = agent?.name || config?.agentId || selectedStep.name || `Step ${state.steps.indexOf(selectedStep) + 1}`;
              const squadType = agent?.squad || config?.squadId || 'orchestrator';
              const response = output?.response || '';
              // Use config.message for step-specific request, or fallback to workflow input
              const inputDemand = config?.message || (state.input?.demand as string) || (state.input?.message as string) || (typeof state.input === 'string' ? state.input : '');

              return (
                <>
                  {/* Agent Header */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={agentName}
                      size="lg"
                      squadType={squadType as SquadType}
                      status={selectedStep.status === 'running' ? 'online' : selectedStep.status === 'completed' ? 'online' : 'offline'}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white/90 font-semibold">
                        {agentName}
                      </h3>
                      <p className="text-white/60 text-sm">{squadType}</p>
                    </div>
                    <Badge
                      variant="status"
                      status={
                        selectedStep.status === 'completed' ? 'success' :
                        selectedStep.status === 'running' ? 'warning' :
                        selectedStep.status === 'failed' ? 'error' : 'offline'
                      }
                      size="sm"
                    >
                      {selectedStep.status === 'completed' && 'Concluído'}
                      {selectedStep.status === 'running' && 'Executando'}
                      {selectedStep.status === 'pending' && 'Pendente'}
                      {selectedStep.status === 'failed' && 'Erro'}
                    </Badge>
                  </div>

                  {/* Progress (Running) */}
                  {selectedStep.status === 'running' && (
                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.08) 0%, rgba(209, 255, 0, 0.04) 100%)',
                        border: '1px solid rgba(209, 255, 0, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <SpinnerIcon size={14} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-accent, #D1FF00)' }}>Processando...</span>
                      </div>
                      <div className="h-2 rounded-full bg-[rgb(0_0_0/0.3)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          style={{ width: '50%', background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))', boxShadow: '0 0 10px rgba(209, 255, 0, 0.3)' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Timing */}
                  {selectedStep.startedAt && (
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <ClockIcon size={12} />
                      <span>Duração: {formatDuration(selectedStep.startedAt, selectedStep.completedAt)}</span>
                    </div>
                  )}

                  {/* Input/Request - O QUE FOI SOLICITADO */}
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, transparent 100%)',
                      border: '1px solid rgba(209, 255, 0, 0.12)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}>
                        <MessageIcon />
                      </div>
                      <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Solicitação Recebida</span>
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-32 overflow-auto">
                      {inputDemand || 'Demanda do workflow'}
                    </p>
                  </div>

                  {/* Context from previous steps */}
                  {(() => {
                    const stepIndex = state.steps.indexOf(selectedStep);
                    const previousSteps = state.steps.slice(0, stepIndex).filter(s => s.status === 'completed');
                    if (previousSteps.length === 0) return null;

                    return (
                      <div
                        className="rounded-xl p-3"
                        style={{
                          background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 65%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 40%, #000))' }}>
                            <ActivityIcon />
                          </div>
                          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Contexto Recebido</span>
                        </div>
                        <div className="space-y-2">
                          {previousSteps.map((prevStep) => {
                            const prevOutput = prevStep.output as StepOutput | undefined;
                            const prevConfig = prevStep.config;
                            const prevAgent = prevOutput?.agent?.name || prevConfig?.agentId || prevStep.name || 'Step anterior';
                            const prevResponse = prevOutput?.response || '';
                            return (
                              <div key={prevStep.id} className="text-xs">
                                <span className="text-white/60 font-medium">{prevAgent}:</span>
                                <p className="text-white/50 line-clamp-2 mt-0.5">{prevResponse.substring(0, 150)}...</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Role/Function */}
                  {(output?.role || config?.role) && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 80%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 55%, #000))' }}>
                          <CpuIcon />
                        </div>
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Papel no Workflow</span>
                      </div>
                      <p className="text-sm text-white/90 capitalize">{output?.role || config?.role}</p>
                    </div>
                  )}

                  {/* Response - OUTPUT PRODUZIDO */}
                  {response && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.06) 0%, transparent 100%)',
                        border: '1px solid rgba(209, 255, 0, 0.12)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 50%, #000))' }}>
                            <FileTextIcon />
                          </div>
                          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Output Produzido</span>
                        </div>
                        <button
                          onClick={() => handleCopy(response)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            copiedText === response ? 'bg-[rgba(209,255,0,0.08)]' : 'hover:bg-white/10 text-white/60 hover:text-white'
                          )}
                          style={copiedText === response ? { color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' } : undefined}
                          aria-label="Copiar output"
                        >
                          {copiedText === response ? <CheckIcon size={12} /> : <CopyIcon />}
                        </button>
                      </div>
                      <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
                        {response}
                      </p>
                    </div>
                  )}

                  {/* LLM Metadata */}
                  {output?.llmMetadata && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, transparent 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent, #D1FF00) 60%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 40%, #000))' }}>
                          <CpuIcon />
                        </div>
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Modelo LLM</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/50">Provider</span>
                          <span className="text-white">{output.llmMetadata.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Model</span>
                          <span className="text-white font-mono text-[10px]">{output.llmMetadata.model}</span>
                        </div>
                        {output.llmMetadata.inputTokens && (
                          <div className="flex justify-between">
                            <span className="text-white/50">Input</span>
                            <span className="text-white">{output.llmMetadata.inputTokens} tokens</span>
                          </div>
                        )}
                        {output.llmMetadata.outputTokens && (
                          <div className="flex justify-between">
                            <span className="text-white/50">Output</span>
                            <span className="text-white">{output.llmMetadata.outputTokens} tokens</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {selectedStep.status === 'failed' && selectedStep.error && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.35)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <XIcon />
                        <span className="text-xs font-semibold text-red-400">Erro</span>
                      </div>
                      <p className="text-sm text-red-300">{selectedStep.error}</p>
                    </div>
                  )}

                  {/* Raw JSON */}
                  {output && (
                    <details className="text-xs">
                      <summary className="text-white/60 cursor-pointer hover:text-white/80 py-2 flex items-center gap-2">
                        <CodeIcon />
                        <span>Ver JSON completo</span>
                      </summary>
                      <pre className="mt-2 p-3 bg-[rgb(0_0_0/0.3)] rounded-xl overflow-x-auto text-white/60 text-[10px] leading-relaxed">
                        {JSON.stringify(output, null, 2)}
                      </pre>
                    </details>
                  )}
                </>
              );
            })()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
