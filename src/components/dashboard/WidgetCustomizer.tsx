import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, X } from 'lucide-react';
import { GlassButton } from '../ui';
import { useDashboardWidgetStore } from '../../stores/dashboardWidgetStore';
import { cn } from '../../lib/utils';

export function WidgetCustomizer() {
  const { widgets, customizing, setCustomizing, toggleWidget, moveWidget, resetWidgets } = useDashboardWidgetStore();
  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <>
      <GlassButton
        variant="ghost"
        size="sm"
        onClick={() => setCustomizing(true)}
        leftIcon={<Settings size={14} />}
        aria-label="Personalizar widgets"
      >
        Personalizar
      </GlassButton>

      <AnimatePresence>
        {customizing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[rgb(0_0_0/0.4)] backdrop-blur-sm z-[60]"
              onClick={() => setCustomizing(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-4 top-20 z-[61] w-72 glass-card rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-primary">Dashboard Widgets</h3>
                <button
                  onClick={() => setCustomizing(false)}
                  className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto glass-scrollbar">
                {sorted.map((widget, idx) => (
                  <div
                    key={widget.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg transition-colors',
                      widget.visible ? 'bg-white/5' : 'bg-white/[0.02] opacity-50'
                    )}
                  >
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="p-1 rounded text-tertiary hover:text-primary transition-colors"
                      aria-label={widget.visible ? 'Ocultar' : 'Mostrar'}
                    >
                      {widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <span className="text-xs text-primary flex-1 truncate">{widget.label}</span>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => moveWidget(widget.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-tertiary hover:text-primary disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveWidget(widget.id, 'down')}
                        disabled={idx === sorted.length - 1}
                        className="p-0.5 rounded text-tertiary hover:text-primary disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-white/10 flex justify-between">
                <button
                  onClick={resetWidgets}
                  className="flex items-center gap-1.5 text-xs text-tertiary hover:text-primary transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <GlassButton variant="primary" size="sm" onClick={() => setCustomizing(false)}>
                  Pronto
                </GlassButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
