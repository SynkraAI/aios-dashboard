import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  BarChart3,
  Globe,
  Bot,
  Cpu,
  Terminal,
  Activity,
  Brain,
  Map,
  Network,
  Github,
  Server,
  Settings,
  ChevronLeft,
  Menu,
  X,
  BookOpen,
  Database,
  UsersRound,
  ListTodo,
  Workflow,
  Shield,
  ArrowRightLeft,
  Eye,
} from 'lucide-react';
import { GlassCard, GlassButton, AioxLogo } from '../ui';
import { useUIStore } from '../../stores/uiStore';
import { useOrchestrationStore } from '../../stores/orchestrationStore';
import { cn } from '../../lib/utils';

// Logo components
const Logo = () => (
  <AioxLogo variant="full" size={36} className="text-primary" />
);

const LogoSmall = () => (
  <AioxLogo variant="icon" size={36} className="text-primary mx-auto" />
);

// Navigation items — existing views + 11 PRD views
const navItems = [
  // Core views (pre-existing)
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat', shortcut: 'H', separator: false },
  { id: 'dashboard' as const, icon: BarChart3, label: 'Dashboard', shortcut: 'D', separator: false },
  { id: 'world' as const, icon: Globe, label: 'World', shortcut: 'W', separator: true },
  // PRD views
  { id: 'agents' as const, icon: Bot, label: 'Agents', shortcut: 'A', separator: false },
  { id: 'bob' as const, icon: Cpu, label: 'Bob', shortcut: 'B', separator: false },
  { id: 'terminals' as const, icon: Terminal, label: 'Terminals', shortcut: 'T', separator: false },
  { id: 'monitor' as const, icon: Activity, label: 'Monitor', shortcut: 'M', separator: false },
  { id: 'context' as const, icon: Brain, label: 'Context', shortcut: 'C', separator: false },
  { id: 'knowledge' as const, icon: Database, label: 'Knowledge', shortcut: 'N', separator: false },
  { id: 'roadmap' as const, icon: Map, label: 'Roadmap', shortcut: 'R', separator: false },
  { id: 'squads' as const, icon: Network, label: 'Squads', shortcut: 'Q', separator: false },
  { id: 'stories' as const, icon: BookOpen, label: 'Stories', shortcut: 'Y', separator: false },
  { id: 'github' as const, icon: Github, label: 'GitHub', shortcut: 'G', separator: false },
  { id: 'sales-room' as const, icon: Eye, label: 'Sales Room', shortcut: 'L', separator: false },
  { id: 'engine' as const, icon: Server, label: 'Engine', shortcut: 'E', separator: true },
  // Registry views
  { id: 'agent-directory' as const, icon: UsersRound, label: 'Agent Dir', shortcut: '', separator: false },
  { id: 'task-catalog' as const, icon: ListTodo, label: 'Tasks', shortcut: '', separator: false },
  { id: 'workflow-catalog' as const, icon: Workflow, label: 'Workflows', shortcut: '', separator: false },
  { id: 'authority-matrix' as const, icon: Shield, label: 'Authority', shortcut: '', separator: false },
  { id: 'handoff-flows' as const, icon: ArrowRightLeft, label: 'Handoffs', shortcut: '', separator: false },
  { id: 'settings' as const, icon: Settings, label: 'Settings', shortcut: 'S', separator: false },
] as const;

// Stagger container variants for nav items (brandbook stagger)
const navContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // --bb-ease-decel
    },
  },
};

