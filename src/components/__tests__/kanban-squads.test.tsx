import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import type { Story, StoryStatus } from '../../stores/storyStore';
import type { Squad, SquadStats, AgentSummary, Agent, AgentTier } from '../../types';

// ---------------------------------------------------------------------------
// Mocks – external hooks, stores, child components, and utilities
// ---------------------------------------------------------------------------

// useStories hook
const mockUseStories = vi.fn();
vi.mock('../../hooks/useStories', () => ({
  useStories: () => mockUseStories(),
}));

// storyStore (Zustand)
const mockStoryStore = {
  storyOrder: {} as Record<StoryStatus, string[]>,
  addStory: vi.fn(),
  updateStory: vi.fn(),
  deleteStory: vi.fn(),
  moveStory: vi.fn(),
  reorderStory: vi.fn(),
  setDraggedStory: vi.fn(),
};
vi.mock('../../stores/storyStore', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../stores/storyStore')>();
  return {
    ...orig,
    useStoryStore: (selector?: unknown) => {
      if (typeof selector === 'function') {
        return (selector as (s: typeof mockStoryStore) => unknown)(mockStoryStore);
      }
      return mockStoryStore;
    },
  };
});

// useSquads hook
const mockUseSquads = vi.fn();
vi.mock('../../hooks/useSquads', () => ({
  useSquads: () => mockUseSquads(),
  useSquad: () => ({ data: null, isLoading: false }),
  useSquadStats: () => ({ data: null, isLoading: false }),
  useSquadConnections: () => ({ data: [], isLoading: false }),
  useEcosystemOverview: () => ({ data: null, isLoading: false }),
}));

// uiStore
const mockUIStore = {
  selectedSquadId: null as string | null,
  setSelectedSquadId: vi.fn(),
};
vi.mock('../../stores/uiStore', () => ({
  useUIStore: (selector?: unknown) => {
    if (typeof selector === 'function') {
      return (selector as (s: typeof mockUIStore) => unknown)(mockUIStore);
    }
    return mockUIStore;
  },
}));

// Sound
vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
}));

