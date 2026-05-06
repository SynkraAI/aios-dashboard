import { useRef, useEffect } from 'react';
import { Terminal, Download } from 'lucide-react';
import { GlassCard, GlassButton } from '../ui';
import { cn } from '../../lib/utils';
import { useJobLogs } from '../../hooks/useEngine';

interface JobLogsViewerProps {
  jobId: string;
  jobStatus: string;
}

export default function JobLogsViewer({ jobId, jobStatus }: JobLogsViewerProps) {
  const { data, isLoading, isFetching } = useJobLogs(
    jobId,
    200,
  );
  const scrollRef = useRef<HTMLPreElement>(null);
  const isLive = jobStatus === 'running' || jobStatus === 'pending';

  // Auto-scroll on new logs while live
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.logs.length, isLive]);

  function handleDownload() {
    if (!data?.logs.length) return;
    const blob = new Blob([data.logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId.slice(0, 12)}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <GlassCard padding="sm" variant="subtle">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-tertiary" />
          <span className="text-xs text-tertiary">Logs</span>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className={cn(
                'h-1.5 w-1.5 rounded-full bg-green-400',
                isFetching && 'animate-pulse',
              )} />
              <span className="text-[10px] text-green-400">LIVE</span>
            </span>
          )}
        </div>
        {data?.logs.length ? (
          <GlassButton
            size="sm"
            variant="ghost"
            leftIcon={<Download className="h-3 w-3" />}
            onClick={handleDownload}
            aria-label="Download logs"
          >
            Download
          </GlassButton>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-xs text-tertiary p-3">Carregando logs...</div>
      ) : !data?.logs.length ? (
        <div className="text-xs text-tertiary p-3 text-center">
          Nenhum log disponível
        </div>
      ) : (
        <>
          {data.hasMore && (
            <div className="text-[10px] text-tertiary text-center py-1">
              ... logs anteriores omitidos ...
            </div>
          )}
          <pre
            ref={scrollRef}
            className="text-[11px] font-mono text-secondary bg-[rgb(0_0_0/0.2)] p-3 rounded-lg max-h-60 overflow-auto whitespace-pre-wrap break-all leading-relaxed"
          >
            {data.logs.map((line, i) => (
              <div
                key={i}
                className={cn(
                  line.includes('ERROR') || line.includes('[error]')
                    ? 'text-red-400'
                    : line.includes('WARN') || line.includes('[warn]')
                    ? 'text-yellow-400'
                    : line.includes('✓') || line.includes('[success]')
                    ? 'text-green-400'
                    : undefined,
                )}
              >
                {line}
              </div>
            ))}
          </pre>
        </>
      )}
    </GlassCard>
  );
}