// Navigation component — vertical list with stagger animation
function ViewNavigation({ collapsed = false }: { collapsed?: boolean }) {
  const { currentView, setCurrentView } = useUIStore();
  const { badgeCount, isRunning, clearPending } = useOrchestrationStore();

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId as Parameters<typeof setCurrentView>[0]);
    if (viewId === 'bob' && badgeCount > 0) {
      clearPending();
    }
  };

  return (
    <nav id="navigation" className="flex-1 p-2 overflow-y-auto glass-scrollbar" aria-label="Navegacao principal">
      <motion.div
        className="space-y-0.5"
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const showBadge = item.id === 'bob' && badgeCount > 0 && !isActive;
          const showPulse = item.id === 'bob' && isRunning && !isActive;

          return (
            <motion.div key={item.id} variants={navItemVariants}>
            {item.separator && (
              <div className={cn('my-2', collapsed ? 'mx-2' : 'mx-3', 'border-t border-white/10')} />
            )}
            <button
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
              className={cn(
                'aiox-nav-item w-full flex items-center gap-3 rounded-xl transition-all text-left group relative',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
                isActive
                  ? 'glass-card border text-primary'
                  : 'text-secondary hover:text-primary hover:bg-white/5'
              )}
              style={isActive ? {
                backgroundColor: 'var(--sidebar-active-bg)',
                borderColor: 'var(--sidebar-active-border)',
              } : undefined}
            >
              <span className="relative flex-shrink-0">
                <Icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    !isActive && 'text-tertiary group-hover:text-secondary'
                  )}
                  style={isActive ? { color: 'var(--sidebar-active-text)' } : undefined}
                />
                {showPulse && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                )}
                {showBadge && !showPulse && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-black flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                  {showBadge && !showPulse && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-black flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                  {showPulse && (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                  <kbd
                    className={cn(
                      'hidden lg:inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded text-[10px] font-mono',
                      !isActive && 'bg-white/5 text-tertiary'
                    )}
                    style={isActive ? {
                      backgroundColor: 'var(--sidebar-active-kbd-bg)',
                      color: 'var(--sidebar-active-kbd-text)',
                    } : undefined}
                  >
                    {item.shortcut}
                  </kbd>
                </>
              )}
            </button>
            </motion.div>
          );
        })}
      </motion.div>
    </nav>
  );
}

// Desktop Sidebar
function DesktopSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      aria-label="Barra lateral principal"
      className={cn(
        'hidden md:flex h-screen glass-panel border-r border-glass-border flex-col transition-all duration-300 ease-out',
        sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
        <AnimatePresence mode="wait">
          {sidebarCollapsed ? (
            <motion.div
              key="small"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <LogoSmall />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <Logo />
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarCollapsed && (
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </GlassButton>
        )}
      </div>

      {/* Navigation */}
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center pt-2">
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 mb-2"
            aria-label="Expand sidebar"
          >
            <Menu size={18} />
          </GlassButton>
          <ViewNavigation collapsed />
        </div>
      ) : (
        <ViewNavigation />
      )}

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-glass-border">
          <GlassCard variant="subtle" padding="sm" className="text-center">
            <span className="text-xs text-secondary">
              v2.0.0 · AIOX
            </span>
          </GlassCard>
        </div>
      )}
    </aside>
  );
}

// Mobile Sidebar (Drawer)
function MobileSidebar() {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-[rgb(0_0_0/0.5)] backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <motion.aside
            aria-label="Menu lateral mobile"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="md:hidden fixed inset-y-0 left-0 w-[85%] max-w-[280px] glass-panel border-r border-glass-border flex flex-col z-50"
          >
            {/* Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
              <Logo />
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="h-9 w-9"
                aria-label="Close menu"
              >
                <X size={18} />
              </GlassButton>
            </div>

            {/* Navigation */}
            <ViewNavigation />

            {/* Footer */}
            <div className="p-3 border-t border-glass-border">
              <GlassCard variant="subtle" padding="sm" className="text-center">
                <span className="text-xs text-secondary">
                  v2.0.0 · AIOX
                </span>
              </GlassCard>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Combined Sidebar component
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}

// Export mobile menu button for Header
export function MobileMenuButton() {
  const { setMobileMenuOpen } = useUIStore();

  return (
    <GlassButton
      variant="ghost"
      size="icon"
      onClick={() => setMobileMenuOpen(true)}
      className="md:hidden h-10 w-10"
      aria-label="Open menu"
    >
      <Menu size={18} />
    </GlassButton>
  );
}
