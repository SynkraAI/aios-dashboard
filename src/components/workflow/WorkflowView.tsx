import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton, Badge } from '../ui';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowSidebar } from './WorkflowSidebar';
import { WorkflowMissionDetail } from './WorkflowMissionDetail';
import { WorkflowListView } from './WorkflowListView';
import { NodeDetailPanel } from './NodeDetailPanel';
import { ExecuteWorkflowDialog, SmartOrchestrationDialog } from './WorkflowDialogs';
import { PlayIcon, PauseIcon, RefreshIcon, GridIcon, ListIcon, ZoomInIcon, ZoomOutIcon, CloseIcon, ClockIcon, TokenIcon } from './WorkflowIcons';
import { formatDuration, formatTokens } from './workflow-utils';
import { createMockMission, createMockOperations } from './workflow-mock-data';
import { cn, formatRelativeTime } from '../../lib/utils';
import { useWorkflows, useCreateWorkflow, useExecuteWorkflow, useWorkflowExecutions, useExecuteWorkflowStream, useSmartOrchestration } from '../../hooks/useWorkflows';
import { workflowsApi } from '../../services/api';
import { CreateWorkflowModal } from '../settings/WorkflowManager';
import { WorkflowExecutionLive } from './WorkflowExecutionLive';
import { useTaskLiveMission } from '../../hooks/useTaskLiveMission';
import { useTaskHistory, useTaskDetail } from '../../hooks/useTaskHistory';
import { useTaskReplay } from '../../hooks/useTaskReplay';
import { exportTaskAsJSON, exportTaskAsMarkdown, copyTaskShareLink } from '../../lib/taskExport';
import type { WorkflowMission, WorkflowOperation } from './types';

interface WorkflowViewProps {
  onClose: () => void;
}

