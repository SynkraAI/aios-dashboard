import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface TerminalOutputProps {
  lines: string[];
  isActive: boolean;
}

interface StyledSegment {
  text: string;
  classes: string;
}

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'text-black',
  31: 'terminal-error',
  32: 'terminal-prompt',
  33: 'terminal-ansi-yellow',
  34: 'terminal-ansi-blue',
  35: 'terminal-ansi-purple',
  36: 'terminal-ansi-cyan',
  37: 'text-white',
  90: 'terminal-ansi-dim',
  91: 'terminal-error',
  92: 'terminal-prompt',
  93: 'terminal-ansi-yellow',
  94: 'terminal-ansi-blue',
};

function parseAnsiLine(line: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[(\d+(?:;\d+)*)m/g;
  let lastIndex = 0;
  let currentClasses = 'terminal-text';
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(line)) !== null) {
    // Push text before this escape code
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), classes: currentClasses });
    }

    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentClasses = 'text-gray-300';
      } else if (code === 1) {
        currentClasses = currentClasses.includes('font-bold')
          ? currentClasses
          : `${currentClasses} font-bold`;
      } else if (ANSI_COLOR_MAP[code]) {
        // Replace existing text color
        currentClasses = currentClasses
          .replace(/(?:text-\S+|terminal-\S+)/, ANSI_COLOR_MAP[code]);
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  // Remaining text
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), classes: currentClasses });
  }

  return segments;
}

function hasAnsiCodes(line: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /\x1b\[/.test(line);
}

function getHeuristicClass(line: string): string {
  if (line.startsWith('$')) return 'terminal-prompt';
  if (/^PASS|passed|✓/.test(line)) return 'terminal-success';
  if (/FAIL|error|Error/.test(line)) return 'terminal-error';
  return 'terminal-text';
}

function TerminalLine({ line }: { line: string }) {
  if (hasAnsiCodes(line)) {
    const segments = parseAnsiLine(line);
    return (
      <div className="whitespace-pre-wrap">
        {segments.map((seg, i) => (
          <span key={i} className={seg.classes}>{seg.text}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap">
      <span className={getHeuristicClass(line)}>{line}</span>
    </div>
  );
}

export function TerminalOutput({ lines, isActive }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  // Auto-scroll when new lines arrive and user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      const el = containerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [lines.length, isAtBottom]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full bg-[rgb(0_0_0/0.8)] p-3 font-mono text-xs leading-relaxed overflow-y-auto"
        tabIndex={0}
        role="region"
        aria-label="Saida do terminal"
      >
        {lines.map((line, i) => (
          <TerminalLine key={i} line={line} />
        ))}
        {isActive && (
          <span className="terminal-cursor animate-pulse">_</span>
        )}
      </div>

      <AnimatePresence>
        {!isAtBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 p-1.5 rounded-lg glass text-xs text-secondary hover:text-primary flex items-center gap-1 transition-colors"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-3 w-3" />
            <span>Bottom</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
