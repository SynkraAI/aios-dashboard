export const STEP_TYPE_LABELS: Record<string, string> = {
  task: 'Tarefa',
  condition: 'Condição',
  parallel: 'Paralelo',
  loop: 'Loop',
  wait: 'Aguardar',
  subworkflow: 'Sub-workflow',
  webhook: 'Webhook',
  transform: 'Transformação',
};

export const SQUAD_STYLES: Record<string, { gradient: string; border: string; bg: string; text: string; glow: string }> = {
  copywriting: {
    gradient: 'from-[var(--color-accent,#D1FF00)] to-[color-mix(in_srgb,var(--color-accent,#D1FF00)_70%,#000)]',
    border: 'border-[var(--color-accent,#D1FF00)]',
    bg: 'from-[rgba(209,255,0,0.12)] to-[rgba(209,255,0,0.06)]',
    text: 'text-[var(--color-accent,#D1FF00)]',
    glow: 'rgba(209, 255, 0, 0.25)'
  },
  design: {
    gradient: 'from-[color-mix(in_srgb,var(--color-accent,#D1FF00)_80%,#000)] to-[color-mix(in_srgb,var(--color-accent,#D1FF00)_50%,#000)]',
    border: 'border-[color-mix(in_srgb,var(--color-accent,#D1FF00)_80%,#858585)]',
    bg: 'from-[rgba(209,255,0,0.10)] to-[rgba(209,255,0,0.04)]',
    text: 'text-[color-mix(in_srgb,var(--color-accent,#D1FF00)_80%,#858585)]',
    glow: 'rgba(209, 255, 0, 0.2)'
  },
  creator: {
    gradient: 'from-[color-mix(in_srgb,var(--color-accent,#D1FF00)_85%,#000)] to-[color-mix(in_srgb,var(--color-accent,#D1FF00)_55%,#000)]',
    border: 'border-[var(--color-accent,#D1FF00)]',
    bg: 'from-[rgba(209,255,0,0.12)] to-[rgba(209,255,0,0.06)]',
    text: 'text-[var(--color-accent,#D1FF00)]',
    glow: 'rgba(209, 255, 0, 0.25)'
  },
  orchestrator: {
    gradient: 'from-[var(--color-accent,#D1FF00)] to-[color-mix(in_srgb,var(--color-accent,#D1FF00)_65%,#000)]',
    border: 'border-[var(--color-accent,#D1FF00)]',
    bg: 'from-[rgba(209,255,0,0.14)] to-[rgba(209,255,0,0.08)]',
    text: 'text-[var(--color-accent,#D1FF00)]',
    glow: 'rgba(209, 255, 0, 0.3)'
  },
  default: {
    gradient: 'from-[var(--color-text-secondary,#858585)] to-[var(--color-text-tertiary,#6D6D6D)]',
    border: 'border-[var(--color-text-secondary,#858585)]',
    bg: 'from-[rgba(156,156,156,0.12)] to-[rgba(156,156,156,0.06)]',
    text: 'text-[var(--color-text-secondary,#858585)]',
    glow: 'rgba(156, 156, 156, 0.15)'
  },
};

export const getSquadStyle = (squad?: string) => SQUAD_STYLES[squad || 'default'] || SQUAD_STYLES.default;

export const STEP_TYPE_TO_SQUAD: Record<string, string> = {
  task: 'orchestrator',
  condition: 'design',
  parallel: 'creator',
  loop: 'copywriting',
  wait: 'orchestrator',
  subworkflow: 'design',
  webhook: 'creator',
  transform: 'copywriting',
};
