import { motion } from 'framer-motion';
import { GlassButton, Badge, Avatar, GlassCard } from '../ui';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { WorkflowMission } from './types';

// Icons
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

interface WorkflowMissionDetailProps {
  mission: WorkflowMission;
  onClose: () => void;
}

export function WorkflowMissionDetail({ mission, onClose }: WorkflowMissionDetailProps) {
  const completedNodes = mission.nodes.filter((n) => n.status === 'completed').length;
  const totalNodes = mission.nodes.filter((n) => n.type === 'agent').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgb(0_0_0/0.4)]" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-2xl glass-lg rounded-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between">
          <div>
            <h2 className="text-primary text-lg font-semibold">{mission.name}</h2>
            <p className="text-tertiary text-sm">Missão #{mission.id}</p>
          </div>
          <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </GlassButton>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto glass-scrollbar" tabIndex={0} role="region" aria-label="Detalhes da missao">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-secondary mb-2">Descrição</h3>
            <p className="text-primary text-sm">{mission.description}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={<TargetIcon />}
              label="Progresso"
              value={`${mission.progress}%`}
              color="text-blue-500"
            />
            <StatCard
              icon={<CheckCircleIcon />}
              label="Concluídas"
              value={`${completedNodes}/${totalNodes}`}
              color="text-green-500"
            />
            <StatCard
              icon={<UsersIcon />}
              label="Agents"
              value={mission.agents.length.toString()}
              color="text-purple-500"
            />
            <StatCard
              icon={<ClockIcon />}
              label="Tempo"
              value={formatRelativeTime(mission.startedAt || '')}
              color="text-orange-500"
            />
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-secondary">Progresso da Missão</span>
              <span className="text-primary font-medium">{mission.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${mission.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Agents */}
          <div>
            <h3 className="text-sm font-semibold text-secondary mb-3">Agents Envolvidos</h3>
            <div className="grid grid-cols-2 gap-3">
              {mission.agents.map((agent) => (
                <GlassCard
                  key={agent.id}
                  variant="subtle"
                  padding="sm"
                  className="flex items-center gap-3"
                >
                  <Avatar
                    name={agent.name}
                    size="md"
                    squadType={agent.squadType}
                    status={
                      agent.status === 'working'
                        ? 'online'
                        : agent.status === 'waiting'
                        ? 'busy'
                        : 'offline'
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-primary font-medium text-sm">{agent.name}</p>
                    <p className="text-tertiary text-xs truncate">{agent.role}</p>
                  </div>
                  <Badge
                    variant="status"
                    status={
                      agent.status === 'working'
                        ? 'warning'
                        : agent.status === 'completed'
                        ? 'success'
                        : 'offline'
                    }
                    size="sm"
                  >
                    {agent.status === 'working' && 'Trabalhando'}
                    {agent.status === 'waiting' && 'Aguardando'}
                    {agent.status === 'completed' && 'Concluído'}
                  </Badge>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Workflow Steps */}
          <div>
            <h3 className="text-sm font-semibold text-secondary mb-3">Etapas do Workflow</h3>
            <div className="space-y-2">
              {mission.nodes
                .filter((n) => n.type === 'agent' || n.type === 'checkpoint')
                .map((node, index) => (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'glass-subtle'
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold',
                        node.status === 'completed' && 'bg-green-500/20 text-green-500',
                        node.status === 'active' && 'bg-orange-500/20 text-orange-500',
                        node.status === 'waiting' && 'bg-yellow-500/20 text-yellow-500',
                        node.status === 'idle' && 'bg-gray-500/20 text-gray-500'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-primary text-sm font-medium">{node.label}</p>
                      {node.agentName && (
                        <p className="text-tertiary text-xs">{node.agentName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {node.progress !== undefined && (
                        <p className="text-primary text-sm">{node.progress}%</p>
                      )}
                      <p
                        className={cn(
                          'text-xs',
                          node.status === 'completed' && 'text-green-500',
                          node.status === 'active' && 'text-orange-500',
                          node.status === 'waiting' && 'text-yellow-500',
                          node.status === 'idle' && 'text-gray-500'
                        )}
                      >
                        {node.status === 'completed' && 'Concluído'}
                        {node.status === 'active' && 'Em execução'}
                        {node.status === 'waiting' && 'Aguardando'}
                        {node.status === 'idle' && 'Pendente'}
                      </p>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-glass-border flex items-center justify-between">
          <p className="text-tertiary text-xs">
            Iniciado {formatRelativeTime(mission.startedAt || '')}
          </p>
          <GlassButton variant="primary" onClick={onClose}>
            Fechar
          </GlassButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <GlassCard variant="subtle" padding="sm" className="text-center">
      <div className={cn('flex items-center justify-center mb-1', color)}>{icon}</div>
      <p className="text-primary text-lg font-bold">{value}</p>
      <p className="text-tertiary text-[10px]">{label}</p>
    </GlassCard>
  );
}
