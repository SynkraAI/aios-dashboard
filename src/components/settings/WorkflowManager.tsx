import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard, GlassButton, GlassInput, Badge } from '../ui';
import { apiClient } from '../../services/api/client';
import { useToast } from '../ui/Toast';
import { cn, getSquadTheme, squadThemes } from '../../lib/utils';
import { getSquadType, type SquadType } from '../../types';

// Icons
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronDownIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={cn('transition-transform duration-200', expanded && 'rotate-180')}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const WorkflowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="6" cy="19" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="12" y1="12" x2="6" y2="16" />
    <line x1="12" y1="12" x2="18" y2="16" />
  </svg>
);

const StepIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  handler: string;
  dependsOn?: string[];
  config?: {
    squadId?: string;
    agentId?: string;
    role?: string;
    message?: string;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  trigger: { type: string };
  stepCount?: number;
  steps?: WorkflowStep[];
  input?: {
    schema?: Record<string, unknown>;
  };
  output?: {
    expected?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface NewStepForm {
  id: string;
  name: string;
  squadId: string;
  agentId: string;
  role: string;
  message: string;
  dependsOn: string[];
}

interface Squad {
  id: string;
  name: string;
  agentCount: number;
}

interface Agent {
  id: string;
  name: string;
  squad: string;
  tier: number;
}

// Get colors for different squad types from centralized theme
const getStepColors = (squadId: string): string => {
  const squadType = getSquadType(squadId);
  const theme = getSquadTheme(squadType);
  return `${theme.bgSubtle} ${theme.borderSubtle} ${theme.textMuted}`;
};

export function WorkflowManager() {
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  // Fetch workflows list
  const { data: workflowsData, isLoading, refetch } = useQuery<{ workflows: Workflow[]; total: number }>({
    queryKey: ['workflows'],
    queryFn: async () => {
      try {
        return await apiClient.get<{ workflows: Workflow[]; total: number }>('/workflows');
      } catch {
        return { workflows: [], total: 0 };
      }
    },
    staleTime: 60000,
  });

  // Fetch workflow details when expanded
  const { data: workflowDetails } = useQuery<Workflow | null>({
    queryKey: ['workflow-details', expandedWorkflow],
    queryFn: async (): Promise<Workflow | null> => {
      if (!expandedWorkflow) return null;
      return await apiClient.get<Workflow>(`/workflows/${expandedWorkflow}`);
    },
    enabled: !!expandedWorkflow,
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflow: {
      name: string;
      description: string;
      steps: Array<{
        id: string;
        type: string;
        name: string;
        handler: string;
        config: {
          squadId: string;
          agentId: string;
          role: string;
          message: string;
        };
        dependsOn?: string[];
      }>;
    }) => {
      return await apiClient.post('/workflows', {
        ...workflow,
        trigger: { type: 'manual' },
        version: '1.0.0',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreateModal(false);
      success('Workflow criado', 'O workflow foi criado com sucesso');
    },
    onError: (err: Error) => {
      showError('Erro ao criar workflow', err.message);
    },
  });

  const workflows = workflowsData?.workflows || [];

  const toggleWorkflow = (workflowId: string) => {
    setExpandedWorkflow(prev => prev === workflowId ? null : workflowId);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="text-center py-3">
          <div className="text-2xl font-bold text-amber-500">{workflows.length}</div>
          <p className="text-xs text-tertiary">Workflows</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <div className="text-2xl font-bold text-green-500">
            {workflows.filter(w => w.status === 'active').length}
          </div>
          <p className="text-xs text-tertiary">Ativos</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <div className="text-2xl font-bold text-blue-500">
            {workflows.reduce((sum, w) => sum + (w.stepCount || 0), 0)}
          </div>
          <p className="text-xs text-tertiary">Total de Steps</p>
        </GlassCard>
      </div>

      {/* Workflows List */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Workflows Disponíveis</h2>
          <div className="flex items-center gap-2">
            <GlassButton variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <PlusIcon />
              <span className="ml-1">Criar Workflow</span>
            </GlassButton>
            <GlassButton variant="ghost" size="icon" onClick={() => refetch()} title="Atualizar" aria-label="Atualizar">
              <RefreshIcon />
            </GlassButton>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-tertiary">Carregando workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <WorkflowIcon />
            <p className="mt-2">Nenhum workflow encontrado</p>
            <p className="text-xs mt-1">Clique em "Criar Workflow" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => {
              const isExpanded = expandedWorkflow === workflow.id;
              const details: Workflow | null | undefined = isExpanded ? workflowDetails : null;

              return (
                <div
                  key={workflow.id}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Workflow Header */}
                  <button
                    onClick={() => toggleWorkflow(workflow.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <WorkflowIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-primary font-medium">{workflow.name}</h3>
                        <Badge
                          variant="status"
                          status={workflow.status === 'active' ? 'online' : 'offline'}
                          size="sm"
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-tertiary truncate">{workflow.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-primary">{workflow.stepCount} steps</p>
                        <p className="text-xs text-tertiary">v{workflow.version}</p>
                      </div>
                      <ChevronDownIcon expanded={isExpanded} />
                    </div>
                  </button>

                  {/* Workflow Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 space-y-4">
                          {/* Workflow Visual */}
                          {details?.steps && (
                            <WorkflowVisualizer steps={details.steps} />
                          )}

                          {/* Expected Output */}
                          {details?.output?.expected && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-secondary mb-2">Outputs Esperados:</h4>
                              <ul className="space-y-1">
                                {details.output.expected.map((output: string, idx: number) => (
                                  <li key={idx} className="text-xs text-tertiary flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">{'\u2713'}</span>
                                    {output}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <GlassButton variant="primary" size="sm" className="flex-1">
                              <PlayIcon />
                              <span className="ml-1">Executar</span>
                            </GlassButton>
                            <GlassButton variant="ghost" size="sm">
                              Editar
                            </GlassButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Create Workflow Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={(data) => createWorkflowMutation.mutate(data)}
            isLoading={createWorkflowMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Create Workflow Modal
export function CreateWorkflowModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      type: string;
      name: string;
      handler: string;
      config: {
        squadId: string;
        agentId: string;
        role: string;
        message: string;
      };
      dependsOn?: string[];
    }>;
  }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<NewStepForm[]>([]);

  // Fetch squads for dropdown
  const { data: squadsData } = useQuery<{ data: Squad[] }>({
    queryKey: ['squads-list'],
    queryFn: async () => {
      try {
        return await apiClient.get<{ data: Squad[] }>('/squads');
      } catch {
        return { data: [] };
      }
    },
  });

  // Fetch agents for dropdown
  const { data: agentsData } = useQuery<{ data: Agent[] }>({
    queryKey: ['agents-list'],
    queryFn: async () => {
      try {
        return await apiClient.get<{ data: Agent[] }>('/agents');
      } catch {
        return { data: [] };
      }
    },
  });

  const squads = squadsData?.data || [];
  const agents = agentsData?.data || [];

  const addStep = () => {
    const newStep: NewStepForm = {
      id: `step-${Date.now()}`,
      name: '',
      squadId: '',
      agentId: '',
      role: '',
      message: '{{demand}}',
      dependsOn: [],
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof NewStepForm, value: string | string[]) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };

    // If squad changed, reset agent
    if (field === 'squadId') {
      newSteps[index].agentId = '';
    }

    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const removedStepId = steps[index].id;
    const newSteps = steps.filter((_, i) => i !== index);
    // Remove dependencies to this step
    newSteps.forEach((step, i) => {
      if (step.dependsOn.includes(removedStepId)) {
        newSteps[i].dependsOn = step.dependsOn.filter(id => id !== removedStepId);
      }
    });
    setSteps(newSteps);
  };

  const handleSubmit = () => {
    if (!name || steps.length === 0) return;

    const formattedSteps = steps.map((step, index) => ({
      id: step.id,
      type: 'agent',
      name: step.name || `Step ${index + 1}`,
      handler: 'agent:execute',
      config: {
        squadId: step.squadId,
        agentId: step.agentId,
        role: step.role,
        message: step.message,
      },
      dependsOn: step.dependsOn.length > 0 ? step.dependsOn : undefined,
    }));

    onSubmit({
      name,
      description,
      steps: formattedSteps,
    });
  };

  const getAgentsForSquad = (squadId: string) => {
    return agents.filter(a => a.squad === squadId);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[rgb(0_0_0/0.9)] z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto">
        <GlassCard className="flex flex-col max-h-[90vh] !bg-gray-900 border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-primary">Criar Novo Workflow</h2>
              <p className="text-xs text-tertiary">Configure os steps e agents do workflow</p>
            </div>
            <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <CloseIcon />
            </GlassButton>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto glass-scrollbar py-4 space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-secondary mb-1.5">Nome do Workflow</label>
                <GlassInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Criação de Campanha"
                />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1.5">Descrição</label>
                <GlassInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo do workflow"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-secondary">Steps</label>
                <GlassButton variant="ghost" size="sm" onClick={addStep}>
                  <PlusIcon />
                  <span className="ml-1">Adicionar Step</span>
                </GlassButton>
              </div>

              {steps.length === 0 ? (
                <div className="text-center py-6 rounded-xl border border-dashed border-white/20">
                  <p className="text-sm text-tertiary">Nenhum step adicionado</p>
                  <p className="text-xs text-tertiary mt-1">Clique em "Adicionar Step" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">Step {index + 1}</span>
                        <GlassButton
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(index)}
                          className="text-red-400 hover:bg-red-500/10 h-7 w-7"
                          aria-label="Remover step"
                        >
                          <TrashIcon />
                        </GlassButton>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-tertiary mb-1">Nome</label>
                          <GlassInput
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            placeholder="Nome do step"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-tertiary mb-1">Role</label>
                          <GlassInput
                            value={step.role}
                            onChange={(e) => updateStep(index, 'role', e.target.value)}
                            placeholder="Ex: Estrategista"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-tertiary mb-1">Squad</label>
                          <select
                            value={step.squadId}
                            onChange={(e) => updateStep(index, 'squadId', e.target.value)}
                            className="w-full p-2.5 rounded-xl text-sm border border-white/10 bg-[#1a1a1a] text-white appearance-none cursor-pointer"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                          >
                            <option value="">Selecione um squad</option>
                            {squads.map(squad => (
                              <option key={squad.id} value={squad.id}>
                                {squad.name} ({squad.agentCount} agents)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-tertiary mb-1">Agent</label>
                          <select
                            value={step.agentId}
                            onChange={(e) => updateStep(index, 'agentId', e.target.value)}
                            className="w-full p-2.5 rounded-xl text-sm border border-white/10 bg-[#1a1a1a] text-white appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                            disabled={!step.squadId}
                          >
                            <option value="">Selecione um agent</option>
                            {getAgentsForSquad(step.squadId).map(agent => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-tertiary mb-1">
                          Mensagem <span className="text-blue-400">(use {'{{demand}}'} para a demanda)</span>
                        </label>
                        <GlassInput
                          value={step.message}
                          onChange={(e) => updateStep(index, 'message', e.target.value)}
                          placeholder="{{demand}}"
                        />
                      </div>

                      {index > 0 && (
                        <div>
                          <label className="block text-xs text-tertiary mb-1">Depende de</label>
                          <div className="flex flex-wrap gap-2">
                            {steps.slice(0, index).map((prevStep, prevIndex) => (
                              <button
                                key={prevStep.id}
                                onClick={() => {
                                  const deps = step.dependsOn.includes(prevStep.id)
                                    ? step.dependsOn.filter(d => d !== prevStep.id)
                                    : [...step.dependsOn, prevStep.id];
                                  updateStep(index, 'dependsOn', deps);
                                }}
                                className={cn(
                                  'px-2 py-1 rounded-lg text-xs border transition-colors',
                                  step.dependsOn.includes(prevStep.id)
                                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                    : 'bg-white/5 border-white/10 text-tertiary hover:text-primary'
                                )}
                              >
                                Step {prevIndex + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <GlassButton variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!name || steps.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Criando...' : 'Criar Workflow'}
            </GlassButton>
          </div>
        </GlassCard>
        </div>
      </motion.div>
    </>,
    document.body
  );
}

// Workflow Step Visualizer
function WorkflowVisualizer({ steps }: { steps: WorkflowStep[] }) {
  // Build dependency graph
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // Calculate levels for each step based on dependencies
  const levels = new Map<string, number>();

  const calculateLevel = (stepId: string, visited = new Set<string>()): number => {
    if (visited.has(stepId)) return 0;
    visited.add(stepId);

    if (levels.has(stepId)) return levels.get(stepId)!;

    const step = stepMap.get(stepId);
    if (!step || !step.dependsOn || step.dependsOn.length === 0) {
      levels.set(stepId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(...step.dependsOn.map(d => calculateLevel(d, visited)));
    const level = maxDepLevel + 1;
    levels.set(stepId, level);
    return level;
  };

  steps.forEach(s => calculateLevel(s.id));

  // Group steps by level
  const stepsByLevel: WorkflowStep[][] = [];
  steps.forEach(step => {
    const level = levels.get(step.id) || 0;
    if (!stepsByLevel[level]) stepsByLevel[level] = [];
    stepsByLevel[level].push(step);
  });

  return (
    <div className="relative">
      <h4 className="text-sm font-medium text-secondary mb-4">Fluxo de Execução:</h4>

      <div className="flex flex-col gap-4">
        {stepsByLevel.map((levelSteps, levelIdx) => (
          <div key={levelIdx} className="relative">
            {/* Level indicator */}
            {levelIdx > 0 && (
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-tertiary">
                  <div className="h-6 w-px bg-white/20" />
                </div>
              </div>
            )}

            {/* Steps at this level */}
            <div className={cn(
              'flex gap-3',
              levelSteps.length === 1 ? 'justify-center' : 'justify-center flex-wrap'
            )}>
              {levelSteps.map((step) => {
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'relative p-3 rounded-xl border min-w-[200px] max-w-[280px]',
                      getStepColors(step.config?.squadId || 'default')
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <StepIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{step.name}</p>
                        {step.config?.squadId && (
                          <p className="text-xs text-tertiary truncate mt-0.5">
                            Squad: {step.config.squadId}
                          </p>
                        )}
                        {step.config?.agentId && (
                          <p className="text-xs text-tertiary truncate">
                            Agent: {step.config.agentId}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dependencies indicator */}
                    {step.dependsOn && step.dependsOn.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-[10px] text-tertiary">
                          Depende de: {step.dependsOn.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Parallel indicator */}
            {levelSteps.length > 1 && (
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] text-tertiary bg-gray-800 px-1 rounded">
                Paralelo
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-xs text-tertiary mb-2">Legenda:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(squadThemes) as SquadType[]).filter((k) => k !== 'default').map((squadType) => {
            const theme = squadThemes[squadType];
            return (
              <div key={squadType} className={cn('px-2 py-1 rounded text-[10px] border', theme.bgSubtle, theme.borderSubtle, theme.textMuted)}>
                {squadType}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
