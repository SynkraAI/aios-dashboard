/**
 * Task Orchestrator Component - Demo-style Interface
 * Beautiful, intuitive, and interactive real-time workflow visualization
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Workflow,
  Zap,
  RotateCcw,
  Terminal,
  MessageSquare,
  GitBranch,
  History,
} from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { WorkflowCanvas } from '../workflow/WorkflowCanvas';
import { WorkflowExecutionSidebar } from '../workflow/WorkflowExecutionSidebar';
import { WorkflowExecutionDetails } from '../workflow/WorkflowExecutionDetails';
import { taskStateToMission } from '../../lib/taskStateToMission';
import { taskStateToLiveExecution } from '../../lib/taskStateToLiveExecution';
import { formatElapsedTime } from '../workflow/workflow-execution-helpers';
import { CheckIcon, XIcon, SpinnerIcon, ClockIcon, ZoomInIcon, ZoomOutIcon } from '../workflow/workflow-execution-icons';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import { useOrchestrationStore } from '../../stores/orchestrationStore';
import { useToastStore } from '../../stores/toastStore';
import { useChatStore } from '../../stores/chatStore';
import { formatOrchestrationSummary } from '../../lib/taskExport';
import { tasksApi } from '../../services/api/tasks';
import { supabaseTasksService } from '../../services/supabase/tasks';
import type { Task } from '../../services/api/tasks';
import type { TaskState, AgentOutput, StreamingOutput, ExecutionPlan } from './orchestration-types';
import { initialState } from './orchestration-types';
import { BackgroundParticles, LiveMetrics, PhaseProgress, SquadCard } from './OrchestrationWidgets';
import { AgentOutputCard } from './AgentOutputCard';
import { PlanApprovalCard } from './PlanApprovalCard';
import { EventsPanel, TaskHistoryPanel, TaskDetailView } from './OrchestrationPanels';
import { OrchestrationTemplates } from './OrchestrationTemplates';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Main component
export default function TaskOrchestrator() {
  const [state, setState] = useState<TaskState>(initialState);
  const [inputValue, setInputValue] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showEvents, setShowEvents] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<Task | null>(null);
  const [visualMode, setVisualMode] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  // Convert current TaskState to WorkflowMission for canvas visualization
  const liveMission = useMemo(() => taskStateToMission(state), [state]);

  // Convert TaskState to LiveExecutionState for reusing workflow execution components
  const liveExecState = useMemo(() => taskStateToLiveExecution(state), [state]);

  // Selected step for the details panel
  const selectedStep = useMemo(() => {
    if (!selectedNodeId || !liveExecState) return null;
    return liveExecState.steps.find(s => s.id === selectedNodeId) ?? null;
  }, [selectedNodeId, liveExecState]);

  // Elapsed time for canvas header
  const [canvasElapsed, setCanvasElapsed] = useState(0);

  const finalResult = useMemo(() =>
    state.agentOutputs.length > 0
      ? state.agentOutputs.filter((o) => o.role === 'reviewer').pop() ||
        state.agentOutputs[state.agentOutputs.length - 1]
      : null,
    [state.agentOutputs]
  );

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleNewTask = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setState(initialState);
    setInputValue('');
    setSelectedHistoryTask(null);
    setApprovalSubmitting(false);
  };

  const handleApprovePlan = async () => {
    if (!state.taskId) return;
    setApprovalSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/tasks/${state.taskId}/approve`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to approve plan');
    } catch (err) {
      console.error('Approve error:', err);
      setApprovalSubmitting(false);
    }
  };

  const handleRevisePlan = async (feedback: string) => {
    if (!state.taskId) return;
    setApprovalSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/tasks/${state.taskId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (!response.ok) throw new Error('Failed to revise plan');
      // Reset submitting when we get back to planning
      setState(prev => ({ ...prev, status: 'planning', plan: null }));
    } catch (err) {
      console.error('Revise error:', err);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleSelectHistoryTask = async (task: Task) => {
    let fullTask = task;
    if ((!task.outputs || task.outputs.length === 0) && task.status === 'completed') {
      try {
        fullTask = await tasksApi.getTask(task.id);
      } catch {
        // Use what we have
      }
    }
    setSelectedHistoryTask(fullTask);
    setShowHistory(false);
  };

  // Pick up orchestration demand from chat redirect
  useEffect(() => {
    const demand = sessionStorage.getItem('orchestration-demand');
    if (demand && state.status === 'idle') {
      sessionStorage.removeItem('orchestration-demand');
      setInputValue(demand);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Sync TaskState to orchestrationStore for ActivityPanel consumption
  useEffect(() => {
    const snapshot = state.status === 'idle' ? null : {
      taskId: state.taskId,
      status: state.status,
      demand: state.demand,
      squadSelections: state.squadSelections,
      agentOutputs: state.agentOutputs.map(o => ({
        stepId: o.stepId,
        stepName: o.stepName,
        agent: { id: o.agent.id, name: o.agent.name, squad: o.agent.squad },
        role: o.role,
        response: o.response,
        processingTimeMs: o.processingTimeMs,
        llmMetadata: o.llmMetadata,
      })),
      streamingAgents: Array.from(state.streamingOutputs.values()).map(s => ({
        agentId: s.agent.id,
        agentName: s.agent.name,
        squad: s.agent.squad,
        role: s.role,
      })),
      events: state.events.map(e => ({ event: e.event, timestamp: e.timestamp })),
      error: state.error,
      startTime: state.startTime,
    };
    useOrchestrationStore.getState().setLiveTask(snapshot);
  }, [state]);

  // Canvas elapsed time timer
  useEffect(() => {
    if ((state.status === 'executing' || state.status === 'analyzing' || state.status === 'planning' || state.status === 'awaiting_approval') && state.startTime) {
      queueMicrotask(() => setCanvasElapsed(Math.floor((Date.now() - state.startTime!) / 1000)));
      const interval = setInterval(() => {
        setCanvasElapsed(Math.floor((Date.now() - state.startTime!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.status, state.startTime]);

  const handleEventMessage = useCallback((event: MessageEvent, eventType: string) => {
    try {
      const data = JSON.parse(event.data);

      setState((prev) => {
        const newState = { ...prev };
        newState.events = [...prev.events, { event: eventType, data, timestamp: new Date().toISOString() }];

        switch (eventType) {
          case 'task:analyzing':
            newState.status = 'analyzing';
            break;
          case 'task:squads-selected':
            newState.selectedSquads = data.squads || [];
            break;
          case 'task:planning':
            newState.status = 'planning';
            break;
          case 'task:squad-planned':
            newState.squadSelections = [
              ...prev.squadSelections,
              {
                squadId: data.squadId,
                chief: data.chief,
                agentCount: data.agentCount,
                agents: data.agents || [],
              },
            ];
            break;
          case 'task:workflow-created':
            newState.workflowId = data.workflowId;
            newState.workflowSteps = data.steps || [];
            break;
          case 'task:plan-ready':
            newState.status = 'awaiting_approval';
            newState.plan = (data.plan as ExecutionPlan) || null;
            break;
          case 'task:executing':
            newState.status = 'executing';
            break;
          case 'step:started':
            newState.currentStep = data.stepId as string;
            break;
          case 'step:completed':
            if (data.output && (data.output as Record<string, unknown>).agent) {
              const output = data.output as Record<string, unknown>;
              const stepId = data.stepId as string;
              const alreadyExists = prev.agentOutputs.some((o) => o.stepId === stepId);

              if (!alreadyExists) {
                const agentOutput: AgentOutput = {
                  stepId,
                  stepName: (output.stepName as string) || 'Unknown',
                  agent: output.agent as AgentOutput['agent'],
                  role: (output.role as string) || 'specialist',
                  response: (output.response as string) || '',
                  processingTimeMs: (output.processingTimeMs as number) || 0,
                  llmMetadata: output.llmMetadata as AgentOutput['llmMetadata'],
                };
                newState.agentOutputs = [...prev.agentOutputs, agentOutput];
              }

              const newStreamingOutputs = new Map(prev.streamingOutputs);
              newStreamingOutputs.delete(stepId);
              newState.streamingOutputs = newStreamingOutputs;
            }
            break;

          case 'step:streaming:start': {
            const stepId = data.stepId as string;
            const streamingOutput: StreamingOutput = {
              stepId,
              stepName: data.stepName as string,
              agent: data.agent as StreamingOutput['agent'],
              role: data.role as string,
              accumulated: '',
              startedAt: Date.now(),
            };
            const newStreamingOutputs = new Map(prev.streamingOutputs);
            newStreamingOutputs.set(stepId, streamingOutput);
            newState.streamingOutputs = newStreamingOutputs;
            break;
          }

          case 'step:streaming:chunk': {
            const stepId = data.stepId as string;
            const existing = prev.streamingOutputs.get(stepId);
            if (existing) {
              const newStreamingOutputs = new Map(prev.streamingOutputs);
              newStreamingOutputs.set(stepId, {
                ...existing,
                accumulated: data.accumulated as string,
              });
              newState.streamingOutputs = newStreamingOutputs;
            }
            break;
          }

          case 'step:streaming:end': {
            const stepId = data.stepId as string;
            const streaming = prev.streamingOutputs.get(stepId);

            const agentOutput: AgentOutput = {
              stepId,
              stepName: (data.stepName as string) || streaming?.stepName || 'Unknown',
              agent: (data.agent as AgentOutput['agent']) || (streaming?.agent as AgentOutput['agent']),
              role: (data.role as string) || streaming?.role || 'specialist',
              response: (data.response as string) || streaming?.accumulated || '',
              processingTimeMs: streaming ? Date.now() - streaming.startedAt : 0,
              llmMetadata: data.llmMetadata as AgentOutput['llmMetadata'],
            };

            newState.agentOutputs = [...prev.agentOutputs, agentOutput];

            const newStreamingOutputs = new Map(prev.streamingOutputs);
            newStreamingOutputs.delete(stepId);
            newState.streamingOutputs = newStreamingOutputs;
            break;
          }

          case 'task:completed':
            newState.status = 'completed';
            newState.streamingOutputs = new Map();
            // Defer side effects to avoid setState-in-render warning
            queueMicrotask(() => {
              // Auto-switch to Outputs view so user can see the result
              setVisualMode(false);
              setSelectedNodeId(null);
              // Persist to Supabase in background
              if (newState.taskId) {
                const taskToSave: Task = {
                  id: newState.taskId,
                  demand: newState.demand,
                  status: 'completed',
                  squads: newState.squadSelections,
                  workflow: newState.workflowId ? { id: newState.workflowId, name: 'Workflow', stepCount: newState.workflowSteps.length } : null,
                  outputs: newState.agentOutputs.map(o => ({
                    stepId: o.stepId,
                    stepName: o.stepName,
                    output: { response: o.response, agent: o.agent, role: o.role, processingTimeMs: o.processingTimeMs, llmMetadata: o.llmMetadata },
                  })),
                  createdAt: newState.startTime ? new Date(newState.startTime).toISOString() : new Date().toISOString(),
                  startedAt: newState.startTime ? new Date(newState.startTime).toISOString() : undefined,
                  completedAt: new Date().toISOString(),
                  totalTokens: newState.agentOutputs.reduce((s, o) => s + (o.llmMetadata?.inputTokens || 0) + (o.llmMetadata?.outputTokens || 0), 0) || undefined,
                  totalDuration: newState.startTime ? Date.now() - newState.startTime : undefined,
                  stepCount: newState.workflowSteps.length || undefined,
                  completedSteps: newState.agentOutputs.length || undefined,
                };
                supabaseTasksService.persistCompletedTask(taskToSave).catch(() => {});
              }
              // Notify user (badge + toast when not on bob view)
              const orchStore = useOrchestrationStore.getState();
              orchStore.addNotification({ taskId: newState.taskId || '', demand: newState.demand, status: 'completed' });
              if (useUIStore.getState().currentView !== 'bob') {
                const demandPreview = newState.demand.length > 60 ? newState.demand.slice(0, 60) + '...' : newState.demand;
                useToastStore.getState().addToast({
                  type: 'success',
                  title: 'Orquestração concluída',
                  message: demandPreview,
                  duration: 8000,
                  action: { label: 'Ver resultado', onClick: () => useUIStore.getState().setCurrentView('bob') },
                });
              }
              // Inject summary back into originating chat session
              const sourceSession = sessionStorage.getItem('orchestration-source-session');
              if (sourceSession) {
                sessionStorage.removeItem('orchestration-source-session');
                const summary = formatOrchestrationSummary({
                  demand: newState.demand,
                  status: 'completed',
                  squadSelections: newState.squadSelections,
                  agentOutputs: newState.agentOutputs,
                  startTime: newState.startTime,
                });
                useChatStore.getState().addMessage(sourceSession, {
                  role: 'agent',
                  agentId: 'bob',
                  agentName: 'Bob (Orchestrator)',
                  squadId: 'orchestrator',
                  squadType: 'orchestrator' as import('../../types').SquadType,
                  content: summary,
                  metadata: {
                    orchestrationId: newState.taskId,
                    orchestrationStatus: 'completed',
                    stepCount: newState.agentOutputs.length,
                    duration: newState.startTime ? Date.now() - newState.startTime : undefined,
                  },
                });
              }
            });
            break;
          case 'task:failed':
            newState.status = 'failed';
            newState.error = data.error as string;
            // Defer side effects to avoid setState-in-render warning
            queueMicrotask(() => {
              // Persist failed task to Supabase
              if (newState.taskId) {
                supabaseTasksService.upsertTask({
                  id: newState.taskId,
                  demand: newState.demand,
                  status: 'failed',
                  squads: newState.squadSelections,
                  workflow: null,
                  outputs: [],
                  createdAt: newState.startTime ? new Date(newState.startTime).toISOString() : new Date().toISOString(),
                  error: data.error as string,
                }).catch(() => {});
              }
              // Notify user (badge + toast when not on bob view)
              const orchStore = useOrchestrationStore.getState();
              orchStore.addNotification({ taskId: newState.taskId || '', demand: newState.demand, status: 'failed' });
              if (useUIStore.getState().currentView !== 'bob') {
                const demandPreview = newState.demand.length > 60 ? newState.demand.slice(0, 60) + '...' : newState.demand;
                useToastStore.getState().addToast({
                  type: 'error',
                  title: 'Orquestração falhou',
                  message: demandPreview,
                  duration: 8000,
                  action: { label: 'Ver detalhes', onClick: () => useUIStore.getState().setCurrentView('bob') },
                });
              }
              // Inject error summary back into originating chat session
              const sourceSession = sessionStorage.getItem('orchestration-source-session');
              if (sourceSession) {
                sessionStorage.removeItem('orchestration-source-session');
                const summary = formatOrchestrationSummary({
                  demand: newState.demand,
                  status: 'failed',
                  squadSelections: newState.squadSelections,
                  agentOutputs: [],
                  startTime: newState.startTime,
                  error: data.error as string,
                });
                useChatStore.getState().addMessage(sourceSession, {
                  role: 'agent',
                  agentId: 'bob',
                  agentName: 'Bob (Orchestrator)',
                  squadId: 'orchestrator',
                  squadType: 'orchestrator' as import('../../types').SquadType,
                  content: summary,
                  metadata: {
                    orchestrationId: newState.taskId,
                    orchestrationStatus: 'failed',
                    error: data.error as string,
                  },
                });
              }
            });
            break;
        }

        return newState;
      });
    } catch (err) {
      console.error('Error parsing event:', err);
    }
  }, []);

  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectToSSE = useCallback(
    (taskId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const eventSource = new EventSource(`${API_BASE}/tasks/${taskId}/stream`);
      eventSourceRef.current = eventSource;

      const events = [
        'task:state',
        'task:analyzing',
        'task:squads-selected',
        'task:planning',
        'task:plan-ready',
        'task:squad-planned',
        'task:workflow-created',
        'task:executing',
        'step:started',
        'step:completed',
        'step:streaming:start',
        'step:streaming:chunk',
        'step:streaming:end',
        'task:completed',
        'task:failed',
      ];

      // On successful connection, reset backoff counter
      eventSource.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      events.forEach((eventType) => {
        eventSource.addEventListener(eventType, (e) => handleEventMessage(e, eventType));
      });

      eventSource.onerror = () => {
        eventSource.close();

        // Only reconnect if task is still running
        setState((prev) => {
          const isTerminal = prev.status === 'completed' || prev.status === 'failed' || prev.status === 'idle';
          if (!isTerminal && prev.taskId) {
            const attempt = reconnectAttemptRef.current;
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
            reconnectAttemptRef.current = attempt + 1;

            reconnectTimerRef.current = setTimeout(() => {
              connectToSSE(prev.taskId!);
            }, delay);
          }
          return prev;
        });
      };
    },
    [handleEventMessage]
  );

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    useOrchestrationStore.getState().setRunning(true);

    setState({
      ...initialState,
      status: 'analyzing',
      demand: inputValue,
      startTime: Date.now(),
    });

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demand: inputValue }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const data = await response.json();
      setState((prev) => ({ ...prev, taskId: data.taskId }));
      connectToSSE(data.taskId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  };

  const isRunning = ['analyzing', 'planning', 'executing'].includes(state.status);
  const isAwaitingApproval = state.status === 'awaiting_approval';

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated background */}
      {isRunning && <BackgroundParticles />}

      {/* Header */}
      <div className="relative z-10 p-4 md:p-6 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <motion.div
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0"
              animate={isRunning ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Workflow className="w-5 h-5 md:w-7 md:h-7 text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-white">Orquestrador de Tarefas</h1>
              <p className="text-xs md:text-sm text-white/50 hidden sm:block">Visualização em tempo real do fluxo de execução</p>
            </div>
          </div>

          {isRunning && <LiveMetrics state={state} />}

          {isAwaitingApproval && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Aguardando Aprovação
              </span>
            </motion.div>
          )}

          {state.status === 'completed' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3">
              <LiveMetrics state={state} />
              <GlassButton onClick={handleNewTask} className="px-4 py-2">
                <RotateCcw className="w-4 h-4 mr-2" />
                Nova Tarefa
              </GlassButton>
            </motion.div>
          )}

          {/* View mode toggles + cross-link */}
          {state.status !== 'idle' && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                <button
                  onClick={() => setVisualMode(false)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    !visualMode ? 'bg-white/10 text-white/90' : 'text-white/50 hover:text-white/70'
                  }`}
                  aria-label="Modo lista"
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Outputs
                </button>
                <button
                  onClick={() => setVisualMode(true)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    visualMode ? 'bg-white/10 text-white/90' : 'text-white/50 hover:text-white/70'
                  }`}
                  aria-label="Modo visual"
                >
                  <GitBranch className="w-3.5 h-3.5 inline mr-1" />
                  Canvas
                </button>
              </div>
              {/* Workflows view is accessible from the sidebar menu */}
            </div>
          )}
        </div>

        {/* Phase Progress */}
        {state.status !== 'idle' && <PhaseProgress currentStatus={state.status} />}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel - Input & Squads / History */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col gap-4 md:gap-6 overflow-auto md:max-h-none max-h-[40vh] md:max-h-full flex-shrink-0">
          <AnimatePresence mode="wait">
            {showHistory ? (
              <TaskHistoryPanel
                key="history"
                visible={showHistory}
                onSelectTask={handleSelectHistoryTask}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6 flex-1"
              >
                {/* Input */}
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">Sua Demanda</label>
                  <div className="relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Descreva o que você precisa..."
                      className="w-full h-24 md:h-32 bg-white/5 border border-white/10 rounded-xl px-3 md:px-4 py-3 text-sm md:text-base text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      disabled={isRunning}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                    <motion.div
                      className="absolute bottom-3 right-3"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <GlassButton
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || isRunning}
                        className="px-4 py-2"
                      >
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Executar
                          </>
                        )}
                      </GlassButton>
                    </motion.div>
                  </div>
                </div>

                {/* Selected Squads */}
                {state.squadSelections.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-sm font-medium text-white/70">Squads Ativados</h2>
                    </div>
                    <div className="space-y-3">
                      {state.squadSelections.map((selection) => (
                        <SquadCard
                          key={selection.squadId}
                          selection={selection}
                          isActive={state.status === 'executing'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom actions */}
                <div className="mt-auto space-y-2">
                  {/* History toggle */}
                  <button
                    onClick={() => { setShowHistory(true); setSelectedHistoryTask(null); }}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    Histórico de Orquestrações
                  </button>

                  {/* Events Toggle */}
                  {state.status !== 'idle' && (
                    <button
                      onClick={() => setShowEvents(!showEvents)}
                      className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <Terminal className="w-4 h-4" />
                      {showEvents ? 'Ocultar' : 'Mostrar'} Eventos
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
                        {state.events.length}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center Panel - Agent Outputs / Canvas / History Detail */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {selectedHistoryTask ? (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <TaskDetailView
                task={selectedHistoryTask}
                onBack={() => { setSelectedHistoryTask(null); setShowHistory(true); }}
                onCopy={(text, index) => handleCopy(text, index)}
                copiedIndex={copiedIndex}
              />
            </div>
          ) : isAwaitingApproval && state.plan ? (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="max-w-2xl mx-auto">
                <PlanApprovalCard
                  plan={state.plan}
                  demand={state.demand}
                  onApprove={handleApprovePlan}
                  onRevise={handleRevisePlan}
                  isSubmitting={approvalSubmitting}
                />
              </div>
            </div>
          ) : state.status === 'idle' ? (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="flex flex-col items-center justify-start pt-8 md:pt-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-md px-4 mb-8"
                >
                  <motion.div
                    className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-6 md:mb-8 rounded-2xl md:rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center border border-cyan-500/20"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Sparkles className="w-16 h-16 text-cyan-400/50" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-3">Pronto para Orquestrar</h2>
                  <p className="text-white/50 leading-relaxed">
                    Digite sua demanda e observe o orquestrador master selecionar squads, delegar para chiefs, e
                    coordenar a execução dos agentes especialistas em tempo real.
                  </p>
                </motion.div>

                {/* Orchestration Templates */}
                <OrchestrationTemplates onSelect={(demand) => setInputValue(demand)} />
              </div>
            </div>
          ) : visualMode && liveMission && liveExecState ? (
            /* Canvas visualization mode — full WorkflowExecutionLive layout */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Canvas Header */}
              <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    (state.status === 'executing' || state.status === 'analyzing' || state.status === 'planning') && 'bg-[rgba(209,255,0,0.08)]',
                    state.status === 'awaiting_approval' && 'bg-yellow-500/10',
                    state.status === 'completed' && 'bg-[rgba(209,255,0,0.06)]',
                    state.status === 'failed' && 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
                  )}>
                    {(state.status === 'analyzing' || state.status === 'planning' || state.status === 'executing') && (
                      <SpinnerIcon size={18} />
                    )}
                    {state.status === 'awaiting_approval' && (
                      <span className="text-yellow-400"><ClockIcon size={18} /></span>
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
                      {liveExecState.workflowName || 'Orquestração'}
                    </h2>
                    <p className="text-xs text-white/50">
                      {state.status === 'analyzing' && 'Analisando demanda...'}
                      {state.status === 'planning' && 'Planejando execução...'}
                      {state.status === 'awaiting_approval' && 'Plano pronto — aguardando sua aprovação'}
                      {state.status === 'executing' && `Executando ${liveExecState.steps.filter(s => s.status === 'running').length > 0 ? `· ${liveExecState.steps.filter(s => s.status === 'running').length} step(s) ativos` : ''}`}
                      {state.status === 'completed' && 'Todos os steps foram concluídos com sucesso'}
                      {state.status === 'failed' && 'A execução encontrou um erro'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Timer */}
                  {(state.status === 'executing' || state.status === 'analyzing' || state.status === 'planning') && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                      <ClockIcon size={14} />
                      <span className="text-sm font-mono text-white/80">{formatElapsedTime(canvasElapsed)}</span>
                    </div>
                  )}
                  {/* Zoom */}
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))}
                      className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      aria-label="Diminuir zoom"
                    >
                      <ZoomOutIcon />
                    </button>
                    <span className="text-xs text-white/60 w-10 text-center">{Math.round(canvasZoom * 100)}%</span>
                    <button
                      onClick={() => setCanvasZoom(z => Math.min(1.5, z + 0.1))}
                      className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      aria-label="Aumentar zoom"
                    >
                      <ZoomInIcon />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {(() => {
                const completedSteps = liveExecState.steps.filter(s => s.status === 'completed').length;
                const totalSteps = Math.max(liveExecState.steps.length, 1);
                const progressPct = state.status === 'completed' ? 100
                  : state.status === 'analyzing' ? 10
                  : state.status === 'planning' ? 25
                  : totalSteps > 0 ? (completedSteps / totalSteps) * 100
                  : 0;
                return (
                  <div className="h-1 bg-[rgb(0_0_0/0.3)] flex-shrink-0">
                    <motion.div
                      className={cn('h-full', state.status === 'failed' && 'bg-gradient-to-r from-red-500 to-rose-500')}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.3 }}
                      style={{
                        ...(state.status !== 'failed' ? { background: 'linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' } : {}),
                        boxShadow: state.status !== 'failed' ? '0 0 10px rgba(209, 255, 0, 0.3)' : '0 0 10px rgba(239, 68, 68, 0.5)',
                      }}
                    />
                  </div>
                );
              })()}

              {/* Main Canvas Area: Left Sidebar + Canvas + Right Details */}
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR — Execution context */}
                <WorkflowExecutionSidebar
                  state={liveExecState}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  completedSteps={liveExecState.steps.filter(s => s.status === 'completed').length}
                  runningSteps={liveExecState.steps.filter(s => s.status === 'running').length}
                  pendingSteps={liveExecState.steps.filter(s => s.status === 'pending').length}
                  totalSteps={liveExecState.steps.length}
                  progress={state.status === 'completed' ? 100 : liveExecState.steps.length > 0 ? (liveExecState.steps.filter(s => s.status === 'completed').length / liveExecState.steps.length) * 100 : 0}
                />

                {/* CENTER — Canvas */}
                <div className="flex-1 relative">
                  <WorkflowCanvas
                    nodes={liveMission.nodes}
                    edges={liveMission.edges}
                    zoom={canvasZoom}
                    onZoomChange={setCanvasZoom}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                </div>

                {/* RIGHT SIDEBAR — Node Details */}
                <WorkflowExecutionDetails
                  state={liveExecState}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  selectedStep={selectedStep}
                  copiedText={copiedIndex === -999 ? '__copied__' : null}
                  handleCopy={(text) => handleCopy(text, -999)}
                />
              </div>

              {/* Footer — Result Summary */}
              {(state.status === 'completed' || state.status === 'failed') && (
                <div className={cn(
                  'border-t border-white/10 p-4 flex items-center justify-between flex-shrink-0',
                  state.status === 'completed' && 'bg-[rgba(209,255,0,0.06)]',
                  state.status === 'failed' && 'bg-gradient-to-r from-red-500/10 to-transparent',
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
                        className={cn('font-semibold', state.status !== 'completed' && 'text-red-400')}
                        style={state.status === 'completed' ? { color: 'color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent)' } : undefined}
                      >
                        {state.status === 'completed' ? 'Execução Concluída!' : 'Execução Falhou'}
                      </p>
                      <p className="text-xs text-white/50">
                        {state.agentOutputs.length} step(s) · {canvasElapsed > 0 ? formatElapsedTime(canvasElapsed) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassButton variant="ghost" size="sm" onClick={() => { setSelectedNodeId(null); setVisualMode(false); }}>
                      Ver Outputs
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="space-y-4">
                {/* Streaming outputs first */}
                {Array.from(state.streamingOutputs.values()).map((streaming, index) => (
                  <AgentOutputCard
                    key={`streaming-${streaming.stepId}`}
                    streaming={streaming}
                    index={index}
                    isReviewer={false}
                    onCopy={(text) => handleCopy(text, -100 - index)}
                    copied={copiedIndex === -100 - index}
                  />
                ))}

                {/* Completed outputs */}
                {state.agentOutputs.map((output, index) => (
                  <AgentOutputCard
                    key={output.stepId}
                    output={output}
                    index={index}
                    isReviewer={state.status === 'completed' && output === finalResult}
                    onCopy={(text) => handleCopy(text, index)}
                    copied={copiedIndex === index}
                  />
                ))}

                {/* Completion message */}
                {state.status === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-center"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-white mb-2">Tarefa Concluída!</h2>
                    <p className="text-white/60">
                      {state.agentOutputs.length} agentes executados com sucesso
                    </p>
                  </motion.div>
                )}

                {/* Error message */}
                {state.status === 'failed' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 text-center"
                  >
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-white mb-2">Erro na Execução</h2>
                    <p className="text-white/60">{state.error}</p>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Events (hidden on mobile) */}
        <AnimatePresence>
          {showEvents && state.status !== 'idle' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 p-4 md:p-6 overflow-hidden hidden md:block"
            >
              <EventsPanel events={state.events} isActive={isRunning} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