export function WorkflowView({ onClose }: WorkflowViewProps) {
  // Fetch real workflows from API
  const { data: realWorkflows, isLoading: isLoadingWorkflows, refetch: refetchWorkflows } = useWorkflows();
  const { data: _executions, isLoading: _isLoadingExecutions } = useWorkflowExecutions({ limit: 10 });
  const createWorkflowMutation = useCreateWorkflow();
  const executeWorkflowMutation = useExecuteWorkflow();
  const { state: liveExecutionState, execute: executeLive, reset: resetLiveExecution } = useExecuteWorkflowStream();
  const { state: orchestrationState, orchestrate: _startOrchestration, reset: resetOrchestration } = useSmartOrchestration();
  const taskLiveMission = useTaskLiveMission();
  const { data: taskHistoryData, isLoading: isLoadingTaskHistory, refetch: refetchTaskHistory } = useTaskHistory({ limit: 30 });
  const taskReplay = useTaskReplay();
  const [replayTaskId, setReplayTaskId] = useState<string | null>(null);
  const [replayTaskData, setReplayTaskData] = useState<import('../../services/api/tasks').Task | null>(null);
  const { data: replayTaskDetail } = useTaskDetail(replayTaskId);
  const [showLiveExecution, setShowLiveExecution] = useState(false);
  const [showOrchestration, setShowOrchestration] = useState(false);
  const [liveMissionActive, setLiveMissionActive] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Execution dialog state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [pendingWorkflowId, setPendingWorkflowId] = useState<string | null>(null);
  const [demandInput, setDemandInput] = useState('');

  // Smart Orchestration dialog state
  const [showOrchestrationDialog, setShowOrchestrationDialog] = useState(false);
  const [orchestrationDemand, setOrchestrationDemand] = useState('');

  const [activeTab, setActiveTab] = useState<'list' | 'executions' | 'demo'>('list');
  // Execution history filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [workflowType, setWorkflowType] = useState<'simple' | 'complex'>('simple');
  const [mission, setMission] = useState<WorkflowMission>(() => createMockMission('simple'));
  const [operations, setOperations] = useState<WorkflowOperation[]>(createMockOperations);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [showMissionDetail, setShowMissionDetail] = useState(false);

  // Switch workflow type
  const handleWorkflowTypeChange = (type: 'simple' | 'complex') => {
    setWorkflowType(type);
    setMission(createMockMission(type));
    setSelectedNodeId(null);
    setZoom(type === 'complex' ? 0.8 : 1);
  };

  // Handle workflow created from modal
  const handleWorkflowCreated = useCallback(async (data: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      type: string;
      name: string;
      handler: string;
      config: { squadId: string; agentId: string; role: string; message: string };
      dependsOn?: string[];
    }>;
  }) => {
    try {
      const workflow = await createWorkflowMutation.mutateAsync({
        name: data.name,
        description: data.description,
        stepCount: data.steps.length,
        steps: data.steps.map((s) => ({
          ...s,
          type: s.type as 'task',
        })),
      });
      if (workflow?.id && workflow.status !== 'active') {
        try {
          await workflowsApi.activateWorkflow(workflow.id);
        } catch (activateError) {
          console.warn('Could not activate workflow:', activateError);
        }
      }
      setShowCreateModal(false);
      refetchWorkflows();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  }, [createWorkflowMutation, refetchWorkflows]);

  // Activate a draft workflow
  const handleActivateWorkflow = async (workflowId: string) => {
    try {
      await workflowsApi.activateWorkflow(workflowId);
      refetchWorkflows();
    } catch (error) {
      console.error('Failed to activate workflow:', error);
    }
  };

  // Open the execute dialog
  const handleOpenExecuteDialog = (workflowId: string) => {
    setPendingWorkflowId(workflowId);
    setDemandInput('');
    setShowExecuteDialog(true);
  };

  // Execute a workflow with live streaming
  const handleExecuteWorkflow = async () => {
    if (!pendingWorkflowId || !demandInput.trim()) return;
    setShowExecuteDialog(false);
    setShowLiveExecution(true);
    executeLive(pendingWorkflowId, { demand: demandInput.trim() });
  };

  // Close live execution modal
  const handleCloseLiveExecution = () => {
    setShowLiveExecution(false);
    resetLiveExecution();
  };

  // Start smart orchestration — uses live mission on canvas
  const handleStartOrchestration = async () => {
    if (!orchestrationDemand.trim()) return;
    setShowOrchestrationDialog(false);
    setLiveMissionActive(true);
    setActiveTab('demo');
    setIsPlaying(false);
    taskLiveMission.start(orchestrationDemand.trim());
  };

  // Close orchestration / live mission
  const handleCloseOrchestration = () => {
    setShowOrchestration(false);
    resetOrchestration();
  };

  const handleCloseLiveMission = () => {
    setLiveMissionActive(false);
    taskLiveMission.reset();
    setIsPlaying(true);
    setMission(createMockMission(workflowType));
    setOperations(createMockOperations());
  };

  // Export task results as Markdown
  const handleExportTask = useCallback(async (task: { id: string; demand: string; status: string; squads: Array<{ squadId: string; agentCount: number }>; outputs: Array<{ stepId: string; stepName: string; output: Record<string, unknown> }>; createdAt?: string; completedAt?: string; totalTokens?: number; totalDuration?: number }) => {
    let fullTask = task;
    if (task.outputs.length === 0 && task.status === 'completed') {
      try {
        const { tasksApi } = await import('../../services/api/tasks');
        fullTask = await tasksApi.getTask(task.id);
      } catch { /* use what we have */ }
    }

    const lines: string[] = [];
    lines.push(`# Orquestração: ${fullTask.demand}`);
    lines.push('');
    lines.push(`- **ID:** ${fullTask.id}`);
    lines.push(`- **Status:** ${fullTask.status}`);
    if (fullTask.createdAt) lines.push(`- **Criado:** ${new Date(fullTask.createdAt).toLocaleString('pt-BR')}`);
    if (fullTask.completedAt) lines.push(`- **Concluído:** ${new Date(fullTask.completedAt).toLocaleString('pt-BR')}`);
    if (fullTask.totalDuration) lines.push(`- **Duração:** ${formatDuration(Math.floor(fullTask.totalDuration / 1000))}`);
    if (fullTask.totalTokens) lines.push(`- **Tokens:** ${formatTokens(fullTask.totalTokens)}`);
    lines.push('');

    if (fullTask.squads.length > 0) {
      lines.push('## Squads');
      fullTask.squads.forEach(sq => {
        lines.push(`- **${sq.squadId}** (${sq.agentCount} agentes)`);
      });
      lines.push('');
    }

    if (fullTask.outputs.length > 0) {
      lines.push('## Outputs');
      lines.push('');
      fullTask.outputs.forEach((o, i) => {
        const response = (o.output.response as string) || (o.output.content as string) || '';
        const agentName = (o.output.agent as Record<string, string>)?.name || 'Agent';
        const squad = (o.output.agent as Record<string, string>)?.squad || '';
        lines.push(`### ${i + 1}. ${o.stepName || `Step ${i + 1}`}`);
        lines.push(`**Agent:** ${agentName}${squad ? ` (${squad})` : ''}`);
        lines.push('');
        if (response) {
          lines.push(response);
          lines.push('');
        }
        lines.push('---');
        lines.push('');
      });
    }

    const markdown = lines.join('\n');
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchestration-${fullTask.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Start replay of a completed task
  const handleStartReplay = (taskId: string) => {
    setReplayTaskId(taskId);
  };

  // When task detail is loaded, start replay
  const handleReplayLoaded = useCallback((task: typeof replayTaskDetail) => {
    if (!task) return;
    taskReplay.load(task);
    setReplayTaskData(task);
    setReplayActive(true);
    setLiveMissionActive(false);
    setIsPlaying(false);
    setActiveTab('demo');
    setReplayTaskId(null);
    setTimeout(() => taskReplay.play(), 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (replayTaskDetail && replayTaskId) {
      handleReplayLoaded(replayTaskDetail);
    }
  }, [replayTaskDetail, replayTaskId, handleReplayLoaded]);

  const handleStopReplay = () => {
    taskReplay.stop();
    setReplayTaskData(null);
    setReplayActive(false);
    setIsPlaying(true);
    setMission(createMockMission(workflowType));
    setOperations(createMockOperations());
  };

  // Simulate real-time updates — advances through all nodes sequentially
  useEffect(() => {
    if (!isPlaying) return;

    const nodeOrder = [
      'node-copy-1',
      'node-copy-2',
      'node-design',
      'node-creator',
      'node-review',
      'node-end',
    ];

    const interval = setInterval(() => {
      setMission((prev) => {
        const activeNode = prev.nodes.find(
          (n) => n.status === 'active' && n.progress !== undefined && n.progress < 100
        );

        if (activeNode) {
          const newProgress = Math.min((activeNode.progress || 0) + 2, 100);
          const isComplete = newProgress >= 100;
          const activeIndex = nodeOrder.indexOf(activeNode.id);
          const nextNodeId = activeIndex >= 0 && activeIndex < nodeOrder.length - 1
            ? nodeOrder[activeIndex + 1]
            : null;
          const completedEdgeSource = activeNode.id;

          return {
            ...prev,
            progress: Math.min(prev.progress + 1, 100),
            nodes: prev.nodes.map((n) => {
              if (n.id === activeNode.id) {
                return {
                  ...n,
                  progress: newProgress,
                  status: isComplete ? 'completed' as const : n.status,
                  currentAction: isComplete ? 'Tarefa concluída' : n.currentAction,
                  completedAt: isComplete ? new Date().toISOString() : n.completedAt,
                };
              }
              if (isComplete && nextNodeId && n.id === nextNodeId) {
                if (n.type === 'checkpoint' || n.type === 'end') {
                  return { ...n, status: 'completed' as const };
                }
                return {
                  ...n,
                  status: 'active' as const,
                  progress: 0,
                  currentAction: n.id === 'node-copy-2' ? 'Escrevendo body copy...'
                    : n.id === 'node-design' ? 'Criando layout da landing page...'
                    : n.id === 'node-creator' ? 'Produzindo conteúdo para redes sociais...'
                    : n.currentAction,
                  startedAt: new Date().toISOString(),
                };
              }
              return n;
            }),
            edges: prev.edges.map((e) => {
              if (isComplete && e.source === completedEdgeSource) {
                return { ...e, status: 'completed' as const, animated: false };
              }
              if (isComplete && nextNodeId && e.source === nextNodeId && e.status === 'idle') {
                return { ...e, status: 'active' as const, animated: true };
              }
              return e;
            }),
            agents: prev.agents.map((a) => {
              const agentNode = prev.nodes.find((n) => n.agentName === a.name);
              if (!agentNode) return a;
              if (agentNode.id === activeNode.id && isComplete) {
                return { ...a, status: 'completed' as const, currentTask: 'Concluído' };
              }
              if (isComplete && nextNodeId) {
                const nextNode = prev.nodes.find((n) => n.id === nextNodeId);
                if (nextNode && nextNode.agentName === a.name) {
                  return { ...a, status: 'working' as const, currentTask: nextNode.currentAction || 'Trabalhando...' };
                }
              }
              return a;
            }),
          };
        }

        const allDone = prev.nodes
          .filter((n) => n.type === 'agent')
          .every((n) => n.status === 'completed');

        if (allDone && prev.status !== 'completed') {
          return {
            ...prev,
            status: 'completed' as const,
            progress: 100,
            estimatedTimeRemaining: 0,
            nodes: prev.nodes.map((n) =>
              n.type === 'end' || n.type === 'checkpoint'
                ? { ...n, status: 'completed' as const }
                : n
            ),
            edges: prev.edges.map((e) => ({ ...e, status: 'completed' as const, animated: false })),
          };
        }

        return prev;
      });

      setOperations((prev) =>
        prev.map((op) => {
          if (op.status === 'running') {
            return { ...op, duration: (op.duration || 0) + 1 };
          }
          return op;
        })
      );
    }, 800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleReset = () => {
    setMission(createMockMission(workflowType));
    setOperations(createMockOperations());
    setSelectedNodeId(null);
    setIsPlaying(true);
  };

  const activeMissionData = useMemo(() =>
    replayActive && taskReplay.state.mission ? taskReplay.state.mission :
    liveMissionActive && taskLiveMission.state.mission ? taskLiveMission.state.mission :
    mission,
    [replayActive, taskReplay.state.mission, liveMissionActive, taskLiveMission.state.mission, mission]
  );
  const selectedNode = useMemo(() =>
    selectedNodeId
      ? activeMissionData.nodes.find((n) => n.id === selectedNodeId)
      : null,
    [selectedNodeId, activeMissionData.nodes]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgb(0_0_0/0.4)] backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 m-2 md:m-4 flex-1 flex flex-col backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(209, 255, 0, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 100% 0%, rgba(0, 153, 255, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 70%),
            rgba(20, 20, 25, 0.75)
          `,
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Top Tab Bar */}
        <div className="h-12 md:h-14 px-3 md:px-6 flex items-center justify-between border-b border-white/15 bg-white/5">
          <div className="flex items-center gap-6">
            <h2 className="text-white font-semibold">Workflows</h2>

            {/* Main Tabs */}
            <div className="flex gap-1 p-1 bg-white/8 rounded-lg border border-white/10" role="tablist" aria-label="Abas do workflow">
              <button
                role="tab"
                aria-selected={activeTab === 'list'}
                tabIndex={activeTab === 'list' ? 0 : -1}
                onClick={() => setActiveTab('list')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'list'
                    ? 'bg-white/10 text-white/90'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                Workflows
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'executions'}
                tabIndex={activeTab === 'executions' ? 0 : -1}
                onClick={() => setActiveTab('executions')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'executions'
                    ? 'bg-white/10 text-white/90'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                Execuções
                {taskHistoryData && taskHistoryData.tasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                    {taskHistoryData.tasks.length}
                  </span>
                )}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'demo'}
                tabIndex={activeTab === 'demo' ? 0 : -1}
                onClick={() => setActiveTab('demo')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'demo'
                    ? 'bg-white/10 text-white/90'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                {replayActive ? 'Replay' : liveMissionActive ? 'Live' : 'Demo'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => {
                setOrchestrationDemand('');
                setShowOrchestrationDialog(true);
              }}
              className="bg-gradient-to-r from-[#D1FF00]/20 to-[#0099FF]/20 border-[#D1FF00]/30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
              Orquestrar
            </GlassButton>
            <GlassButton variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar">
              <CloseIcon />
            </GlassButton>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'list' ? (
          /* Workflows List Tab */
          <div className="flex-1 overflow-auto p-6">
            {isLoadingWorkflows ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white/60 rounded-full" />
              </div>
            ) : realWorkflows && realWorkflows.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-white/70">{realWorkflows.length} workflow(s) encontrado(s)</p>
                  <div className="flex gap-2">
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setOrchestrationDemand('');
                        setShowOrchestrationDialog(true);
                      }}
                      className="bg-gradient-to-r from-[#D1FF00]/20 to-[#0099FF]/20 border-[#D1FF00]/30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                        <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                      </svg>
                      Orquestrar
                    </GlassButton>
                    <GlassButton variant="ghost" size="sm" onClick={() => setShowCreateModal(true)}>
                      + Criar Workflow
                    </GlassButton>
                  </div>
                </div>
                <div className="grid gap-4">
                  {realWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="p-4 rounded-xl border border-white/15 bg-white/8 hover:bg-white/12 transition-all backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{workflow.name}</h3>
                          <p className="text-white/60 text-sm mt-1">{workflow.description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="status"
                            status={workflow.status === 'active' ? 'online' : workflow.status === 'paused' ? 'warning' : 'offline'}
                            size="sm"
                          >
                            {workflow.status}
                          </Badge>
                          {workflow.status === 'draft' && (
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivateWorkflow(workflow.id)}
                              className="ml-2"
                            >
                              Ativar
                            </GlassButton>
                          )}
                          {workflow.status === 'active' && (
                            <GlassButton
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenExecuteDialog(workflow.id)}
                              disabled={executeWorkflowMutation.isPending}
                              className="ml-2"
                            >
                              <PlayIcon />
                              <span className="ml-1">Executar</span>
                            </GlassButton>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                        <span>{workflow.stepCount} steps</span>
                        <span>•</span>
                        <span>Trigger: {workflow.trigger?.type || 'manual'}</span>
                        <span>•</span>
                        <span>Criado {formatRelativeTime(workflow.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum workflow criado</h3>
                <p className="text-white/60 mb-6 max-w-md">
                  Workflows permitem automatizar tarefas complexas coordenando múltiplos agents.
                  Crie seu primeiro workflow ou veja uma demonstração.
                </p>
                <div className="flex gap-3">
                  <GlassButton
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + Criar Workflow
                  </GlassButton>
                  <GlassButton variant="ghost" onClick={() => setActiveTab('demo')}>
                    Ver Demonstração
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'executions' ? (
          /* Executions Tab — Task Orchestration History */
          <div className="flex-1 overflow-auto p-6">
            {isLoadingTaskHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white/60 rounded-full" />
              </div>
            ) : taskHistoryData && taskHistoryData.tasks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-white/70">{taskHistoryData.tasks.length} orquestração(ões)</p>
                    {taskHistoryData.dbPersistence && (
                      <span className="px-2 py-0.5 text-[10px] bg-green-500/10 border border-green-500/20 rounded text-green-400">
                        DB Persistido
                      </span>
                    )}
                    {!taskHistoryData.dbPersistence && (
                      <span className="px-2 py-0.5 text-[10px] bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400">
                        Cache (sessão)
                      </span>
                    )}
                  </div>
                  <GlassButton variant="ghost" size="sm" onClick={() => refetchTaskHistory()}>
                    <RefreshIcon />
                    <span className="ml-1">Atualizar</span>
                  </GlassButton>
                </div>

                {/* Quick Metrics */}
                {(() => {
                  const tasks = taskHistoryData.tasks;
                  const completed = tasks.filter(t => t.status === 'completed').length;
                  const failed = tasks.filter(t => t.status === 'failed').length;
                  const successRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                  const totalTokens = tasks.reduce((s, t) => s + (t.totalTokens || 0), 0);
                  const avgDuration = completed > 0
                    ? Math.round(tasks.filter(t => t.status === 'completed' && t.totalDuration).reduce((s, t) => s + (t.totalDuration || 0), 0) / completed / 1000)
                    : 0;
                  const estimatedCost = (totalTokens / 1000000) * 3;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase text-white/40 mb-1">Total</p>
                        <p className="text-lg font-semibold text-white">{tasks.length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase text-white/40 mb-1">Taxa Sucesso</p>
                        <p className="text-lg font-semibold text-green-400">{successRate}%</p>
                        <p className="text-[10px] text-white/30">{completed} ok / {failed} fail</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase text-white/40 mb-1">Tempo Médio</p>
                        <p className="text-lg font-semibold text-white">{avgDuration > 0 ? formatDuration(avgDuration) : '—'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase text-white/40 mb-1">Tokens Total</p>
                        <p className="text-lg font-semibold text-white">{formatTokens(totalTokens)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase text-white/40 mb-1">Custo Est.</p>
                        <p className="text-lg font-semibold text-yellow-400">${estimatedCost.toFixed(4)}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Filters */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1 max-w-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Buscar por demanda..."
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                    {[
                      { value: 'all', label: 'Todos' },
                      { value: 'completed', label: 'Concluído' },
                      { value: 'executing', label: 'Executando' },
                      { value: 'failed', label: 'Falhou' },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setHistoryStatusFilter(f.value)}
                        className={cn(
                          'px-2.5 py-1 rounded text-xs font-medium transition-all',
                          historyStatusFilter === f.value
                            ? 'bg-white/10 text-white/90'
                            : 'text-white/40 hover:text-white/60'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {taskHistoryData.tasks
                    .filter(task => {
                      if (historyStatusFilter !== 'all' && task.status !== historyStatusFilter) return false;
                      if (historySearchQuery) {
                        const q = historySearchQuery.toLowerCase();
                        return task.demand.toLowerCase().includes(q) ||
                          task.id.toLowerCase().includes(q) ||
                          task.squads.some(s => s.squadId.toLowerCase().includes(q));
                      }
                      return true;
                    })
                    .map((task) => {
                    const totalAgents = task.squads.reduce((sum, s) => sum + s.agentCount, 0);
                    const squadNames = task.squads.map(s => s.squadId).join(', ');
                    const hasOutputs = task.outputs.some(o => (o.output.response || o.output.content || '').length > 0);
                    const durationMs = task.totalDuration || (
                      task.startedAt && task.completedAt
                        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
                        : 0
                    );

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 mr-3">
                            <h3 className="text-white font-medium truncate">{task.demand}</h3>
                            <p className="text-white/40 text-xs mt-1 font-mono">{task.id.slice(0, 8)}...</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant="status"
                              status={
                                task.status === 'completed' ? 'online' :
                                task.status === 'executing' ? 'warning' :
                                task.status === 'failed' ? 'error' : 'offline'
                              }
                              size="sm"
                            >
                              {task.status === 'completed' ? 'Concluído' :
                               task.status === 'executing' ? 'Executando' :
                               task.status === 'failed' ? 'Falhou' :
                               task.status === 'analyzing' ? 'Analisando' :
                               task.status === 'planning' ? 'Planejando' : 'Pendente'}
                            </Badge>
                            {(task.status === 'completed' || task.status === 'failed') && hasOutputs && (
                              <>
                                <GlassButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartReplay(task.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Assistir replay desta orquestração"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  <span className="ml-1">Replay</span>
                                </GlassButton>
                                <GlassButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportTask(task)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Exportar resultados em Markdown"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  <span className="ml-1">Export</span>
                                </GlassButton>
                                <GlassButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const ok = await copyTaskShareLink(task.id);
                                    if (ok) {
                                      setCopiedShareId(task.id);
                                      setTimeout(() => setCopiedShareId(null), 2000);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copiar link compartilhável"
                                >
                                  {copiedShareId === task.id ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                                      <polyline points="16 6 12 2 8 6" />
                                      <line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                  )}
                                  <span className="ml-1">{copiedShareId === task.id ? 'Copied!' : 'Share'}</span>
                                </GlassButton>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-white/50 flex-wrap">
                          {task.squads.length > 0 && (
                            <span>{task.squads.length} squad(s) · {totalAgents} agent(s)</span>
                          )}
                          {squadNames && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{squadNames}</span>
                            </>
                          )}
                          {task.startedAt && (
                            <>
                              <span>•</span>
                              <span>{formatRelativeTime(task.startedAt)}</span>
                            </>
                          )}
                          {durationMs > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(Math.floor(durationMs / 1000))}</span>
                            </>
                          )}
                          {task.totalTokens != null && task.totalTokens > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatTokens(task.totalTokens)} tokens</span>
                            </>
                          )}
                          {task.completedSteps != null && task.stepCount != null && (
                            <>
                              <span>•</span>
                              <span>{task.completedSteps}/{task.stepCount} steps</span>
                            </>
                          )}
                        </div>

                        {task.error && (
                          <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-xs truncate">{task.error}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60"><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Nenhuma orquestração registrada</h3>
                <p className="text-white/60 mb-6 max-w-md">
                  Execute uma orquestração para ver o histórico aqui. Clique em "Orquestrar" para começar.
                </p>
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    setOrchestrationDemand('');
                    setShowOrchestrationDialog(true);
                  }}
                  className="bg-gradient-to-r from-[#D1FF00]/20 to-[#0099FF]/20 border-[#D1FF00]/30"
                >
                  Orquestrar
                </GlassButton>
              </div>
            )}
          </div>
        ) : (
          /* Demo / Live Tab - visualization */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Operations Sidebar (hidden on mobile, shown on md+) */}
            <WorkflowSidebar
              mission={replayActive && taskReplay.state.mission ? taskReplay.state.mission : liveMissionActive && taskLiveMission.state.mission ? taskLiveMission.state.mission : mission}
              operations={replayActive ? taskReplay.state.operations : liveMissionActive ? taskLiveMission.state.operations : operations}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onViewMission={() => setShowMissionDetail(true)}
            />

            {/* Center: Canvas */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="h-auto md:h-12 px-3 md:px-4 py-2 md:py-0 flex flex-wrap items-center justify-between gap-2 border-b border-white/10">
                <div className="flex items-center gap-4">
                  {replayActive ? (
                    /* Replay indicator + controls */
                    <>
                      <div className="flex items-center gap-2 px-2 py-1 bg-[#0099FF]/10 border border-[#0099FF]/30 rounded-lg">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0099FF" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span className="text-xs font-medium text-[#0099FF]">
                          REPLAY {taskReplay.state.currentStep}/{taskReplay.state.totalSteps}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GlassButton
                          variant={taskReplay.state.isPlaying ? 'primary' : 'ghost'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => taskReplay.state.isPlaying ? taskReplay.pause() : taskReplay.play()}
                          aria-label={taskReplay.state.isPlaying ? 'Pausar' : 'Reproduzir'}
                        >
                          {taskReplay.state.isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </GlassButton>
                        <div className="flex gap-0.5 p-0.5 bg-white/5 rounded">
                          {[0.5, 1, 2, 4].map(s => (
                            <button
                              key={s}
                              onClick={() => taskReplay.setSpeed(s)}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium transition-all',
                                taskReplay.state.speed === s ? 'bg-[#0099FF]/20 text-[#0099FF]' : 'text-white/40 hover:text-white/60'
                              )}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="w-px h-5 bg-white/10" />
                      {/* Export buttons */}
                      {replayTaskData && (
                        <div className="flex items-center gap-1">
                          <GlassButton
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => exportTaskAsJSON(replayTaskData)}
                            aria-label="Exportar como JSON"
                            title="Exportar JSON"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            JSON
                          </GlassButton>
                          <GlassButton
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => exportTaskAsMarkdown(replayTaskData)}
                            aria-label="Exportar como Markdown"
                            title="Exportar Markdown"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            MD
                          </GlassButton>
                        </div>
                      )}
                      <GlassButton variant="ghost" size="sm" onClick={handleStopReplay} className="text-xs">
                        Sair do Replay
                      </GlassButton>
                    </>
                  ) : liveMissionActive ? (
                    /* Live mission indicator */
                    <>
                      <div className="flex items-center gap-2 px-2 py-1 bg-[#D1FF00]/10 border border-[#D1FF00]/30 rounded-lg">
                        <span className="relative flex h-2 w-2">
                          {taskLiveMission.state.isRunning && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D1FF00] opacity-75" />
                          )}
                          <span className={cn('relative inline-flex rounded-full h-2 w-2', taskLiveMission.state.isRunning ? 'bg-[#D1FF00]' : 'bg-white/40')} />
                        </span>
                        <span className="text-xs font-medium text-[#D1FF00]">
                          {taskLiveMission.state.isRunning ? 'LIVE' : 'Concluído'}
                        </span>
                      </div>
                      <GlassButton variant="ghost" size="sm" onClick={handleCloseLiveMission} className="text-xs">
                        Voltar ao Demo
                      </GlassButton>
                    </>
                  ) : (
                    /* Demo type selector */
                    <>
                      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                        <button
                          onClick={() => handleWorkflowTypeChange('simple')}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-all',
                            workflowType === 'simple'
                              ? 'bg-white/10 text-white/90'
                              : 'text-white/50 hover:text-white/70'
                          )}
                        >
                          Simples
                        </button>
                        <button
                          onClick={() => handleWorkflowTypeChange('complex')}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-all',
                            workflowType === 'complex'
                              ? 'bg-white/10 text-white/90'
                              : 'text-white/50 hover:text-white/70'
                          )}
                        >
                          Multi-Squad
                        </button>
                      </div>
                    </>
                  )}

                  <Badge
                    variant="status"
                    status={activeMissionData.status === 'in-progress' ? 'warning' : activeMissionData.status === 'error' ? 'error' : activeMissionData.status === 'queued' ? 'offline' : 'success'}
                  >
                    {activeMissionData.status === 'in-progress' ? 'Em execução' : activeMissionData.status === 'error' ? 'Erro' : activeMissionData.status === 'queued' ? 'Aguardando' : 'Concluído'}
                  </Badge>
                </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                <GlassButton
                  variant={viewMode === 'canvas' ? 'primary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('canvas')}
                  aria-label="Visualizacao em canvas"
                >
                  <GridIcon />
                </GlassButton>
                <GlassButton
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('list')}
                  aria-label="Visualizacao em lista"
                >
                  <ListIcon />
                </GlassButton>
              </div>

              <div className="w-px h-6 bg-white/10" />

              {/* Zoom Controls */}
              <GlassButton variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} aria-label="Diminuir zoom">
                <ZoomOutIcon />
              </GlassButton>
              <span className="text-xs text-white/60 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <GlassButton variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} aria-label="Aumentar zoom">
                <ZoomInIcon />
              </GlassButton>

              <div className="w-px h-6 bg-white/10" />

              {/* Play/Pause */}
              <GlassButton
                variant={isPlaying ? 'primary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </GlassButton>

              {/* Reset */}
              <GlassButton variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} aria-label="Reiniciar">
                <RefreshIcon />
              </GlassButton>

            </div>
          </div>

          {/* Replay Scrubber */}
          {replayActive && taskReplay.state.totalSteps > 0 && (
            <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {/* Step label */}
                <span className="text-[10px] text-white/40 min-w-[28px] text-right tabular-nums">
                  {taskReplay.state.currentStep}/{taskReplay.state.totalSteps}
                </span>

                {/* Scrubber slider */}
                <div className="flex-1 relative group">
                  <input
                    type="range"
                    min={0}
                    max={taskReplay.state.totalSteps}
                    value={taskReplay.state.currentStep}
                    onChange={(e) => taskReplay.seekTo(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0099FF] [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,153,255,0.5)]
                      [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125
                      [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-[#0099FF] [&::-moz-range-thumb]:border-0"
                    style={{
                      background: `linear-gradient(to right, #0099FF ${(taskReplay.state.currentStep / taskReplay.state.totalSteps) * 100}%, rgba(255,255,255,0.1) ${(taskReplay.state.currentStep / taskReplay.state.totalSteps) * 100}%)`,
                    }}
                    aria-label="Scrubber de replay"
                  />

                  {/* Step markers */}
                  <div className="absolute top-3 left-0 right-0 flex justify-between pointer-events-none">
                    {taskReplay.state.stepLabels.map((sl) => {
                      const pct = taskReplay.state.totalSteps > 0 ? (sl.index / taskReplay.state.totalSteps) * 100 : 0;
                      const isPast = sl.index < taskReplay.state.currentStep;
                      return (
                        <div
                          key={sl.index}
                          className="absolute"
                          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                        >
                          <div
                            className={cn(
                              'h-1 w-1 rounded-full',
                              isPast ? 'bg-[#0099FF]' : 'bg-white/20'
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current step label */}
                <span className="text-[10px] text-white/50 min-w-[120px] truncate">
                  {taskReplay.state.currentStep > 0 && taskReplay.state.currentStep <= taskReplay.state.stepLabels.length
                    ? taskReplay.state.stepLabels[taskReplay.state.currentStep - 1].label
                    : 'Início'}
                </span>
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden">
            {viewMode === 'canvas' ? (
              <WorkflowCanvas
                nodes={activeMissionData.nodes}
                edges={activeMissionData.edges}
                zoom={zoom}
                onZoomChange={setZoom}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <WorkflowListView
                mission={activeMissionData}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            )}
          </div>

          {/* Bottom Stats Bar */}
          {(() => {
            const m = activeMissionData;
            return (
          <div className="h-12 px-4 flex items-center justify-between border-t border-white/15 bg-white/5">
            <div className="flex items-center gap-6">
              <Stat label="Progresso Total" value={`${m.progress}%`} />
              <Stat label="Agents Ativos" value={m.agents.filter((a) => a.status === 'working').length.toString()} />
              <Stat label="Tempo Decorrido" value={formatRelativeTime(m.startedAt || '')} />
              {m.estimatedTimeRemaining != null && m.estimatedTimeRemaining > 0 && (
                <Stat
                  label="Tempo Restante"
                  value={formatDuration(m.estimatedTimeRemaining)}
                  icon={<ClockIcon />}
                />
              )}
              {m.tokens && (
                <Stat
                  label="Tokens"
                  value={formatTokens(m.tokens.total)}
                  icon={<TokenIcon />}
                  tooltip={`Input: ${formatTokens(m.tokens.input)} · Output: ${formatTokens(m.tokens.output)}`}
                />
              )}
              {liveMissionActive && taskLiveMission.state.taskId && (
                <Stat label="Task" value={taskLiveMission.state.taskId.slice(0, 8)} />
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Squad indicators */}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#999999]" />
                <span className="text-[10px] text-white/50">
                  {m.agents.filter(a => a.squadType === 'copywriting').length} Copy
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D1FF00]" />
                <span className="text-[10px] text-white/50">
                  {m.agents.filter(a => a.squadType === 'design').length} Design
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ED4609]" />
                <span className="text-[10px] text-white/50">
                  {m.agents.filter(a => a.squadType === 'creator').length} Creator
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D1FF00]" />
                <span className="text-[10px] text-white/50">
                  {m.agents.filter(a => a.squadType === 'orchestrator').length} Orch
                </span>
              </div>
            </div>
          </div>
            );
          })()}
        </div>

        {/* Right: Node Detail */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/15 overflow-hidden bg-white/5 backdrop-blur-xl"
            >
              <NodeDetailPanel
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Mission Detail Modal */}
      <AnimatePresence>
        {showMissionDetail && (
          <WorkflowMissionDetail
            mission={mission}
            onClose={() => setShowMissionDetail(false)}
          />
        )}
      </AnimatePresence>

      {/* Execute Workflow Dialog */}
      <ExecuteWorkflowDialog
        isOpen={showExecuteDialog}
        demandInput={demandInput}
        onDemandChange={setDemandInput}
        onExecute={handleExecuteWorkflow}
        onClose={() => setShowExecuteDialog(false)}
      />

      {/* Live Execution Modal */}
      <AnimatePresence>
        {showLiveExecution && liveExecutionState && (
          <WorkflowExecutionLive
            state={liveExecutionState}
            onClose={handleCloseLiveExecution}
          />
        )}
      </AnimatePresence>

      {/* Smart Orchestration Dialog */}
      <SmartOrchestrationDialog
        isOpen={showOrchestrationDialog}
        demand={orchestrationDemand}
        onDemandChange={setOrchestrationDemand}
        onStart={handleStartOrchestration}
        onClose={() => setShowOrchestrationDialog(false)}
      />

      {/* Smart Orchestration Live View */}
      <AnimatePresence>
        {showOrchestration && orchestrationState && (
          <WorkflowExecutionLive
            state={orchestrationState.executionState || {
              executionId: null,
              workflowId: orchestrationState.workflowId || '',
              workflowName: orchestrationState.workflowName || 'Analisando...',
              status: orchestrationState.phase === 'analyzing' || orchestrationState.phase === 'planning' ? 'connecting' : 'running',
              steps: [],
              input: { demand: orchestrationState.demand },
            }}
            onClose={handleCloseOrchestration}
            orchestrationPlan={orchestrationState.phase !== 'idle' ? {
              analysis: orchestrationState.analysis,
              expectedOutputs: orchestrationState.expectedOutputs,
              planSteps: orchestrationState.planSteps,
              phase: orchestrationState.phase,
            } : undefined}
          />
        )}
      </AnimatePresence>

      {/* Create Workflow Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleWorkflowCreated}
            isLoading={createWorkflowMutation.isPending}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stat({ label, value, icon, tooltip }: { label: string; value: string; icon?: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2 group relative" title={tooltip}>
      {icon && <span className="text-white/40">{icon}</span>}
      <span className="text-xs text-white/50">{label}:</span>
      <span className="text-sm text-white/90 font-medium">{value}</span>
    </div>
  );
}
