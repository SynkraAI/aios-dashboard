'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Library,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bug,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useSettingsStore } from '@/stores/settings-store';
import { Badge } from '@/components/ui/badge';

// ============ QA Metrics Types ============

interface QAMetrics {
  overview: {
    totalReviews: number;
    passRate: number;
    avgReviewTime: string;
    trend: 'improving' | 'declining' | 'stable';
  };
  libraryValidation: {
    librariesChecked: number;
    validationsPassed: number;
    deprecatedFound: number;
    securityIssues: number;
  };
  securityChecklist: {
    totalChecks: number;
    passed: number;
    failed: number;
    critical: number;
  };
  migrationValidation: {
    migrationsChecked: number;
    schemasValid: number;
    rollbacksAvailable: number;
    pendingMigrations: number;
  };
  patternFeedback: {
    patternsTracked: number;
    deprecatedPatterns: number;
    avgSuccessRate: number;
    recentTrend: 'improving' | 'declining' | 'neutral';
  };
  gotchas: {
    totalGotchas: number;
    recentlyAdded: number;
    mostCommonCategory: string;
    queriesServed: number;
  };
  dailyTrend: Array<{
    date: string;
    passed: number;
    failed: number;
  }>;
}

const MOCK_QA_METRICS: QAMetrics = {
  overview: { totalReviews: 142, passRate: 89, avgReviewTime: '3.2m', trend: 'improving' },
  libraryValidation: { librariesChecked: 48, validationsPassed: 45, deprecatedFound: 2, securityIssues: 1 },
  securityChecklist: { totalChecks: 320, passed: 308, failed: 12, critical: 2 },
  migrationValidation: { migrationsChecked: 18, schemasValid: 17, rollbacksAvailable: 15, pendingMigrations: 1 },
  patternFeedback: { patternsTracked: 24, deprecatedPatterns: 3, avgSuccessRate: 0.87, recentTrend: 'improving' },
  gotchas: { totalGotchas: 36, recentlyAdded: 5, mostCommonCategory: 'async-patterns', queriesServed: 180 },
  dailyTrend: [
    { date: 'Mon', passed: 18, failed: 2 },
    { date: 'Tue', passed: 22, failed: 3 },
    { date: 'Wed', passed: 15, failed: 1 },
    { date: 'Thu', passed: 25, failed: 2 },
    { date: 'Fri', passed: 20, failed: 4 },
    { date: 'Sat', passed: 8, failed: 0 },
    { date: 'Sun', passed: 5, failed: 1 },
  ],
};

// ============ Sub-components ============

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Shield; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

function TrendBar({ data }: { data: Array<{ date: string; passed: number; failed: number }> }) {
  const maxVal = Math.max(...data.map(d => d.passed + d.failed), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => {
        const total = d.passed + d.failed;
        const passHeight = (d.passed / maxVal) * 100;
        const failHeight = (d.failed / maxVal) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex flex-col-reverse" style={{ height: `${(total / maxVal) * 100}%`, minHeight: '2px' }}>
              <div className="w-full bg-green-500 rounded-t-sm" style={{ height: `${passHeight}%` }} />
              {failHeight > 0 && <div className="w-full bg-red-500 rounded-t-sm" style={{ height: `${failHeight}%` }} />}
            </div>
            <span className="text-[9px] text-muted-foreground">{d.date}</span>
          </div>
        );
      })}
    </div>
  );
}

function ModuleCard({ title, icon: Icon, color, stats }: { title: string; icon: typeof Shield; color: string; stats: { label: string; value: string | number }[] }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label}>
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <p className="text-sm font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Component ============

export function QAMetricsPanel() {
  const { settings } = useSettingsStore();
  const useMockData = settings.useMockData;
  const [metrics, setMetrics] = useState<QAMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setMetrics(MOCK_QA_METRICS);
      } else {
        const response = await fetch(apiUrl('/api/qa/metrics'));
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch QA metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No QA Data</p>
          <p className="text-sm text-muted-foreground mt-1">
            QA metrics will appear once reviews are recorded
          </p>
        </div>
      </div>
    );
  }

  const { overview, libraryValidation, securityChecklist, migrationValidation, patternFeedback, gotchas, dailyTrend } = metrics;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">QA Metrics</h2>
          <Badge
            variant="outline"
            className={cn('text-xs', overview.trend === 'improving' ? 'text-green-500' : overview.trend === 'declining' ? 'text-red-500' : '')}
          >
            {overview.trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
            {overview.trend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
            {overview.trend}
          </Badge>
        </div>
        <button onClick={fetchMetrics} disabled={loading} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Overview Stats */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Reviews" value={overview.totalReviews} icon={CheckCircle2} color="text-blue-500" />
            <StatCard label="Pass Rate" value={`${overview.passRate}%`} icon={Shield} color="text-green-500" />
            <StatCard label="Avg Review Time" value={overview.avgReviewTime} icon={RefreshCw} color="text-yellow-500" />
            <StatCard label="Critical Issues" value={securityChecklist.critical} icon={AlertTriangle} color="text-red-500" />
          </div>
        </section>

        {/* Daily Trend */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Daily Trend</h3>
          <div className="p-4 rounded-lg border border-border bg-card">
            <TrendBar data={dailyTrend} />
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Passed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Failed</span>
            </div>
          </div>
        </section>

        {/* Validation Modules */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Validation Modules</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ModuleCard
              title="Library Validation"
              icon={Library}
              color="text-blue-500"
              stats={[
                { label: 'Checked', value: libraryValidation.librariesChecked },
                { label: 'Passed', value: libraryValidation.validationsPassed },
                { label: 'Deprecated', value: libraryValidation.deprecatedFound },
                { label: 'Security', value: libraryValidation.securityIssues },
              ]}
            />
            <ModuleCard
              title="Security Checklist"
              icon={Shield}
              color="text-red-500"
              stats={[
                { label: 'Total', value: securityChecklist.totalChecks },
                { label: 'Passed', value: securityChecklist.passed },
                { label: 'Failed', value: securityChecklist.failed },
                { label: 'Critical', value: securityChecklist.critical },
              ]}
            />
            <ModuleCard
              title="Migration Validation"
              icon={Database}
              color="text-purple-500"
              stats={[
                { label: 'Checked', value: migrationValidation.migrationsChecked },
                { label: 'Valid', value: migrationValidation.schemasValid },
                { label: 'Rollbacks', value: migrationValidation.rollbacksAvailable },
                { label: 'Pending', value: migrationValidation.pendingMigrations },
              ]}
            />
          </div>
        </section>

        {/* Learning System */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Learning System</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ModuleCard
              title="Pattern Feedback"
              icon={TrendingUp}
              color="text-cyan-500"
              stats={[
                { label: 'Tracked', value: patternFeedback.patternsTracked },
                { label: 'Deprecated', value: patternFeedback.deprecatedPatterns },
                { label: 'Success Rate', value: `${Math.round(patternFeedback.avgSuccessRate * 100)}%` },
                { label: 'Trend', value: patternFeedback.recentTrend },
              ]}
            />
            <ModuleCard
              title="Gotchas Registry"
              icon={Bug}
              color="text-orange-500"
              stats={[
                { label: 'Total', value: gotchas.totalGotchas },
                { label: 'Recent', value: gotchas.recentlyAdded },
                { label: 'Top Category', value: gotchas.mostCommonCategory },
                { label: 'Queries', value: gotchas.queriesServed },
              ]}
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {useMockData ? 'Demo Mode' : 'Live QA data'}
        </span>
        <span className="text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </span>
      </div>
    </div>
  );
}
