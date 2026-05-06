import { useRef, useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '../ui';
import { cn, getSquadTheme } from '../../lib/utils';
import type { WorkflowNode, WorkflowEdge } from './types';
import type { SquadType } from '../../types';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  zoom,
  onZoomChange,
  selectedNodeId,
  onSelectNode,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Center the canvas initially based on nodes
  useEffect(() => {
    if (containerRef.current && nodes.length > 0) {
      const { width, height } = containerRef.current.getBoundingClientRect();

      // If container has no size yet, use fallback
      if (width === 0 || height === 0) {
        queueMicrotask(() => setPan({ x: 50, y: 50 }));
        return;
      }

      // Calculate bounding box of all nodes
      const minX = Math.min(...nodes.map(n => n.position.x));
      const maxX = Math.max(...nodes.map(n => n.position.x)) + 150;
      const minY = Math.min(...nodes.map(n => n.position.y));
      const maxY = Math.max(...nodes.map(n => n.position.y)) + 100;

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      // Center the content in the viewport with some padding
      const centerX = (width - contentWidth * zoom) / 2 - minX * zoom + 50;
      const centerY = (height - contentHeight * zoom) / 2 - minY * zoom + 30;

      queueMicrotask(() => setPan({ x: centerX, y: centerY }));
    } else if (containerRef.current) {
      // Default centering when no nodes
      const { width, height } = containerRef.current.getBoundingClientRect();
      queueMicrotask(() => setPan({ x: width / 4, y: height / 4 }));
    }
  }, [nodes, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom with Ctrl/Cmd + scroll
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2);
      onZoomChange(newZoom);
    }
  };

  // Prevent default zoom behavior on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', preventDefaultZoom, { passive: false });
    return () => container.removeEventListener('wheel', preventDefaultZoom);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing relative"
      style={{ height: '100%', minHeight: '400px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Canvas background — uses workflow-canvas token when available (AIOX cockpit) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            var(--workflow-canvas,
              radial-gradient(ellipse 80% 60% at 0% 100%, rgba(209, 255, 0, 0.06) 0%, transparent 55%),
              radial-gradient(ellipse 70% 80% at 100% 0%, rgba(209, 255, 0, 0.04) 0%, transparent 55%),
              radial-gradient(ellipse 90% 70% at 50% 50%, rgba(156, 156, 156, 0.03) 0%, transparent 50%),
              linear-gradient(160deg, #0a0a0c 0%, #0f0f11 30%, #0d0d0f 50%, #0f0f11 70%, #0a0a0c 100%)
            )
          `
        }}
      />

      {/* Background Grid - dot pattern */}
      <div
        className="canvas-bg absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, var(--chart-grid, rgba(209,255,0,0.05)) 1px, transparent 0)
          `,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas Content */}
      <div
        className="absolute z-10"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          left: 0,
          top: 0,
        }}
      >
        {/* Edges (SVG) */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: 2000, height: 1000, overflow: 'visible' }}
        >
          <defs>
            {/* Gradient definitions — monochromatic lime accent (AIOX cockpit) */}
            <linearGradient id="grad-copywriting" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="grad-design" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="grad-creator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="grad-orchestrator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent, #D1FF00)" />
              <stop offset="100%" stopColor="var(--color-accent, #D1FF00)" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="grad-default" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-text-secondary, #858585)" />
              <stop offset="100%" stopColor="var(--color-text-tertiary, #6D6D6D)" />
            </linearGradient>

            {/* Animated dash pattern */}
            <pattern id="dash-pattern" patternUnits="userSpaceOnUse" width="20" height="1">
              <line x1="0" y1="0" x2="10" y2="0" stroke="currentColor" strokeWidth="2" />
            </pattern>

            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>

            {/* Glow filter for particles */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <EdgePath
                key={edge.id}
                edge={edge}
                sourcePos={sourceNode.position}
                targetPos={targetNode.position}
                sourceSquad={sourceNode.squadType}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <WorkflowNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => onSelectNode(node.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 backdrop-blur-xl rounded-xl p-2 md:p-3" style={{ background: 'var(--glass-background-panel, rgba(0,0,0,0.4))', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))' }}>
        <p className="text-[10px] md:text-xs mb-1.5 md:mb-2" style={{ color: 'var(--color-text-tertiary, rgba(255,255,255,0.5))' }}>Legenda</p>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-accent, #D1FF00)', opacity: 0.7 }} />
            <span style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }}>Concluído</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent, #D1FF00)' }} />
            <span style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }}>Ativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-text-secondary, #858585)' }} />
            <span style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }}>Aguardando</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-text-tertiary, #6D6D6D)' }} />
            <span style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }}>Pendente</span>
          </div>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-[rgb(0_0_0/0.4)] backdrop-blur-xl border border-white/10 rounded-lg px-2 md:px-3 py-1.5 md:py-2 hidden sm:block">
        <p className="text-[10px] text-white/50">
          <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/70">⌘/Ctrl</kbd>
          {' + scroll para zoom · arraste para mover'}
        </p>
      </div>
    </div>
  );
}

