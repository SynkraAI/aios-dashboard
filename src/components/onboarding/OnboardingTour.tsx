import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type LucideIcon,
  Hand,
  Users,
  Bot,
  MessageSquare,
  Star,
  Search,
  Keyboard,
  Rocket,
} from 'lucide-react';
import { GlassButton } from '../ui';
import { cn } from '../../lib/utils';
import { CinematicIntro } from './CinematicIntro';

// Icons
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Tour steps with optional DOM target selector for spotlight
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  position?: 'center' | 'left' | 'right';
  target?: string; // CSS selector for spotlight highlight
  shortcut?: string; // keyboard shortcut hint
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AIOS Core',
    description: 'Uma plataforma de IA multi-agente para potencializar seu trabalho. Vamos fazer um tour rápido pelas principais funcionalidades.',
    icon: Hand,
    position: 'center',
  },
  {
    id: 'squads',
    title: 'Squads de Especialistas',
    description: 'Na sidebar esquerda você encontra os Squads - equipes de agentes especializados em diferentes áreas como Copywriting, Design, YouTube e mais.',
    icon: Users,
    position: 'left',
    target: 'nav[aria-label]',
  },
  {
    id: 'agents',
    title: 'Agentes Inteligentes',
    description: 'Cada squad possui agentes com habilidades únicas. Selecione um agente para iniciar uma conversa e aproveitar sua expertise.',
    icon: Bot,
    position: 'left',
    target: 'nav[aria-label]',
  },
  {
    id: 'chat',
    title: 'Chat Interativo',
    description: 'Converse naturalmente com os agentes. Eles entendem contexto, respondem em tempo real e podem executar comandos específicos.',
    icon: MessageSquare,
    position: 'center',
  },
  {
    id: 'favorites',
    title: 'Favoritos e Recentes',
    description: 'Marque seus agentes favoritos com a estrela para acesso rápido. Agentes usados recentemente também ficam salvos.',
    icon: Star,
    position: 'left',
  },
  {
    id: 'search',
    title: 'Busca Global',
    description: 'Use a busca global para encontrar rapidamente qualquer agente, view ou comando.',
    icon: Search,
    position: 'center',
    target: 'button[aria-label*="Buscar"]',
    shortcut: '⌘K',
  },
  {
    id: 'shortcuts',
    title: 'Atalhos de Teclado',
    description: 'Navegue mais rápido usando atalhos. São mais de 20 atalhos para todas as funcionalidades.',
    icon: Keyboard,
    position: 'center',
    shortcut: '⌘?',
  },
  {
    id: 'ready',
    title: 'Pronto para Começar!',
    description: 'Você está pronto para explorar o AIOS Core. Selecione um squad e comece uma conversa com um agente.',
    icon: Rocket,
    position: 'center',
  },
];

// Onboarding store
interface OnboardingState {
  hasCompletedTour: boolean;
  setHasCompletedTour: (completed: boolean) => void;
  resetTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      setHasCompletedTour: (completed) => set({ hasCompletedTour: completed }),
      resetTour: () => set({ hasCompletedTour: false }),
    }),
    {
      name: 'aios-onboarding',
    }
  )
);

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { hasCompletedTour, setHasCompletedTour } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showCinematicIntro, setShowCinematicIntro] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Update spotlight position when step changes
  useEffect(() => {
    if (!isVisible) return;
    const step = tourSteps[currentStep];
    if (step?.target) {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement must happen in effect
        setSpotlightRect(rect);
        return;
      }
    }
    setSpotlightRect(null);
  }, [currentStep, isVisible]);

  // Show cinematic intro first if not completed, then tour
  useEffect(() => {
    if (!hasCompletedTour) {
      const timer = setTimeout(() => setShowCinematicIntro(true), 300);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setHasCompletedTour(true);
    onComplete?.();
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  if (!isVisible && !showCinematicIntro) return null;

  // Show cinematic intro first
  if (showCinematicIntro && !isVisible) {
    return (
      <AnimatePresence>
        <CinematicIntro
          onComplete={() => {
            setShowCinematicIntro(false);
            setIsVisible(true);
          }}
        />
      </AnimatePresence>
    );
  }

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]"
      >
        {/* Backdrop with spotlight cutout */}
        {spotlightRect ? (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.x - 8}
                  y={spotlightRect.y - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.5)"
              mask="url(#spotlight-mask)"
            />
            {/* Glowing border around spotlight */}
            <rect
              x={spotlightRect.x - 8}
              y={spotlightRect.y - 8}
              width={spotlightRect.width + 16}
              height={spotlightRect.height + 16}
              rx="12"
              fill="none"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="2"
            >
              <animate attributeName="stroke-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
            </rect>
          </svg>
        ) : (
          <div className="absolute inset-0 bg-[rgb(0_0_0/0.4)] backdrop-blur-[2px]" />
        )}

        {/* Tour Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-full max-w-md p-1',
            step.position === 'left' && 'left-8 md:left-[320px]',
            step.position === 'right' && 'right-8',
            step.position === 'center' && 'left-1/2 -translate-x-1/2'
          )}
        >
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div className="mb-4">
                <step.icon size={48} className="text-blue-400" />
              </div>

              {/* Text */}
              <h2 className="text-xl font-bold text-primary mb-2">{step.title}</h2>
              <p className="text-secondary text-sm leading-relaxed">{step.description}</p>

              {/* Shortcut hint */}
              {step.shortcut && (
                <div className="mt-3 flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-mono text-primary">
                    {step.shortcut}
                  </kbd>
                  <span className="text-[11px] text-tertiary">Atalho rápido</span>
                </div>
              )}

              {/* Step indicator */}
              <div className="flex items-center gap-1.5 mt-6 mb-4">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      index === currentStep
                        ? 'w-6 bg-blue-500'
                        : index < currentStep
                        ? 'w-1.5 bg-blue-500/50'
                        : 'w-1.5 bg-white/20'
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <GlassButton variant="ghost" size="sm" onClick={handlePrev}>
                      Voltar
                    </GlassButton>
                  )}
                  <button
                    onClick={handleSkip}
                    className="text-xs text-tertiary hover:text-secondary transition-colors"
                  >
                    Pular tour
                  </button>
                </div>

                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={handleNext}
                  rightIcon={isLastStep ? <CheckIcon /> : <ArrowRightIcon />}
                >
                  {isLastStep ? 'Começar' : 'Próximo'}
                </GlassButton>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Skip button (top right) */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full glass-subtle text-tertiary hover:text-primary transition-colors"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manually trigger tour
export function useOnboardingTour() {
  const { hasCompletedTour, setHasCompletedTour, resetTour } = useOnboardingStore();

  return {
    hasCompletedTour,
    startTour: () => setHasCompletedTour(false),
    completeTour: () => setHasCompletedTour(true),
    resetTour,
  };
}
