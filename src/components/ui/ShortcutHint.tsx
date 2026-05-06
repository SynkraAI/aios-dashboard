import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutHintProps {
  keys: string[];
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function ShortcutHint({ keys, children, position = 'bottom', delay = 600 }: ShortcutHintProps) {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    const t = setTimeout(() => setShow(true), delay);
    setTimer(t);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setTimer(null);
    setShow(false);
  };

  const posStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const origins: Record<string, { initial: Record<string, number>; animate: Record<string, number>; exit: Record<string, number> }> = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 4 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -4 } },
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            className={`absolute z-[100] pointer-events-none ${posStyles[position]}`}
            initial={origins[position].initial}
            animate={origins[position].animate}
            exit={origins[position].exit}
            transition={{ duration: 0.15 }}
          >
            <span className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[rgb(0_0_0/0.9)] border border-white/10 whitespace-nowrap">
              {keys.map((key, i) => (
                <span key={i} className="flex items-center">
                  <kbd className="px-1 py-0.5 rounded text-[10px] font-mono text-white/90 bg-white/10 leading-none">
                    {key}
                  </kbd>
                  {i < keys.length - 1 && <span className="text-white/30 text-[8px] mx-0.5">+</span>}
                </span>
              ))}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
