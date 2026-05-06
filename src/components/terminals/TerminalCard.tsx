import { useState } from 'react';
import { Minimize2, Maximize2, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, Badge, StatusDot } from '../ui';
import type { StatusType } from '../ui/StatusDot';
import { cn } from '../../lib/utils';

export interface TerminalSession {
  id: string;
  agent: string;
  status: 'working' | 'idle' | 'error';
  dir: string;
  story: string;
  output: string[];
}

function mapStatus(status: TerminalSession['status']): StatusType {
  return status;
}

interface TerminalCardProps {
  session: TerminalSession;
  listMode?: boolean;
}

export function TerminalCard({ session, listMode = false }: TerminalCardProps) {
  const [minimized, setMinimized] = useState(false);
  const isActive = session.status === 'working';
  const statusType = mapStatus(session.status);

  // Show last 8 lines of output
  const visibleLines = session.output.slice(-8);

  return (
    <GlassCard
      padding="none"
      className={cn(
        'overflow-hidden flex flex-col',
        !listMode && 'h-[280px]',
        listMode && 'h-auto',
        isActive && 'ring-1 terminal-ring-active',
      )}
      aria-label={`Terminal ${session.agent} - ${session.status}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot
            status={statusType}
            size="sm"
            glow={isActive}
            pulse={isActive}
          />
          <span className="text-sm font-semibold text-primary truncate">
            {session.agent}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-tertiary">
            <FolderOpen className="h-3 w-3" />
            <span className="max-w-[100px] truncate">{session.dir}</span>
          </span>
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 rounded hover:bg-white/5 text-tertiary hover:text-secondary transition-colors"
            aria-label={minimized ? 'Maximize terminal' : 'Minimize terminal'}
          >
            {minimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal output area */}
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <div
              className={cn(
                'bg-[rgb(0_0_0/0.8)] p-3 font-mono text-xs leading-relaxed overflow-y-auto',
                !listMode && 'h-[200px]',
                listMode && 'max-h-[160px]',
              )}
              tabIndex={0}
              role="region"
              aria-label={`Terminal ${session.agent}`}
            >
              {visibleLines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line.startsWith('$') ? (
                    <span className="terminal-prompt">{line}</span>
                  ) : line.startsWith('PASS') || line.includes('passed') || line.startsWith('\u2713') ? (
                    <span className="terminal-success">{line}</span>
                  ) : line.startsWith('FAIL') || line.includes('error') || line.includes('Error') ? (
                    <span className="terminal-error">{line}</span>
                  ) : (
                    <span className="terminal-text">{line}</span>
                  )}
                </div>
              ))}
              {isActive && (
                <span className="terminal-cursor animate-pulse">_</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last output preview (when minimized) */}
      {minimized && session.output.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 bg-[rgb(0_0_0/0.4)]">
          <p className="font-mono text-[10px] text-tertiary truncate">
            {session.output[session.output.length - 1]}
          </p>
        </div>
      )}

      {/* Footer: Story badge + activity indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5">
        {session.story ? (
          <Badge variant="default" size="sm">
            {session.story}
          </Badge>
        ) : (
          <span className="text-[10px] text-tertiary">No active story</span>
        )}
        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full terminal-activity-dot opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 terminal-activity-dot-bg" />
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-medium capitalize',
              isActive ? 'terminal-status-active' : 'text-tertiary',
            )}
          >
            {session.status}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
