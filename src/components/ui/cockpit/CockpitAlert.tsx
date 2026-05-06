import { cn } from '../../../lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

export interface CockpitAlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  icon?: ReactNode
}

const variantStyles: Record<string, React.CSSProperties> = {
  info: { borderColor: 'rgba(0, 153, 255, 0.4)', background: 'rgba(0, 153, 255, 0.05)' },
  success: { borderColor: 'rgba(209, 255, 0, 0.4)', background: 'rgba(209, 255, 0, 0.05)' },
  warning: { borderColor: 'rgba(237, 70, 9, 0.4)', background: 'rgba(237, 70, 9, 0.05)' },
  error: { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' },
}

export function CockpitAlert({ variant = 'info', title, icon, children, className, style, ...props }: CockpitAlertProps) {
  return (
    <div
      role="alert"
      className={cn(className)}
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        border: '1px solid',
        borderRadius: '0.5rem',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ flexShrink: 0, marginTop: '0.125rem' }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        {title && (
          <p style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--aiox-cream)', marginBottom: '0.25rem' }}>
            {title}
          </p>
        )}
        <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.675rem', color: 'var(--aiox-gray-muted)', lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