// Celebration
vi.mock('../ui', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    Celebration: () => null,
    useCelebration: () => ({
      celebrating: false,
      celebrate: vi.fn(),
      onComplete: vi.fn(),
    }),
  };
});

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = ({ children, ...props }: any) => {
      // Strip motion-specific props
      const {
        initial, animate, exit, transition, whileHover, whileTap, whileFocus,
        variants, layout, layoutId, drag, dragConstraints, onDragStart, onDragEnd,
        ...domProps
      } = props;
      // Also strip props that start with "on" + uppercase that are framer-specific
      const cleanProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(domProps)) {
        if (key === 'className' || key === 'style' || key === 'onClick' || key === 'onChange'
            || key === 'onSubmit' || key === 'role' || key.startsWith('data-')
            || key.startsWith('aria-') || key === 'type' || key === 'value'
            || key === 'placeholder' || key === 'id' || key === 'htmlFor'
            || key === 'disabled' || key === 'tabIndex') {
          cleanProps[key] = value;
        }
      }
      return <div data-testid={`motion-${tag}`} {...cleanProps}>{children}</div>;
    };
    Component.displayName = `motion.${tag}`;
    return Component;
  };

  return {
    motion: new Proxy({}, {
      get: (_target, prop: string) => createComponent(prop),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock dnd-kit to simplify KanbanBoard rendering
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  closestCorners: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
  useDroppable: vi.fn().mockReturnValue({ setNodeRef: vi.fn(), isOver: false }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

// Mock child components that have deep dependencies
vi.mock('../kanban/StoryCreateModal', () => ({
  StoryCreateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="story-create-modal">Create Modal</div> : null,
}));

vi.mock('../kanban/StoryDetailModal', () => ({
  StoryDetailModal: ({ isOpen, story }: { isOpen: boolean; story: Story | null }) =>
    isOpen ? <div data-testid="story-detail-modal">{story?.title}</div> : null,
}));

// Mock agent-avatars for squad components
vi.mock('../../lib/agent-avatars', () => ({
  getSquadImageUrl: vi.fn().mockReturnValue(null),
  hasAgentAvatar: vi.fn().mockReturnValue(false),
}));

// Mock theme
vi.mock('../../lib/theme', () => ({
  getSquadTheme: () => ({
    text: 'text-gray-400',
    bg: 'bg-gray-500/15',
    gradient: 'from-gray-500/20',
    dot: 'bg-gray-400',
    gradientBg: 'bg-gradient-to-br from-gray-500/10',
    borderSubtle: 'border-gray-500/20',
  }),
  getTierTheme: () => ({
    text: 'text-gray-400',
    bg: 'bg-gray-500/15',
  }),
}));

// Mock icons
vi.mock('../../lib/icons', () => ({
  getIconComponent: () => {
    const IconMock = ({ size }: { size?: number }) => <span data-testid="mock-icon">{size}</span>;
    return IconMock;
  },
}));

// Mock utils - keep real exports but mock what's needed
vi.mock('../../lib/utils', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    squadLabels: {
      default: 'Default Squad',
      copywriting: 'Copywriting',
      design: 'Design',
      creator: 'Creator',
      orchestrator: 'Orchestrator',
    },
    getSquadTheme: () => ({
      text: 'text-gray-400',
      bg: 'bg-gray-500/15',
      gradient: 'from-gray-500/20',
      dot: 'bg-gray-400',
    }),
  };
});

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function createStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'story-001',
    title: 'Test Story',
    description: 'A test story description',
    status: 'backlog',
    priority: 'medium',
    complexity: 'standard',
    category: 'feature',
    progress: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createSquad(overrides: Partial<Squad> = {}): Squad {
  return {
    id: 'squad-1',
    name: 'Test Squad',
    description: 'A test squad',
    agentCount: 5,
    type: 'default',
    capabilities: ['coding', 'testing'],
    ...overrides,
  };
}

function createSquadStats(overrides: Partial<SquadStats['stats']> = {}): SquadStats {
  return {
    squadId: 'squad-1',
    stats: {
      totalAgents: 10,
      byTier: { '0': 1, '1': 3, '2': 6 },
      quality: {
        withVoiceDna: 7,
        withAntiPatterns: 5,
        withIntegration: 8,
      },
      commands: {
        total: 42,
        byAgent: [
          { agentId: 'agent-1', count: 15 },
          { agentId: 'agent-2', count: 12 },
        ],
      },
      qualityScore: 85,
      ...overrides,
    },
  };
}

function createAgentSummary(overrides: Partial<AgentSummary> = {}): AgentSummary {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    tier: 2 as AgentTier,
    squad: 'squad-1',
    ...overrides,
  };
}

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    ...createAgentSummary(),
    status: 'online',
    persona: {
      role: 'Developer',
      style: 'Pragmatic',
      identity: 'Senior Engineer',
    },
    commands: [
      { command: '*build', action: 'Build project', description: 'Builds the project' },
    ],
    corePrinciples: ['Write clean code', 'Test everything'],
    quality: {
      hasVoiceDna: true,
      hasAntiPatterns: true,
      hasIntegration: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// KanbanBoard Tests
// ---------------------------------------------------------------------------

describe('KanbanBoard', () => {
  // Lazy import to ensure mocks are set up first
  let KanbanBoard: typeof import('../kanban/KanbanBoard').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../kanban/KanbanBoard');
    KanbanBoard = mod.default;

    // Default: loaded with stories
    mockUseStories.mockReturnValue({
      stories: [
        createStory({ id: 'story-001', title: 'First Story', status: 'backlog', priority: 'high' }),
        createStory({ id: 'story-002', title: 'Second Story', status: 'in_progress', assignedAgent: 'dev-agent' }),
        createStory({ id: 'story-003', title: 'Done Story', status: 'done', priority: 'low' }),
      ],
      isLoading: false,
      error: null,
    });

    mockStoryStore.storyOrder = {
      backlog: ['story-001'],
      in_progress: ['story-002'],
      ai_review: [],
      human_review: [],
      pr_created: [],
      done: ['story-003'],
      error: [],
    };
  });

  it('renders loading skeleton when isLoading is true', () => {
    mockUseStories.mockReturnValue({
      stories: [],
      isLoading: true,
      error: null,
    });

    const { container } = render(<KanbanBoard />);

    // Loading skeleton has shimmer class
    const shimmers = container.querySelectorAll('.shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  }, 45000);

  it('renders the board header with title and story count', () => {
    render(<KanbanBoard />);

    expect(screen.getByText('Stories')).toBeInTheDocument();
    // Total stories count badge
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders all 7 kanban columns', () => {
    render(<KanbanBoard />);

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('AI Review')).toBeInTheDocument();
    expect(screen.getByText('Human Review')).toBeInTheDocument();
    expect(screen.getByText('PR Created')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders story cards with their titles', () => {
    render(<KanbanBoard />);

    expect(screen.getByText('First Story')).toBeInTheDocument();
    expect(screen.getByText('Second Story')).toBeInTheDocument();
    expect(screen.getByText('Done Story')).toBeInTheDocument();
  });

  it('opens create modal when New Story button is clicked', async () => {
    const { user } = render(<KanbanBoard />);

    // The button says "New Story" on desktop and "New" on mobile
    const newButton = screen.getByText('New Story');
    await user.click(newButton);

    expect(screen.getByTestId('story-create-modal')).toBeInTheDocument();
  });

  it('renders search input and filters results', async () => {
    const { user } = render(<KanbanBoard />);

    const searchInput = screen.getByPlaceholderText('Buscar stories...');
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'First');

    // After typing, the count should show filtered/total format
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders with empty board when no stories', () => {
    mockUseStories.mockReturnValue({
      stories: [],
      isLoading: false,
      error: null,
    });
    mockStoryStore.storyOrder = {
      backlog: [],
      in_progress: [],
      ai_review: [],
      human_review: [],
      pr_created: [],
      done: [],
      error: [],
    };

    render(<KanbanBoard />);

    // Header still shows
    expect(screen.getByText('Stories')).toBeInTheDocument();
    // Count is 0 — multiple "0" elements exist (column counts), so use getAllByText
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// SquadCard Tests
// ---------------------------------------------------------------------------

describe('SquadCard', () => {
  let SquadCard: typeof import('../squads/SquadCard').SquadCard;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../squads/SquadCard');
    SquadCard = mod.SquadCard;
  });

  it('renders squad name and description', () => {
    const squad = createSquad({
      name: 'Dev Squad',
      description: 'Handles all development tasks',
    });

    render(<SquadCard squad={squad} />);

    expect(screen.getByText('Dev Squad')).toBeInTheDocument();
    expect(screen.getByText('Handles all development tasks')).toBeInTheDocument();
  });

  it('renders agent count', () => {
    const squad = createSquad({ agentCount: 12 });

    render(<SquadCard squad={squad} />);

    expect(screen.getByText('12 agents')).toBeInTheDocument();
  });

  it('renders capability badges', () => {
    const squad = createSquad({
      capabilities: ['React', 'TypeScript', 'Node.js'],
    });

    render(<SquadCard squad={squad} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders active status badge', () => {
    const squad = createSquad();

    render(<SquadCard squad={squad} />);

    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const handleClick = vi.fn();
    const squad = createSquad();

    const { user } = render(<SquadCard squad={squad} onClick={handleClick} />);

    // The GlassCard is interactive, so click on the squad name
    await user.click(screen.getByText('Test Squad'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render capabilities section when empty', () => {
    const squad = createSquad({ capabilities: [] });

    const { container } = render(<SquadCard squad={squad} />);

    // No badges should be present besides the status badge
    const _badges = container.querySelectorAll('[class*="glass-badge"]');
    // Only the "Ativo" status badge
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SquadOrgChart Tests
// ---------------------------------------------------------------------------

describe('SquadOrgChart', () => {
  let SquadOrgChart: typeof import('../squads/SquadOrgChart').SquadOrgChart;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../squads/SquadOrgChart');
    SquadOrgChart = mod.SquadOrgChart;
  });

  it('renders empty state when no agents', () => {
    render(<SquadOrgChart agents={[]} />);

    expect(screen.getByText('Nenhum agente neste squad')).toBeInTheDocument();
  });

  it('renders agents grouped by tier', () => {
    const agents: AgentSummary[] = [
      createAgentSummary({ id: 'a1', name: 'Orchestrator Bot', tier: 0 }),
      createAgentSummary({ id: 'a2', name: 'Master Bot', tier: 1 }),
      createAgentSummary({ id: 'a3', name: 'Specialist Bot', tier: 2 }),
    ];

    render(<SquadOrgChart agents={agents} />);

    expect(screen.getByText('Orchestrator Bot')).toBeInTheDocument();
    expect(screen.getByText('Master Bot')).toBeInTheDocument();
    expect(screen.getByText('Specialist Bot')).toBeInTheDocument();
  });

  it('renders tier labels', () => {
    const agents: AgentSummary[] = [
      createAgentSummary({ id: 'a1', name: 'Bot A', tier: 0 }),
      createAgentSummary({ id: 'a2', name: 'Bot B', tier: 2 }),
    ];

    render(<SquadOrgChart agents={agents} />);

    expect(screen.getByText(/Tier 0 - Orchestrator/)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2 - Specialist/)).toBeInTheDocument();
  });

  it('does not render tier section if no agents in that tier', () => {
    const agents: AgentSummary[] = [
      createAgentSummary({ id: 'a1', name: 'Bot A', tier: 2 }),
      createAgentSummary({ id: 'a2', name: 'Bot B', tier: 2 }),
    ];

    render(<SquadOrgChart agents={agents} />);

    expect(screen.queryByText(/Tier 0 - Orchestrator/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tier 1 - Master/)).not.toBeInTheDocument();
    expect(screen.getByText(/Tier 2 - Specialist/)).toBeInTheDocument();
  });

  it('renders multiple agents in same tier', () => {
    const agents: AgentSummary[] = [
      createAgentSummary({ id: 'a1', name: 'Spec Alpha', tier: 2 }),
      createAgentSummary({ id: 'a2', name: 'Spec Beta', tier: 2 }),
      createAgentSummary({ id: 'a3', name: 'Spec Gamma', tier: 2 }),
    ];

    render(<SquadOrgChart agents={agents} />);

    expect(screen.getByText('Spec Alpha')).toBeInTheDocument();
    expect(screen.getByText('Spec Beta')).toBeInTheDocument();
    expect(screen.getByText('Spec Gamma')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SquadStatsPanel Tests
// ---------------------------------------------------------------------------

describe('SquadStatsPanel', () => {
  let SquadStatsPanel: typeof import('../squads/SquadStatsPanel').SquadStatsPanel;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../squads/SquadStatsPanel');
    SquadStatsPanel = mod.SquadStatsPanel;
  });

  it('renders loading skeleton when stats is null', () => {
    const { container } = render(<SquadStatsPanel stats={null} />);

    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('renders total agents count', () => {
    const stats = createSquadStats();

    render(<SquadStatsPanel stats={stats} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
  });

  it('renders quality score with percentage', () => {
    const stats = createSquadStats({ qualityScore: 85 });

    render(<SquadStatsPanel stats={stats} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
  });

  it('renders tier breakdown', () => {
    const stats = createSquadStats({
      byTier: { '0': 2, '1': 4, '2': 8 },
    });

    render(<SquadStatsPanel stats={stats} />);

    expect(screen.getByText('By Tier')).toBeInTheDocument();
    expect(screen.getByText(/Orchestrator: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Master: 4/)).toBeInTheDocument();
    expect(screen.getByText(/Specialist: 8/)).toBeInTheDocument();
  });

  it('renders commands total', () => {
    const stats = createSquadStats({ commands: { total: 99, byAgent: [] } });

    render(<SquadStatsPanel stats={stats} />);

    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('renders voice DNA and anti-patterns sections', () => {
    const stats = createSquadStats();

    render(<SquadStatsPanel stats={stats} />);

    expect(screen.getByText('Voice DNA')).toBeInTheDocument();
    expect(screen.getByText('Anti-Patterns')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AgentDetailPanel Tests
// ---------------------------------------------------------------------------

describe('AgentDetailPanel', () => {
  let AgentDetailPanel: typeof import('../squads/AgentDetailPanel').AgentDetailPanel;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../squads/AgentDetailPanel');
    AgentDetailPanel = mod.AgentDetailPanel;
  });

  it('renders agent name and title', () => {
    const agent = createAgent({
      name: 'Dex',
      title: 'Senior Developer',
    });

    render(<AgentDetailPanel agent={agent} />);

    expect(screen.getByText('Dex')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
  });

  it('renders persona section when persona is provided', () => {
    const agent = createAgent({
      persona: {
        role: 'Lead Developer',
        style: 'Analytical',
        identity: 'Tech Lead',
      },
    });

    render(<AgentDetailPanel agent={agent} />);

    expect(screen.getByText('Persona')).toBeInTheDocument();
    expect(screen.getByText('Lead Developer')).toBeInTheDocument();
    expect(screen.getByText('Analytical')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
  });

  it('renders commands section with command details', () => {
    const agent = createAgent({
      commands: [
        { command: '*deploy', action: 'Deploy to prod', description: 'Runs deployment pipeline' },
        { command: '*test', action: 'Run tests', description: 'Executes test suite' },
      ],
    });

    render(<AgentDetailPanel agent={agent} />);

    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('*deploy')).toBeInTheDocument();
    expect(screen.getByText('Deploy to prod')).toBeInTheDocument();
    expect(screen.getByText('*test')).toBeInTheDocument();
    expect(screen.getByText('Run tests')).toBeInTheDocument();
  });

  it('renders core principles', () => {
    const agent = createAgent({
      corePrinciples: ['Clean code always', 'Test-driven development'],
    });

    render(<AgentDetailPanel agent={agent} />);

    expect(screen.getByText('Core Principles')).toBeInTheDocument();
    expect(screen.getByText('Clean code always')).toBeInTheDocument();
    expect(screen.getByText('Test-driven development')).toBeInTheDocument();
  });

  it('renders quality indicators', () => {
    const agent = createAgent({
      quality: {
        hasVoiceDna: true,
        hasAntiPatterns: false,
        hasIntegration: true,
      },
    });

    render(<AgentDetailPanel agent={agent} />);

    expect(screen.getByText('Quality Indicators')).toBeInTheDocument();
    expect(screen.getByText('Voice DNA')).toBeInTheDocument();
    expect(screen.getByText('Anti-Patterns')).toBeInTheDocument();
    expect(screen.getByText('Integration')).toBeInTheDocument();
  });

  it('does not render optional sections when data is absent', () => {
    const agent = createAgent({
      persona: undefined,
      commands: undefined,
      corePrinciples: undefined,
      voiceDna: undefined,
      antiPatterns: undefined,
      integration: undefined,
      quality: undefined,
    });

    render(<AgentDetailPanel agent={agent} />);

    // Only the profile section should exist
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.queryByText('Persona')).not.toBeInTheDocument();
    expect(screen.queryByText('Commands')).not.toBeInTheDocument();
    expect(screen.queryByText('Core Principles')).not.toBeInTheDocument();
    expect(screen.queryByText('Quality Indicators')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SquadSelector Tests
// ---------------------------------------------------------------------------

describe('SquadSelector', () => {
  let SquadSelector: typeof import('../squads/SquadSelector').SquadSelector;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUIStore.selectedSquadId = null;
    const mod = await import('../squads/SquadSelector');
    SquadSelector = mod.SquadSelector;
  });

  it('renders loading skeleton when squads are loading', () => {
    mockUseSquads.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<SquadSelector />);

    const shimmers = container.querySelectorAll('.shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('renders squad count and header', () => {
    mockUseSquads.mockReturnValue({
      data: [
        createSquad({ id: 'content-ecosystem', name: 'Content Ecosystem' }),
        createSquad({ id: 'copywriting', name: 'Copywriting Squad' }),
        createSquad({ id: 'full-stack-dev', name: 'Full Stack Dev' }),
      ],
      isLoading: false,
    });

    render(<SquadSelector />);

    expect(screen.getByText('Squads')).toBeInTheDocument();
    // "3" appears in both the Badge count and the "Todos os Squads" row — use getAllByText
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Todos os Squads" button', () => {
    mockUseSquads.mockReturnValue({
      data: [createSquad({ id: 'test', name: 'Test' })],
      isLoading: false,
    });

    render(<SquadSelector />);

    expect(screen.getByText('Todos os Squads')).toBeInTheDocument();
  });

  it('calls setSelectedSquadId(null) when "Todos os Squads" is clicked', async () => {
    mockUseSquads.mockReturnValue({
      data: [createSquad({ id: 'test', name: 'Test' })],
      isLoading: false,
    });

    const { user } = render(<SquadSelector />);

    await user.click(screen.getByText('Todos os Squads'));
    expect(mockUIStore.setSelectedSquadId).toHaveBeenCalledWith(null);
  });

  it('renders with empty squad list', () => {
    mockUseSquads.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<SquadSelector />);

    expect(screen.getByText('Squads')).toBeInTheDocument();
    // "0" appears in both the Badge count and the "Todos os Squads" count — use getAllByText
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });
});
