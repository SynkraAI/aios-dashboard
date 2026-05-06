import { useState, useEffect, useRef, memo, useCallback } from 'react';

interface MermaidDiagramProps {
  code: string;
}

// Track active renders to avoid React Strict Mode double-render conflicts
let renderQueue = Promise.resolve();

const MermaidDiagram = memo(function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mmd${Math.random().toString(36).slice(2, 9)}`);
  const [showCode, setShowCode] = useState(false);

  const toggleCode = useCallback(() => setShowCode(v => !v), []);

  useEffect(() => {
    let mounted = true;
    const currentId = idRef.current;

    // Queue renders to avoid concurrent mermaid calls (strict mode)
    renderQueue = renderQueue.then(async () => {
      if (!mounted) return;

      try {
        const { default: mermaid } = await import('mermaid');

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#2a2a3e',
            primaryTextColor: '#D1FF00',
            primaryBorderColor: '#D1FF00',
            lineColor: '#D1FF00',
            secondaryColor: '#1a1a2e',
            tertiaryColor: '#151520',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            nodeBorder: '#D1FF00',
            mainBkg: '#1e1e2e',
            clusterBkg: '#15151f',
            edgeLabelBackground: '#0d0d14',
            nodeTextColor: '#e0e0e0',
          },
          flowchart: { htmlLabels: true, curve: 'basis' },
        });

        // Cleanup any previous temp elements
        document.getElementById(`d${currentId}`)?.remove();

        const { svg: renderedSvg } = await mermaid.render(currentId, code);

        // Cleanup temp container left by mermaid
        document.getElementById(`d${currentId}`)?.remove();

        if (mounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        // Cleanup on error
        document.getElementById(`d${currentId}`)?.remove();
        document.getElementById(currentId)?.remove();

        if (mounted) {
          console.warn('[MermaidDiagram] Render failed:', (err as Error).message);
          setError(true);
        }
      }
    });

    return () => {
      mounted = false;
      document.getElementById(`d${currentId}`)?.remove();
      document.getElementById(currentId)?.remove();
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-3 rounded-lg overflow-hidden border border-white/10">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(0_0_0/0.3)]">
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-mono">mermaid</span>
          <span className="text-[10px] text-amber-400">Diagrama em texto</span>
        </div>
        <pre className="p-4 text-[13px] text-white/70 bg-[rgb(0_0_0/0.4)] overflow-x-auto font-mono leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 rounded-lg bg-white/5 border border-white/10 h-40 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-[#D1FF00] border-t-transparent rounded-full" />
          Renderizando diagrama...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d14]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(0_0_0/0.3)] border-b border-white/5">
        <span className="text-[10px] uppercase tracking-wider text-[#D1FF00]/60 font-mono flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#D1FF00]/50">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          diagram
        </span>
        <button
          onClick={toggleCode}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors font-mono"
        >
          {showCode ? 'Diagrama' : 'Código'}
        </button>
      </div>

      {showCode ? (
        <pre className="p-4 text-[13px] text-white/70 bg-[rgb(0_0_0/0.4)] overflow-x-auto font-mono leading-relaxed">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          className="p-4 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
});

export default MermaidDiagram;
