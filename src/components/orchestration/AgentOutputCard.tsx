import { useState, useEffect, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Bot,
  Crown,
  Copy,
  Check,
  ChevronDown,
  Target,
} from 'lucide-react';
import type { AgentOutput, StreamingOutput } from './orchestration-types';
import { getSquadColor } from './orchestration-types';

const MarkdownRenderer = lazy(() => import('../chat/MarkdownRenderer'));

export const AgentOutputCard = memo(function AgentOutputCard({
  output,
  streaming,
  index,
  isReviewer,
  onCopy,
  copied,
}: {
  output?: AgentOutput;
  streaming?: StreamingOutput;
  index: number;
  isReviewer: boolean;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [streamElapsed, setStreamElapsed] = useState(() =>
    streaming ? (Date.now() - streaming.startedAt) / 1000 : 0
  );
  const data = output || streaming;

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      setStreamElapsed((Date.now() - streaming.startedAt) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [streaming]);

  if (!data) return null;

  const isStreaming = !!streaming;
  const color = getSquadColor(data.agent.squad);
  const response = output?.response || streaming?.accumulated || '';
  const elapsedTime = streaming
    ? streamElapsed.toFixed(1)
    : output?.processingTimeMs
    ? (output.processingTimeMs / 1000).toFixed(1)
    : '0';

  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
      className={`relative rounded-2xl border backdrop-blur-xl overflow-hidden ${
        isReviewer
          ? 'bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10 border-yellow-500/30'
          : isStreaming
          ? 'bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 border-cyan-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Streaming glow effect */}
      {isStreaming && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color.glow}, transparent 70%)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div
        className="relative flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="relative">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color.bg, border: `2px solid ${color.border}` }}
              animate={isStreaming ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Bot className="w-6 h-6" style={{ color: color.text }} />
            </motion.div>
            {isStreaming && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
            {data.role === 'reviewer' && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-900" />
              </div>
            )}
            {data.role === 'chief' && !isReviewer && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">{data.agent.name || data.agent.id}</h2>
              {isStreaming && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400 flex items-center gap-1"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando...
                </motion.span>
              )}
              {isReviewer && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                  Resultado Final
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span style={{ color: color.text }}>{data.agent.squad}</span>
              <span>•</span>
              <span className="capitalize">{data.role}</span>
              <span>•</span>
              <span>{elapsedTime}s</span>
              {output?.llmMetadata && (
                <>
                  <span>•</span>
                  <span>{output.llmMetadata.outputTokens} tokens</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStreaming && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCopy(response)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
              aria-label="Copiar"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </motion.button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-all"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              className="block"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div
                className={`p-4 rounded-xl ${
                  isReviewer ? 'bg-[rgb(0_0_0/0.3)]' : 'bg-[rgb(0_0_0/0.2)]'
                } border border-white/5`}
              >
                {isStreaming ? (
                  <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                    {response}
                    <motion.span
                      className="inline-block w-2 h-5 bg-cyan-400 ml-1"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </div>
                ) : (
                  <Suspense fallback={<div className="text-sm text-white/50 animate-pulse">...</div>}>
                    <MarkdownRenderer content={response} className="text-sm text-white/90" />
                  </Suspense>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
