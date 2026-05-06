import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import type { TaskState, SquadSelection } from './orchestration-types';
import { getSquadColor, phases } from './orchestration-types';

// Pre-compute random values outside component to preserve purity
const PARTICLE_DATA = Array.from({ length: 20 }, (_, i) => ({
  x: ((i * 37 + 13) % 100) + '%',
  duration: (i % 10) + 10,
  delay: (i * 0.25) % 5,
}));

export const BackgroundParticles = memo(function BackgroundParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_DATA.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
          initial={{
            x: p.x,
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: '-10%',
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
});

export const LiveMetrics = memo(function LiveMetrics({ state }: { state: TaskState }) {
  const [elapsed, setElapsed] = useState(() =>
    state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0
  );

  useEffect(() => {
    if (state.status === 'idle' || !state.startTime) {
      queueMicrotask(() => setElapsed(0));
      return;
    }

    const startTime = state.startTime;
    const interval = setInterval(() => {
      if (state.status === 'completed' || state.status === 'failed') {
        clearInterval(interval);
        return;
      }
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [state.status, state.startTime]);

  const totalTokens = state.agentOutputs.reduce(
    (sum, o) => sum + (o.llmMetadata?.inputTokens || 0) + (o.llmMetadata?.outputTokens || 0),
    0
  );

  const estimatedCost = (totalTokens / 1000000) * 3;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white/5 border border-white/10"
      >
        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
        <span className="text-xs md:text-sm font-mono text-white/80">
          {Math.floor(elapsed / 60).toString().padStart(2, '0')}:
          {(elapsed % 60).toString().padStart(2, '0')}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white/5 border border-white/10 hidden sm:flex"
      >
        <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
        <span className="text-xs md:text-sm font-mono text-white/80">
          {totalTokens.toLocaleString()} tok
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white/5 border border-white/10 hidden md:flex"
      >
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-mono text-white/80">
          ${estimatedCost.toFixed(4)}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white/5 border border-white/10"
      >
        <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
        <span className="text-xs md:text-sm font-mono text-white/80">
          {state.agentOutputs.length + state.streamingOutputs.size} agentes
        </span>
      </motion.div>
    </div>
  );
});

export const PhaseProgress = memo(function PhaseProgress({ currentStatus }: { currentStatus: TaskState['status'] }) {
  const currentPhaseIndex = phases.findIndex(p => p.id === currentStatus);

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {phases.map((phase, index) => {
        const isActive = phase.id === currentStatus;
        const isCompleted = currentPhaseIndex > index || currentStatus === 'completed';
        const isFailed = currentStatus === 'failed';
        const Icon = phase.icon;

        return (
          <div key={phase.id} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-300 ${
                isActive
                  ? `bg-${phase.color}-500/20 border border-${phase.color}-500/40 shadow-lg shadow-${phase.color}-500/20`
                  : isCompleted
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {isActive && !isFailed && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(var(--${phase.color}-rgb), 0.1), transparent)`,
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <div className="relative">
                {isActive && !isFailed ? (
                  <Loader2 className={`w-4 h-4 animate-spin text-${phase.color}-400`} />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Icon className="w-4 h-4 text-white/40" />
                )}
              </div>
              <span
                className={`text-xs md:text-sm font-medium hidden sm:inline ${
                  isActive ? `text-${phase.color}-400` : isCompleted ? 'text-green-400' : 'text-white/40'
                }`}
              >
                {phase.label}
              </span>
            </motion.div>
            {index < phases.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: currentPhaseIndex > index ? 1 : 0 }}
                className="w-4 md:w-8 h-0.5 bg-gradient-to-r from-green-500 to-green-400 origin-left hidden sm:block"
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export const SquadCard = memo(function SquadCard({ selection, isActive }: { selection: SquadSelection; isActive: boolean }) {
  const color = getSquadColor(selection.squadId);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className="relative p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 cursor-pointer"
      style={{
        backgroundColor: color.bg,
        borderColor: color.border,
        boxShadow: isActive ? `0 0 30px ${color.glow}, 0 0 0 2px ${color.text}` : 'none',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(45deg, transparent, ${color.bg}, transparent)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
            >
              <Layers className="w-5 h-5" style={{ color: color.text }} />
            </div>
            <div>
              <h2 className="font-semibold text-white">{selection.squadId}</h2>
              <p className="text-xs text-white/50">Chief: {selection.chief}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {selection.agentCount} agentes
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                {selection.agents.map((agent) => (
                  <motion.span
                    key={agent.id}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(0_0_0/0.2)] text-white/80"
                  >
                    {agent.name || agent.id}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
