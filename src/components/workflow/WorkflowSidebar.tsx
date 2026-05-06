import { motion } from 'framer-motion';
import { Badge, Avatar } from '../ui';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { WorkflowMission, WorkflowOperation } from './types';

// Icons
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RocketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

interface WorkflowSidebarProps {
  mission: WorkflowMission;
  operations: WorkflowOperation[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onViewMission: () => void;
}

export function WorkflowSidebar({
  mission,
  operations,
  selectedNodeId,
  onSelectNode,
  onViewMission,
}: WorkflowSidebarProps) {
  return (
    <div
      className="w-80 border-r border-white/10 flex flex-col relative overflow-hidden backdrop-blur-xl"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 0% 100%, color-mix(in srgb, var(--color-accent, #D1FF00) 6%, transparent) 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 100% 0%, rgba(156, 156, 156, 0.04) 0%, transparent 50%),
          var(--glass-background-panel, rgba(15, 15, 20, 0.65))
        `
      }}
    >
      {/* Mission Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, #000))' }}>
            <RocketIcon />
          </div>
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Missão Ativa
          </h2>
          <Badge variant="count" size="sm" className="ml-auto">
            #{mission.id.split('-')[1]}
          </Badge>
        </div>

        <div
          className="relative rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] group"
          onClick={onViewMission}
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--color-accent, #D1FF00) 10%, transparent) 0%, color-mix(in srgb, var(--color-accent, #D1FF00) 5%, transparent) 100%)`,
            border: `1px solid color-mix(in srgb, var(--color-accent, #D1FF00) 20%, transparent)`
          }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, color-mix(in srgb, var(--color-accent, #D1FF00) 10%, transparent), color-mix(in srgb, var(--color-accent, #D1FF00) 5%, transparent))` }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">{mission.name}</h3>
              <ChevronRightIcon />
            </div>
            <p className="text-white/50 text-xs mb-3 line-clamp-2">{mission.description}</p>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Progresso geral</span>
                <span className="text-white font-semibold">{mission.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[rgb(0_0_0/0.3)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mission.progress}%` }}
                  transition={{ duration: 0.5 }}
                  style={{
                    background: `linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 70%, transparent))`,
                    boxShadow: `0 0 10px color-mix(in srgb, var(--color-accent, #D1FF00) 50%, transparent)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent, #D1FF00) 80%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 50%, #000))' }}>
            <UsersIcon />
          </div>
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Agents na Missão
          </h2>
          <Badge variant="count" size="sm" className="ml-auto">
            {mission.agents.length}
          </Badge>
        </div>

        <div className="space-y-1.5">
          {mission.agents.map((agent, index) => {
            const node = mission.nodes.find((n) => n.agentName === agent.name);
            const isSelected = node && selectedNodeId === node.id;

            const squadGradients: Record<string, string> = {
              copywriting: 'from-[rgba(209,255,0,0.12)] to-[rgba(209,255,0,0.06)]',
              design: 'from-[rgba(209,255,0,0.10)] to-[rgba(209,255,0,0.04)]',
              creator: 'from-[rgba(209,255,0,0.12)] to-[rgba(209,255,0,0.06)]',
              orchestrator: 'from-[rgba(209,255,0,0.14)] to-[rgba(209,255,0,0.08)]',
            };

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all',
                  `bg-gradient-to-r ${squadGradients[agent.squadType] || 'from-gray-500/20 to-gray-400/20'}`,
                  'border border-transparent hover:border-white/10',
                  isSelected && 'ring-1 ring-white/30 border-white/20'
                )}
                onClick={() => node && onSelectNode(node.id)}
              >
                <Avatar
                  name={agent.name}
                  agentId={agent.id}
                  size="sm"
                  squadType={agent.squadType}
                  status={agent.status === 'working' ? 'online' : agent.status === 'waiting' ? 'busy' : 'offline'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{agent.name}</p>
                  <p className="text-white/50 text-xs truncate">{agent.currentTask}</p>
                </div>
                <div className="flex-shrink-0">
                  {agent.status === 'working' && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-accent, #D1FF00)' }}>
                      <SpinnerIcon />
                    </span>
                  )}
                  {agent.status === 'completed' && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-accent, #D1FF00)', opacity: 0.7 }}>
                      <CheckIcon />
                    </span>
                  )}
                  {agent.status === 'waiting' && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-secondary, #858585)' }}>
                      <ClockIcon />
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Operations Log */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent, #D1FF00) 60%, #000), color-mix(in srgb, var(--color-accent, #D1FF00) 35%, #000))' }}>
            <ActivityIcon />
          </div>
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Log de Operações
          </h2>
          <Badge variant="count" size="sm" className="ml-auto">
            {operations.length}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto glass-scrollbar px-4 pb-4" tabIndex={0} role="region" aria-label="Log de operacoes do workflow">
          <div className="space-y-2">
            {operations.map((op, index) => (
              <OperationItem key={op.id} operation={op} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox
            label="Concluídas"
            value={operations.filter((o) => o.status === 'completed').length}
            color="green"
          />
          <StatBox
            label="Em execução"
            value={operations.filter((o) => o.status === 'running').length}
            color="orange"
          />
          <StatBox
            label="Pendentes"
            value={operations.filter((o) => o.status === 'pending').length}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

function OperationItem({ operation, index }: { operation: WorkflowOperation; index: number }) {
  const squadStyles: Record<string, { border: string; bg: string }> = {
    copywriting: { border: 'border-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.08)]' },
    design: { border: 'border-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.06)]' },
    creator: { border: 'border-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.08)]' },
    orchestrator: { border: 'border-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.10)]' },
  };

  const style = squadStyles[operation.squadType] || { border: 'border-gray-500', bg: 'from-gray-500/10' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'rounded-lg p-3 border transition-all hover:translate-x-1',
        style.border,
        `bg-gradient-to-r ${style.bg} to-transparent`
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Avatar
            name={operation.agentName}
            size="sm"
            squadType={operation.squadType}
          />
          <span className="text-white text-xs font-medium">{operation.agentName}</span>
        </div>
        <StatusBadge status={operation.status} />
      </div>

      <p className="text-white/60 text-xs mb-1.5 line-clamp-2">{operation.action}</p>

      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>{formatRelativeTime(operation.startedAt)}</span>
        {operation.duration && <span>{operation.duration}s</span>}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: WorkflowOperation['status'] }) {
  const styles: Record<string, string> = {
    running: 'bg-[rgba(209,255,0,0.15)] text-[var(--color-accent,#D1FF00)] border-[rgba(209,255,0,0.25)]',
    completed: 'bg-[rgba(209,255,0,0.10)] text-[color-mix(in_srgb,var(--color-accent,#D1FF00)_70%,#858585)] border-[rgba(209,255,0,0.15)]',
    pending: 'bg-[rgba(156,156,156,0.12)] text-[var(--color-text-tertiary,#858585)] border-[rgba(156,156,156,0.15)]',
  };

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border',
        styles[status]
      )}
    >
      {status === 'running' && <SpinnerIcon />}
      {status === 'completed' && <CheckIcon />}
      {status === 'pending' && <ClockIcon />}
      <span>
        {status === 'running' ? 'Executando' : status === 'completed' ? 'Concluído' : 'Pendente'}
      </span>
    </span>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: 'green' | 'orange' | 'gray' }) {
  const colors = {
    green: { text: 'text-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.15)]', glow: 'rgba(209, 255, 0, 0.25)' },
    orange: { text: 'text-[var(--color-accent,#D1FF00)]', bg: 'from-[rgba(209,255,0,0.12)]', glow: 'rgba(209, 255, 0, 0.2)' },
    gray: { text: 'text-[var(--color-text-tertiary,#858585)]', bg: 'from-[rgba(156,156,156,0.12)]', glow: 'rgba(156, 156, 156, 0.15)' },
  };

  const style = colors[color];

  return (
    <div
      className={cn('rounded-xl p-2.5 bg-gradient-to-b to-transparent', style.bg)}
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: value > 0 ? `0 0 15px ${style.glow}` : 'none'
      }}
    >
      <p className={cn('text-xl font-bold', style.text)}>{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}
