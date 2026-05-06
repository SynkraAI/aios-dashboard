import { motion } from 'framer-motion';
import { Badge } from '../ui';
import { useTokenUsage, useLLMHealth, useExecutionStats } from '../../hooks';
import { SpinnerIcon, ServerIcon } from './activity-panel-icons';
import { Section, EmptyState } from './ActivitySection';
import type { SectionKey } from './activity-panel-types';

interface MetricsPanelProps {
  expandedSections: Record<SectionKey, boolean>;
  toggleSection: (section: SectionKey) => void;
}

export function MetricsPanel({ expandedSections, toggleSection }: MetricsPanelProps) {
  const { data: tokenUsage, isLoading: loadingTokens } = useTokenUsage();
  const { data: llmHealth, isLoading: loadingHealth } = useLLMHealth();
  const { data: stats, isLoading: loadingStats } = useExecutionStats();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const hasData = tokenUsage || llmHealth || stats;

  if (!hasData && !loadingTokens && !loadingHealth && !loadingStats) {
    return (
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        }
        title="Sem métricas"
        description="Execute algumas tarefas para ver estatísticas de uso"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* LLM Health Status */}
      <Section
        title="Status LLM"
        expanded={expandedSections.health}
        onToggle={() => toggleSection('health')}
      >
        {loadingHealth ? (
          <LoadingPlaceholder />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <HealthCard
              name="Claude"
              available={llmHealth?.claude.available ?? true}
              error={llmHealth?.claude.error}
              color="purple"
            />
            <HealthCard
              name="OpenAI"
              available={llmHealth?.openai.available ?? true}
              error={llmHealth?.openai.error}
              color="green"
            />
          </div>
        )}
      </Section>

      {/* Token Usage */}
      <Section
        title="Uso de Tokens"
        expanded={expandedSections.tokens}
        onToggle={() => toggleSection('tokens')}
      >
        {loadingTokens ? (
          <LoadingPlaceholder />
        ) : tokenUsage ? (
          <div className="space-y-3">
            {/* Total Tokens */}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs">Total de Tokens</span>
                <Badge variant="count" size="sm">
                  {formatNumber((tokenUsage.total.input ?? 0) + (tokenUsage.total.output ?? 0))}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/40 mb-0.5">Input</p>
                  <p className="text-white font-semibold text-sm">
                    {formatNumber(tokenUsage.total.input ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 mb-0.5">Output</p>
                  <p className="text-white font-semibold text-sm">
                    {formatNumber(tokenUsage.total.output ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <TokenCard
                provider="Claude"
                input={tokenUsage.claude.input ?? 0}
                output={tokenUsage.claude.output ?? 0}
                requests={tokenUsage.claude.requests ?? 0}
                color="purple"
              />
              <TokenCard
                provider="OpenAI"
                input={tokenUsage.openai.input ?? 0}
                output={tokenUsage.openai.output ?? 0}
                requests={tokenUsage.openai.requests ?? 0}
                color="green"
              />
            </div>
          </div>
        ) : (
          <NoDataPlaceholder text="Nenhum uso de tokens registrado" />
        )}
      </Section>

      {/* Execution Stats */}
      <Section
        title="Estatísticas"
        expanded={expandedSections.stats}
        onToggle={() => toggleSection('stats')}
      >
        {loadingStats ? (
          <LoadingPlaceholder />
        ) : stats && stats.total > 0 ? (
          <div className="space-y-3">
            {/* Total Executions */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Total" value={stats.total} color="blue" />
              <StatCard label="Sucesso" value={stats.byStatus.completed ?? 0} color="green" />
              <StatCard label="Falhas" value={stats.byStatus.failed ?? 0} color="red" />
            </div>

            {/* Success Rate */}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs">Taxa de Sucesso</span>
                <span className="text-green-400 font-semibold text-sm">
                  {((stats.byStatus.completed ?? 0) / stats.total * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[rgb(0_0_0/0.3)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.byStatus.completed ?? 0) / stats.total * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        ) : (
          <NoDataPlaceholder text="Nenhuma execução registrada" />
        )}
      </Section>
    </div>
  );
}

// Loading Placeholder
function LoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center py-6">
      <SpinnerIcon />
    </div>
  );
}

// No Data Placeholder
function NoDataPlaceholder({ text }: { text: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-tertiary text-xs">{text}</p>
    </div>
  );
}

// Health Card Component
interface HealthCardProps {
  name: string;
  available: boolean;
  error?: string;
  color: 'purple' | 'green';
}

function HealthCard({ name, available, error, color }: HealthCardProps) {
  const colors = {
    purple: { border: 'rgba(147, 51, 234, 0.3)', bg: 'rgba(147, 51, 234, 0.1)' },
    green: { border: 'rgba(34, 197, 94, 0.3)', bg: 'rgba(34, 197, 94, 0.1)' },
  };

  const style = colors[color];

  // Parse and simplify error message
  const getErrorMessage = (err?: string): string => {
    if (!err) return 'Offline';

    // Try to extract a friendly message from JSON error
    try {
      if (err.startsWith('{') || err.startsWith('[')) {
        const parsed = JSON.parse(err);
        // Common error message fields
        if (parsed.message) return parsed.message.slice(0, 30);
        if (parsed.error?.message) return parsed.error.message.slice(0, 30);
        if (parsed.error) return String(parsed.error).slice(0, 30);
      }
    } catch {
      // Not JSON, continue
    }

    // Check for common HTTP error patterns
    if (err.includes('401') || err.toLowerCase().includes('unauthorized')) {
      return 'API key inválida';
    }
    if (err.includes('403') || err.toLowerCase().includes('forbidden')) {
      return 'Acesso negado';
    }
    if (err.includes('429') || err.toLowerCase().includes('rate limit')) {
      return 'Rate limit';
    }
    if (err.includes('500') || err.toLowerCase().includes('server error')) {
      return 'Erro servidor';
    }
    if (err.includes('timeout') || err.toLowerCase().includes('timed out')) {
      return 'Timeout';
    }
    if (err.toLowerCase().includes('network') || err.toLowerCase().includes('connect')) {
      return 'Erro de rede';
    }

    // Truncate long messages
    return err.length > 25 ? err.slice(0, 22) + '...' : err;
  };

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: `linear-gradient(135deg, ${style.bg} 0%, transparent 100%)`,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <ServerIcon />
        <span className="text-white/80 text-xs font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`} />
        <span
          className={`text-[10px] ${available ? 'text-green-400' : 'text-red-400'} truncate max-w-[80px]`}
          title={!available && error ? error : undefined}
        >
          {available ? 'Online' : getErrorMessage(error)}
        </span>
      </div>
    </div>
  );
}

// Token Card Component
interface TokenCardProps {
  provider: string;
  input: number;
  output: number;
  requests: number;
  color: 'purple' | 'green';
}

function TokenCard({ provider, input, output, requests, color }: TokenCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const colors = {
    purple: 'from-purple-500/10 border-purple-500/20',
    green: 'from-green-500/10 border-green-500/20',
  };

  return (
    <div className={`rounded-xl p-2.5 bg-gradient-to-br ${colors[color]} to-transparent border`}>
      <p className="text-[10px] text-white/50 mb-1">{provider}</p>
      <p className="text-white font-semibold text-sm mb-0.5">
        {formatNumber(input + output)}
      </p>
      <p className="text-[10px] text-white/40">{requests} requests</p>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    blue: { text: 'text-blue-400', bg: 'from-blue-500/20' },
    green: { text: 'text-green-400', bg: 'from-green-500/20' },
    red: { text: 'text-red-400', bg: 'from-red-500/20' },
  };

  const style = colors[color];

  return (
    <div
      className={`rounded-xl p-2.5 bg-gradient-to-br ${style.bg} to-transparent`}
      style={{ border: '1px solid var(--glass-border-color-subtle)' }}
    >
      <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${style.text}`}>{value}</p>
    </div>
  );
}
