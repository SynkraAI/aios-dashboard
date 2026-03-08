'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  FileText,
  Bot,
  Settings,
  Server,
  FolderOpen,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useSettingsStore } from '@/stores/settings-store';
import { MOCK_CONTEXT, type ContextFile, type ContextMCP, type ContextData } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, count, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          {count !== undefined && (
            <Badge variant="outline" className="text-xs">{count}</Badge>
          )}
        </div>
        <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
      </button>
      {isOpen && (
        <div className="p-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function FileCard({ file }: { file: ContextFile }) {
  const typeColors = {
    rules: 'text-purple-500 bg-purple-500/10',
    agent: 'text-blue-500 bg-blue-500/10',
    config: 'text-yellow-500 bg-yellow-500/10',
    docs: 'text-green-500 bg-green-500/10',
  };

  const typeIcons = {
    rules: FileText,
    agent: Bot,
    config: Settings,
    docs: FolderOpen,
  };

  const Icon = typeIcons[file.type];

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className={cn('p-1.5 rounded', typeColors[file.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{file.name}</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground truncate">{file.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{new Date(file.lastModified).toLocaleDateString()}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{file.size}</span>
        </div>
      </div>
    </div>
  );
}

function MCPCard({ mcp }: { mcp: ContextMCP }) {
  const statusConfig = {
    active: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    inactive: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const { icon: StatusIcon, color, bg } = statusConfig[mcp.status];

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn('p-1.5 rounded', bg)}>
        <Server className={cn('h-4 w-4', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{mcp.name}</span>
          <StatusIcon className={cn('h-3 w-3', color)} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{mcp.description}</p>
      </div>
      <Badge variant="outline" className="text-xs">
        {mcp.tools} tools
      </Badge>
    </div>
  );
}

export function ContextPanel() {
  const { settings } = useSettingsStore();
  const [data, setData] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (settings.useMockData) {
      setData(MOCK_CONTEXT);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/context'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch context');
    } finally {
      setLoading(false);
    }
  }, [settings.useMockData]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading project context...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Failed to Load Context</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button onClick={fetchContext} className="mt-4 text-sm text-blue-500 hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No Context Available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No project data found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Context</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchContext}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
          </button>
          <Badge variant="outline" className="text-xs font-mono">
            {data.projectName}
          </Badge>
        </div>
      </div>

      {/* Project Info */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Project:</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{data.projectPath}</code>
        </div>
        <div className="flex items-center gap-2 text-sm mt-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">CLAUDE.md:</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{data.claudeMdPath}</code>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Rules */}
        <CollapsibleSection
          title="Active Rules"
          icon={<FileText className="h-4 w-4 text-purple-500" />}
          count={data.activeRules.length}
        >
          <div className="space-y-1">
            {data.activeRules.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Agent Definitions */}
        <CollapsibleSection
          title="Agent Definitions"
          icon={<Bot className="h-4 w-4 text-blue-500" />}
          count={data.agentDefinitions.length}
        >
          <div className="space-y-1">
            {data.agentDefinitions.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Config Files */}
        <CollapsibleSection
          title="Config Files"
          icon={<Settings className="h-4 w-4 text-yellow-500" />}
          count={data.configFiles.length}
        >
          <div className="space-y-1">
            {data.configFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </CollapsibleSection>

        {/* MCP Servers */}
        <CollapsibleSection
          title="MCP Servers"
          icon={<Server className="h-4 w-4 text-cyan-500" />}
          count={data.mcpServers.length}
        >
          <div className="space-y-1">
            {data.mcpServers.map((mcp) => (
              <MCPCard key={mcp.id} mcp={mcp} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Recent Files */}
        <CollapsibleSection
          title="Recent Files"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          count={data.recentFiles.length}
          defaultOpen={false}
        >
          <div className="space-y-1">
            {data.recentFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <code className="text-xs truncate">{file}</code>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {settings.useMockData ? 'Showing mock context' : 'Live project context'}
        </span>
        <span className="text-xs text-muted-foreground">
          {data.mcpServers.filter(m => m.status === 'active').length} MCPs active
        </span>
      </div>
    </div>
  );
}