// Edge Path Component
const EdgePath = memo(function EdgePath({
  edge,
  sourcePos,
  targetPos,
  sourceSquad,
}: {
  edge: WorkflowEdge;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  sourceSquad?: string;
}) {
  // Calculate control points for curved path
  const dx = targetPos.x - sourcePos.x;

  // Offset for node size
  const sourceX = sourcePos.x + 60;
  const sourceY = sourcePos.y + 30;
  const targetX = targetPos.x - 10;
  const targetY = targetPos.y + 30;

  // Create bezier curve
  const controlX1 = sourceX + dx * 0.4;
  const controlY1 = sourceY;
  const controlX2 = targetX - dx * 0.4;
  const controlY2 = targetY;

  const pathD = `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;

  const gradientId = sourceSquad ? `grad-${sourceSquad}` : 'grad-default';

  return (
    <g>
      {/* Background path */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--color-border-default, rgba(255,255,255,0.1))"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Main path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={edge.status === 'completed' ? `url(#${gradientId})` : edge.status === 'active' ? `url(#${gradientId})` : 'var(--color-border-subtle, rgba(255,255,255,0.15))'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={edge.status === 'idle' ? '8 4' : 'none'}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />

      {/* Animated particle for active edges */}
      {edge.animated && edge.status === 'active' && (
        <circle
          r="4"
          fill="var(--color-accent, #D1FF00)"
          className="animate-flow-particle"
          style={{
            offsetPath: `path('${pathD}')`,
          }}
        >
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
});

// Node Component
const WorkflowNodeComponent = memo(function WorkflowNodeComponent({
  node,
  isSelected,
  onClick,
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Get squad colors from centralized theme
  const getNodeColors = (squadType: string | undefined) => {
    if (!squadType) return null;
    const theme = getSquadTheme(squadType as SquadType);
    return {
      bg: theme.gradientSubtle,
      border: theme.border + '/50',
      glow: theme.glow,
    };
  };

  const colors = getNodeColors(node.squadType);

  // Special rendering for start/end/checkpoint nodes
  if (node.type === 'start' || node.type === 'end' || node.type === 'checkpoint') {
    return (
      <motion.div
        className={cn(
          'absolute cursor-pointer',
          'flex flex-col items-center gap-2'
        )}
        style={{ left: node.position.x, top: node.position.y }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
      >
        <div
          className={cn(
            'h-14 w-14 rounded-full flex items-center justify-center',
            'bg-[rgb(0_0_0/0.5)] backdrop-blur-xl border transition-all',
            node.type === 'start' && 'border-[var(--color-accent,#D1FF00)]/50 shadow-[0_0_20px_rgba(209,255,0,0.2)]',
            node.type === 'end' && 'border-[var(--color-accent,#D1FF00)]/30 shadow-[0_0_20px_rgba(209,255,0,0.1)]',
            node.type === 'checkpoint' && 'border-[var(--color-text-secondary,#858585)]/50 shadow-[0_0_20px_rgba(156,156,156,0.15)]',
            isSelected && 'ring-2 ring-offset-2 ring-offset-transparent ring-white'
          )}
        >
          {node.type === 'start' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-accent, #D1FF00)' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          {node.type === 'end' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-accent, #D1FF00)', opacity: 0.7 }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {node.type === 'checkpoint' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-secondary, #858585)' }}>
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          )}
        </div>
        <span className="text-xs text-white/70 whitespace-nowrap">{node.label}</span>
      </motion.div>
    );
  }

  // Agent node rendering
  return (
    <motion.div
      className={cn(
        'absolute cursor-pointer',
        'w-[120px]'
      )}
      style={{ left: node.position.x, top: node.position.y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div
        className={cn(
          'bg-[rgb(0_0_0/0.5)] backdrop-blur-xl rounded-xl p-3 border transition-all',
          colors?.border || 'border-white/10',
          isSelected && 'ring-2 ring-offset-2 ring-offset-transparent ring-white',
          node.status === 'active' && colors?.glow
        )}
        style={{
          boxShadow: node.status === 'active' && node.squadType
            ? `0 0 25px color-mix(in srgb, ${getSquadTheme(node.squadType as SquadType).cssVar} 25%, transparent)`
            : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar
            name={node.agentName || '?'}
            size="sm"
            squadType={node.squadType}
            status={node.status === 'active' ? 'online' : node.status === 'waiting' ? 'busy' : 'offline'}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/95 font-medium truncate">{node.label}</p>
            <p className="text-[10px] text-white/50 truncate">{node.agentName}</p>
          </div>
        </div>

        {/* Progress */}
        {node.progress !== undefined && (
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  colors?.bg.replace('/20', '') || 'from-gray-500 to-gray-400'
                )}
                style={{
                  background: `linear-gradient(to right, var(--color-accent, #D1FF00), color-mix(in srgb, var(--color-accent, #D1FF00) 60%, transparent))`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${node.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-white/50 text-right">{node.progress}%</p>
          </div>
        )}

        {/* Status indicator */}
        {node.status === 'active' && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--color-accent, #D1FF00)' }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--color-accent, #D1FF00)' }} />
            </span>
          </div>
        )}
      </div>

      {/* Current action tooltip */}
      {node.status === 'active' && node.currentAction && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 bg-[rgb(0_0_0/0.5)] backdrop-blur-xl border border-white/10 rounded-lg px-2 py-1"
        >
          <p className="text-[10px] text-white/70 truncate">{node.currentAction}</p>
        </motion.div>
      )}
    </motion.div>
  );
});
