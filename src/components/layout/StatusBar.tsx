'use client';

import { useAiosStatus } from '@/hooks/use-aios-status';
import { useBobStore } from '@/stores/bob-store';
import { useMonitorStore } from '@/stores/monitor-store';
import { AGENT_CONFIG, type AgentId } from '@/types';
import { cn } from '@/lib/utils';
import { Bell, Bot, Wifi, Radio } from 'lucide-react';
import { iconMap } from '@/lib/icons';
import { useState } from 'react';

interface StatusBarProps {
  className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
  const { status, isLoading, isConnected } = useAiosStatus();

  return (
    <footer
      className={cn(
        'flex h-7 items-center justify-between border-t px-4 text-label',
        className
      )}
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <StatusIndicator
          isConnected={isConnected}
          isLoading={isLoading}
        />

        {/* Rate Limit */}
        <RateLimitDisplay rateLimit={status?.rateLimit} />

        {/* Claude Status */}
        <span className="text-muted-foreground">
          Claude: <span className="text-foreground">{isConnected ? 'Ready' : 'Offline'}</span>
        </span>
      </div>

      {/* Center section — Connection indicators */}
      <div className="flex items-center gap-3">
        <ConnectionIndicators />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Bob Status */}
        <BobStatusIndicator />

        {/* Active Agent */}
        {status?.activeAgent && (
          <ActiveAgentBadge agentId={status.activeAgent.id} />
        )}

        {/* Notifications */}
        <NotificationBadge count={0} />
      </div>
    </footer>
  );
}

interface StatusIndicatorProps {
  isConnected: boolean;
  isLoading: boolean;
}

function StatusIndicator({ isConnected, isLoading }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          isLoading && 'bg-warning animate-pulse',
          !isLoading && isConnected && 'bg-success',
          !isLoading && !isConnected && 'bg-error'
        )}
      />
      <span className="text-muted-foreground">
        {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

interface ActiveAgentBadgeProps {
  agentId: AgentId;
}

function ActiveAgentBadge({ agentId }: ActiveAgentBadgeProps) {
  const config = AGENT_CONFIG[agentId];
  if (!config) return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{ backgroundColor: config.bg }}
    >
      {(() => {
        const IconComponent = iconMap[config.icon];
        return IconComponent ? <IconComponent className="h-4 w-4" style={{ color: config.color }} /> : null;
      })()}
      <span style={{ color: config.color }}>@{agentId}</span>
    </div>
  );
}

interface RateLimitDisplayProps {
  rateLimit?: {
    used: number;
    limit: number;
    resetsAt?: string;
  };
}

function RateLimitDisplay({ rateLimit }: RateLimitDisplayProps) {
  if (!rateLimit) {
    return (
      <span className="text-muted-foreground">
        Rate: <span className="text-foreground">—/1000</span>
      </span>
    );
  }

  const { used, limit } = rateLimit;
  const percentage = (used / limit) * 100;
  const isHigh = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <span className="text-muted-foreground">
      Rate:{' '}
      <span
        className={cn(
          'text-foreground',
          isHigh && !isCritical && 'text-warning',
          isCritical && 'text-error'
        )}
      >
        {used}/{limit}
      </span>
    </span>
  );
}

interface NotificationBadgeProps {
  count: number;
}

function BobStatusIndicator() {
  const active = useBobStore((s) => s.active);
  const isInactive = useBobStore((s) => s.isInactive);

  if (!active && !isInactive) return null;

  const label = active && !isInactive ? 'active' : active && isInactive ? 'inactive' : null;
  if (!label) return null;

  const color = label === 'active' ? '#22c55e' : '#6b7280';

  return (
    <div className="flex items-center gap-1.5 text-label">
      <Bot className="h-3 w-3" style={{ color }} />
      <span className="text-text-muted">
        Bob: <span style={{ color }}>{label}</span>
      </span>
    </div>
  );
}

function ConnectionIndicators() {
  const monitorConnected = useMonitorStore((s) => s.connected);
  const monitorEvents = useMonitorStore((s) => s.events);
  const { isConnected: sseConnected } = useAiosStatus();
  const bobActive = useBobStore((s) => s.active);
  const [showEventCount, setShowEventCount] = useState(false);

  return (
    <>
      {/* WebSocket (Monitor) indicator */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        title={`Monitor WebSocket: ${monitorConnected ? 'Connected' : 'Disconnected'}\nURL: ws://localhost:4001/stream\nEvents: ${monitorEvents.length}`}
        onClick={() => setShowEventCount(!showEventCount)}
      >
        <Wifi className="h-3 w-3" style={{ color: monitorConnected ? '#22c55e' : '#ef4444' }} />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: monitorConnected ? '#22c55e' : '#ef4444' }}
        />
        {showEventCount && monitorConnected && (
          <span className="text-detail text-muted-foreground">{monitorEvents.length}</span>
        )}
      </div>

      {/* SSE (Status) indicator */}
      <div
        className="flex items-center gap-1"
        title={`Status SSE: ${sseConnected ? 'Connected' : 'Disconnected'}\nURL: /api/events`}
      >
        <Radio className="h-3 w-3" style={{ color: sseConnected ? '#22c55e' : '#ef4444' }} />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: sseConnected ? '#22c55e' : '#ef4444' }}
        />
      </div>

      {/* SSE (Bob) indicator */}
      {bobActive && (
        <div
          className="flex items-center gap-1"
          title={`Bob SSE: Connected\nURL: /api/bob/events`}
        >
          <Bot className="h-3 w-3" style={{ color: '#22c55e' }} />
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: '#22c55e' }}
          />
        </div>
      )}
    </>
  );
}

function NotificationBadge({ count }: NotificationBadgeProps) {
  return (
    <button
      className={cn(
        'relative flex items-center justify-center rounded-md p-1',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        'transition-colors'
      )}
      title={`${count} notifications`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-detail font-medium text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
