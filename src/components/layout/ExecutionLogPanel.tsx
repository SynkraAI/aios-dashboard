/**
 * Execution Log Panel
 *
 * Expandable panel that shows detailed execution logs including:
 * - Pipeline progress
 * - Agent steps
 * - Tool usage
 * - Errors and timing
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  Bot,
} from 'lucide-react';
import { useExecutionLogStore, LogLevel } from '../../stores/executionLogStore';
import { cn } from '../../lib/utils';
import { ICON_SIZES } from '../../lib/icons';

// Icons
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <motion.svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    animate={{ rotate: expanded ? 180 : 0 }}
    transition={{ duration: 0.2 }}
  >
    <polyline points="6 9 12 15 18 9" />
  </motion.svg>
);

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const levelIcons: Record<LogLevel, LucideIcon> = {
  info: ClipboardList,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  tool: Wrench,
  agent: Bot,
};

const levelColors: Record<LogLevel, string> = {
  info: 'text-blue-400 bg-blue-500/10',
  success: 'text-green-400 bg-green-500/10',
  warning: 'text-yellow-400 bg-yellow-500/10',
  error: 'text-red-400 bg-red-500/10',
  tool: 'text-purple-400 bg-purple-500/10',
  agent: 'text-cyan-400 bg-cyan-500/10',
};

interface ExecutionLogPanelProps {
  className?: string;
}

export function ExecutionLogPanel({ className }: ExecutionLogPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { logs, isExecuting, currentExecution, clearLogs } = useExecutionLogStore();

  // Auto-expand when execution starts
  useEffect(() => {
    if (isExecuting && logs.length > 0) {
      queueMicrotask(() => setExpanded(true));
    }
  }, [isExecuting, logs.length]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (expanded && logs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, expanded]);

  const hasLogs = logs.length > 0;
  const progressPercent = currentExecution.totalSteps > 0
    ? (currentExecution.currentStep / currentExecution.totalSteps) * 100
    : 0;

  if (!hasLogs && !isExecuting) {
    return null;
  }

  return (
    <div className={cn('rounded-xl border border-white/10 overflow-hidden', className)}>
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 transition-colors',
          'hover:bg-white/5',
          isExecuting ? 'bg-orange-500/10' : 'bg-white/5'
        )}
      >
        <div className="flex items-center gap-2">
          {isExecuting ? (
            <motion.div
              className="h-2 w-2 rounded-full bg-orange-500"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : (
            <div className="h-2 w-2 rounded-full bg-green-500" />
          )}
          <span className="text-xs font-medium text-primary">
            {isExecuting ? 'Executando...' : 'Log de Execução'}
          </span>
          {isExecuting && currentExecution.totalSteps > 1 && (
            <span className="text-[10px] text-tertiary">
              ({currentExecution.currentStep}/{currentExecution.totalSteps})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasLogs && (
            <span className="text-[10px] text-tertiary px-1.5 py-0.5 rounded-full bg-white/5">
              {logs.length}
            </span>
          )}
          <ChevronIcon expanded={expanded} />
        </div>
      </button>

      {/* Progress bar when executing */}
      {isExecuting && currentExecution.totalSteps > 1 && (
        <div className="h-0.5 bg-[rgb(0_0_0/0.2)]">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Expandable Log Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-[300px] overflow-y-auto glass-scrollbar" tabIndex={0} role="region" aria-label="Painel de log de execucao">
              {/* Clear button */}
              {hasLogs && !isExecuting && (
                <div className="flex justify-end px-3 py-1 border-b border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearLogs();
                    }}
                    className="flex items-center gap-1 text-[10px] text-tertiary hover:text-red-400 transition-colors"
                  >
                    <ClearIcon />
                    Limpar
                  </button>
                </div>
              )}

              {/* Log entries */}
              <div className="p-2 space-y-1">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs',
                      levelColors[log.level]
                    )}
                  >
                    {(() => { const Icon = levelIcons[log.level]; return <Icon size={ICON_SIZES.sm} className="flex-shrink-0" />; })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-medium truncate">
                          {log.message}
                        </span>
                        {log.step && log.totalSteps && (
                          <span className="text-[9px] text-tertiary flex-shrink-0">
                            {log.step}/{log.totalSteps}
                          </span>
                        )}
                      </div>
                      {log.toolName && (
                        <span className="text-[10px] text-tertiary">
                          Tool: {log.toolName}
                        </span>
                      )}
                      {log.duration && (
                        <span className="text-[10px] text-tertiary ml-2">
                          ({log.duration.toFixed(1)}s)
                        </span>
                      )}
                      {log.details && (
                        <details className="mt-1">
                          <summary className="text-[10px] text-tertiary cursor-pointer hover:text-secondary">
                            Detalhes
                          </summary>
                          <pre className="text-[9px] text-tertiary mt-1 p-1 bg-[rgb(0_0_0/0.2)] rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-[9px] text-tertiary flex-shrink-0">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
                <div ref={logsEndRef} />
              </div>

              {/* Empty state */}
              {logs.length === 0 && isExecuting && (
                <div className="text-center py-4">
                  <span className="text-tertiary text-xs">Aguardando logs...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExecutionLogPanel;
