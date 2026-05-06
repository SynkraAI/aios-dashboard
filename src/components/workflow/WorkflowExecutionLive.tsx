import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassButton } from '../ui';
import { WorkflowCanvas } from './WorkflowCanvas';
import type { WorkflowNode, WorkflowEdge } from './types';
import type { SquadType } from '../../types';
import { cn } from '../../lib/utils';

import { CheckIcon, XIcon, CloseIcon, SpinnerIcon, ClockIcon, ZoomInIcon, ZoomOutIcon } from './workflow-execution-icons';
import { formatElapsedTime, formatDuration, stepStatusToNodeStatus, stepStatusToEdgeStatus } from './workflow-execution-helpers';
import { STEP_TYPE_TO_SQUAD } from './workflow-execution-constants';
import type { StepOutput, WorkflowExecutionLiveProps } from './workflow-execution-types';
import { WorkflowExecutionSidebar } from './WorkflowExecutionSidebar';
import { WorkflowExecutionDetails } from './WorkflowExecutionDetails';

export function WorkflowExecutionLive({ state, onClose, orchestrationPlan }: WorkflowExecutionLiveProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const completedSteps = state.steps.filter((s) => s.status === 'completed').length;
  const runningSteps = state.steps.filter((s) => s.status === 'running').length;
  const pendingSteps = state.steps.filter((s) => s.status === 'pending').length;
  const totalSteps = state.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Elapsed time timer
  useEffect(() => {
    if (state.status === 'running' && state.startedAt) {
      const startTime = new Date(state.startedAt).getTime();
      // Set initial elapsed time via microtask to avoid synchronous setState in effect
      queueMicrotask(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)));
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.status, state.startedAt]);

  // Copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get selected step data
  const selectedStep = selectedNodeId ? state.steps.find(s => s.id === selectedNodeId) : null;

  // Convert execution steps to canvas nodes and edges
  const { nodes, edges } = useMemo(() => {
    const canvasNodes: WorkflowNode[] = [];
    const canvasEdges: WorkflowEdge[] = [];

    const startX = 100;
    const startY = 200;
    const stepWidth = 220;
    const stepSpacing = 60;

    canvasNodes.push({
      id: 'start',
      type: 'start',
      label: 'Início',
      status: state.status === 'connecting' ? 'idle' : 'completed',
      position: { x: startX, y: startY },
    });

    state.steps.forEach((step, index) => {
      const x = startX + (index + 1) * (stepWidth + stepSpacing);
      const y = startY + (index % 2 === 0 ? 0 : 50);

      const output = step.output as StepOutput | undefined;
      const agent = output?.agent;
      const config = step.config;

      // Use agent from output if available (after completion), otherwise use config (before completion)
      const agentName = agent?.name || config?.agentId || step.name || `Step ${index + 1}`;
      const squadType = agent?.squad || config?.squadId || STEP_TYPE_TO_SQUAD[step.type] || 'orchestrator';
      const role = output?.role || config?.role || step.type;

      canvasNodes.push({
        id: step.id,
        type: 'agent',
        label: agentName,
        agentName: agentName,
        squadType: squadType as SquadType,
        status: stepStatusToNodeStatus(step.status),
        position: { x, y },
        progress: step.status === 'running' ? 50 : step.status === 'completed' ? 100 : 0,
        currentAction: step.status === 'running' ? 'Processando...' : undefined,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        output: output?.response,
        request: role,
      });
    });

    if (state.steps.length > 0) {
      const lastStepX = startX + state.steps.length * (stepWidth + stepSpacing);
      canvasNodes.push({
        id: 'end',
        type: 'end',
        label: state.status === 'completed' ? 'Concluído' : 'Fim',
        status: state.status === 'completed' ? 'completed' : state.status === 'failed' ? 'error' : 'idle',
        position: { x: lastStepX + stepWidth + stepSpacing, y: startY },
      });
    }

    if (state.steps.length > 0) {
      canvasEdges.push({
        id: 'edge-start-step1',
        source: 'start',
        target: state.steps[0].id,
        status: state.steps[0].status === 'pending' ? 'idle' : 'completed',
        animated: state.steps[0].status === 'running',
      });
    }

    state.steps.forEach((step, index) => {
      if (index < state.steps.length - 1) {
        const nextStep = state.steps[index + 1];
        canvasEdges.push({
          id: `edge-${step.id}-${nextStep.id}`,
          source: step.id,
          target: nextStep.id,
          status: stepStatusToEdgeStatus(step.status),
          animated: nextStep.status === 'running',
        });
      }
    });

    if (state.steps.length > 0) {
      const lastStep = state.steps[state.steps.length - 1];
      canvasEdges.push({
        id: 'edge-last-end',
        source: lastStep.id,
        target: 'end',
        status: stepStatusToEdgeStatus(lastStep.status),
        animated: state.status === 'running' && lastStep.status === 'running',
      });
    }

    return { nodes: canvasNodes, edges: canvasEdges };
  }, [state.steps, state.status]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgb(0_0_0/0.6)] backdrop-blur-sm" />

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 m-4 flex-1 flex flex-col backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(209, 255, 0, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 100% 0%, rgba(209, 255, 0, 0.05) 0%, transparent 50%),
            rgba(0, 0, 0, 0.75)
          `
        }}
      >
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              state.status === 'running' && 'bg-[rgba(209,255,0,0.08)]',
              state.status === 'completed' && 'bg-[rgba(209,255,0,0.06)]',
              state.status === 'failed' && 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
              (state.status === 'connecting' || state.status === 'created') && 'bg-[rgba(209,255,0,0.10)]'
            )}>
              {(state.status === 'connecting' || state.status === 'created' || state.status === 'running') && (
                <SpinnerIcon size={18} />
              )}
              {state.status === 'completed' && (
                <span style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' }}><CheckIcon size={18} /></span>
              )}
              {state.status === 'failed' && (
                <span className="text-red-400"><XIcon /></span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {state.workflowName || 'Executando Workflow'}
              </h2>
              <p className="text-xs text-white/50">
                {state.status === 'connecting' && 'Conectando ao servidor...'}
                {state.status === 'created' && 'Execução iniciada'}
                {state.status === 'running' && `Executando ${runningSteps > 0 ? `· ${runningSteps} step(s) ativos` : ''}`}
                {state.status === 'completed' && 'Todos os steps foram concluídos com sucesso'}
                {state.status === 'failed' && 'A execução encontrou um erro'}
              </p>
            </div>
          </div>

          {/* Metrics & Controls */}
          <div className="flex items-center gap-3">
            {/* Timer */}
            {state.status === 'running' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <ClockIcon size={14} />
                <span className="text-sm font-mono text-white/80">{formatElapsedTime(elapsedTime)}</span>
              </div>
            )}

            {/* Zoom */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Diminuir zoom"
              >
                <ZoomOutIcon />
              </button>
              <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Aumentar zoom"
              >
                <ZoomInIcon />
              </button>
            </div>

            <GlassButton variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Fechar workflow">
              <CloseIcon />
            </GlassButton>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[rgb(0_0_0/0.3)] flex-shrink-0">
          <motion.div
            className={cn(
              'h-full',
              state.status === 'failed' && 'bg-gradient-to-r from-red-500 to-rose-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              ...( state.status !== 'failed' ? { background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' } : {}),
              boxShadow: state.status !== 'failed' ? '0 0 10px rgba(209, 255, 0, 0.3)' : '0 0 10px rgba(239, 68, 68, 0.5)'
            }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT SIDEBAR - Operations */}
          <WorkflowExecutionSidebar
            state={state}
            orchestrationPlan={orchestrationPlan}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            completedSteps={completedSteps}
            runningSteps={runningSteps}
            pendingSteps={pendingSteps}
            totalSteps={totalSteps}
            progress={progress}
          />

          {/* CENTER - Canvas */}
          <div className="flex-1 relative">
            {state.steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/60">
                <SpinnerIcon size={40} />
                <p className="mt-4 text-lg">Preparando execução...</p>
                <p className="mt-1 text-sm">Aguardando dados do workflow</p>
              </div>
            ) : (
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                zoom={zoom}
                onZoomChange={setZoom}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            )}
          </div>

          {/* RIGHT SIDEBAR - Node Details */}
          <WorkflowExecutionDetails
            state={state}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            selectedStep={selectedStep || null}
            copiedText={copiedText}
            handleCopy={handleCopy}
          />
        </div>

        {/* Footer - Result Summary */}
        {(state.status === 'completed' || state.status === 'failed') && (
          <div className={cn(
            'border-t border-white/10 p-4 flex items-center justify-between flex-shrink-0',
            state.status === 'completed' && 'bg-[rgba(209,255,0,0.06)]',
            state.status === 'failed' && 'bg-gradient-to-r from-red-500/10 to-transparent'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                state.status === 'completed' ? 'bg-[rgba(209,255,0,0.10)]' : 'bg-gradient-to-br from-red-500/30 to-rose-500/30'
              )}>
                {state.status === 'completed' ? (
                  <span style={{ color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' }}><CheckIcon size={18} /></span>
                ) : (
                  <span className="text-red-400"><XIcon /></span>
                )}
              </div>
              <div>
                <p
                  className={cn(
                    'font-semibold',
                    state.status !== 'completed' && 'text-red-400'
                  )}
                  style={state.status === 'completed' ? { color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' } : undefined}
                >
                  {state.status === 'completed' ? 'Execução Concluída!' : 'Execução Falhou'}
                </p>
                <p className="text-xs text-white/50">
                  {completedSteps}/{totalSteps} steps · {formatDuration(state.startedAt, state.completedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {state.status === 'completed' && state.steps.length > 0 && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const lastCompleted = [...state.steps].reverse().find(s => s.status === 'completed');
                    if (lastCompleted) setSelectedNodeId(lastCompleted.id);
                  }}
                >
                  Ver Resultado Final
                </GlassButton>
              )}
              <GlassButton variant="primary" onClick={onClose}>
                Fechar
              </GlassButton>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
