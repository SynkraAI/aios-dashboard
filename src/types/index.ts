// AIOS Dashboard Types - PRD v1.4
// Professional design system - no emojis, icon names only

import type { IconName } from '@/lib/icons';

// ============ Story Types ============

export type StoryStatus =
  | 'backlog'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'pr_created'
  | 'done'
  | 'error';

export type StoryComplexity = 'simple' | 'standard' | 'complex';
export type StoryPriority = 'low' | 'medium' | 'high' | 'critical';
export type StoryCategory = 'feature' | 'fix' | 'refactor' | 'docs';
export type StoryType = 'epic' | 'story';

export interface Story {
  id: string;
  title: string;
  description: string;
  status: StoryStatus;
  type?: StoryType; // 'story' if not specified

  // Classification
  epicId?: string;
  complexity?: StoryComplexity;
  priority?: StoryPriority;
  category?: StoryCategory;

  // Agent association
  agentId?: AgentId;
  progress?: number;

  // Content
  acceptanceCriteria?: string[];
  technicalNotes?: string;

  // Metadata
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Agent Types ============

export type AgentId = 'dev' | 'qa' | 'architect' | 'pm' | 'po' | 'analyst' | 'devops';

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error';

export type AgentPhase = 'planning' | 'coding' | 'testing' | 'reviewing' | 'deploying';

export interface Agent {
  id: AgentId;
  name: string;
  icon: IconName;
  color: string;
  status: AgentStatus;
  currentStoryId?: string;
  phase?: AgentPhase;
  progress?: number;
  lastActivity?: string;
}

// ============ Project Types ============

export interface Project {
  id: string;
  name: string;
  path: string;
}

// ============ Status Types ============

export interface AiosStatus {
  version: string;
  updatedAt: string;
  connected: boolean;
  project: {
    name: string;
    path: string;
  } | null;
  activeAgent: {
    id: AgentId;
    name: string;
    activatedAt: string;
    currentStory?: string;
  } | null;
  session: {
    startedAt: string;
    commandsExecuted: number;
    lastCommand?: string;
  } | null;
  stories: {
    inProgress: string[];
    completed: string[];
  };
  rateLimit?: {
    used: number;
    limit: number;
    resetsAt?: string;
  };
}

// ============ Terminal Types ============

export type TerminalStatus = 'idle' | 'running' | 'error';

export interface TerminalSession {
  id: string;
  agentId: AgentId;
  name: string;
  model: string;
  apiType: string;
  workingDirectory: string;
  status: TerminalStatus;
  currentCommand?: string;
  storyId?: string;
}

// ============ Roadmap Types ============

export type RoadmapPriority = 'must_have' | 'should_have' | 'could_have' | 'wont_have';
export type RoadmapImpact = 'low' | 'medium' | 'high';
export type RoadmapEffort = 'low' | 'medium' | 'high';

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  priority: RoadmapPriority;
  impact: RoadmapImpact;
  effort: RoadmapEffort;
  category?: StoryCategory;
  tags?: string[];
  linkedStoryId?: string;
}

export const ROADMAP_PRIORITY_CONFIG: Record<RoadmapPriority, { label: string; color: string }> = {
  must_have: { label: 'Must Have', color: 'red' },
  should_have: { label: 'Should Have', color: 'yellow' },
  could_have: { label: 'Could Have', color: 'blue' },
  wont_have: { label: "Won't Have", color: 'gray' },
};

// ============ Squad Types ============

export type SquadStatus = 'active' | 'draft' | 'beta' | 'planned';

export interface SquadAgent {
  id: string;
  name: string;
  role: string;
  tier: string;
  description?: string;
}

export interface SquadTier {
  key: string;
  name: string;
  purpose: string;
  agents: SquadAgent[];
  level: number; // 0=orchestrator, 1=tier_0/tier_1, 2=tier_2
}

export interface SquadConnection {
  from: string;
  to: string;
  type: 'required' | 'optional';
  reason?: string;
}

export interface Squad {
  name: string;
  displayName: string;
  description: string;
  version: string;
  score: number;
  domain: string;
  status: SquadStatus;
  path: string;
  agentCount: number;
  taskCount: number;
  workflowCount: number;
  checklistCount: number;
  templateCount: number;
  dataCount: number;
  agentNames: string[];
  tiers?: SquadTier[];
  dependencies: SquadConnection[];
  keywords: string[];
}

// ============ Sidebar Types ============

export type SidebarView =
  | 'kanban'
  | 'backlog'
  | 'agents'
  | 'bob'
  | 'terminals'
  | 'monitor'
  | 'roadmap'
  | 'context'
  | 'ideas'
  | 'insights'
  | 'github'
  | 'worktrees'
  | 'squads'
  | 'prds'
  | 'plans'
  | 'qa'
  | 'settings';

export interface SidebarItem {
  id: SidebarView;
  label: string;
  icon: IconName;
  href: string;
  shortcut?: string;
}

// ============ Kanban Column Types ============

export interface KanbanColumn {
  id: StoryStatus;
  label: string;
  icon: IconName;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', label: 'Backlog', icon: 'file-text', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', icon: 'play', color: 'blue' },
  { id: 'ai_review', label: 'AI Review', icon: 'bot', color: 'purple' },
  { id: 'human_review', label: 'Human Review', icon: 'user', color: 'yellow' },
  { id: 'pr_created', label: 'PR Created', icon: 'git-pull-request', color: 'cyan' },
  { id: 'done', label: 'Done', icon: 'check-circle', color: 'green' },
  { id: 'error', label: 'Error', icon: 'x-circle', color: 'red' },
];

// ============ Agent Config ============

export interface AgentConfig {
  name: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
}

export const AGENT_CONFIG: Record<AgentId, AgentConfig> = {
  dev: { name: 'Dev', icon: 'code', color: 'var(--agent-dev)', bg: 'var(--agent-dev-bg)', border: 'var(--agent-dev-border)' },
  qa: { name: 'QA', icon: 'test-tube', color: 'var(--agent-qa)', bg: 'var(--agent-qa-bg)', border: 'var(--agent-qa-border)' },
  architect: { name: 'Architect', icon: 'building', color: 'var(--agent-architect)', bg: 'var(--agent-architect-bg)', border: 'var(--agent-architect-border)' },
  pm: { name: 'PM', icon: 'bar-chart', color: 'var(--agent-pm)', bg: 'var(--agent-pm-bg)', border: 'var(--agent-pm-border)' },
  po: { name: 'PO', icon: 'target', color: 'var(--agent-po)', bg: 'var(--agent-po-bg)', border: 'var(--agent-po-border)' },
  analyst: { name: 'Analyst', icon: 'line-chart', color: 'var(--agent-analyst)', bg: 'var(--agent-analyst-bg)', border: 'var(--agent-analyst-border)' },
  devops: { name: 'DevOps', icon: 'wrench', color: 'var(--agent-devops)', bg: 'var(--agent-devops-bg)', border: 'var(--agent-devops-border)' },
};

// ============ Sidebar Config ============

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'kanban', label: 'Kanban', icon: 'kanban', href: '/kanban', shortcut: 'K' },
  { id: 'backlog', label: 'Backlog', icon: 'layers', href: '/backlog', shortcut: 'L' },
  { id: 'agents', label: 'Agents', icon: 'bot', href: '/agents', shortcut: 'A' },
  { id: 'bob', label: 'Bob', icon: 'bot', href: '/bob', shortcut: 'B' },
  { id: 'terminals', label: 'Terminals', icon: 'terminal', href: '/terminals', shortcut: 'T' },
  { id: 'monitor', label: 'Monitor', icon: 'activity', href: '/monitor', shortcut: 'M' },
  { id: 'insights', label: 'Insights', icon: 'trending-up', href: '/insights', shortcut: 'I' },
  { id: 'context', label: 'Context', icon: 'brain', href: '/context', shortcut: 'C' },
  { id: 'roadmap', label: 'Roadmap', icon: 'map', href: '/roadmap', shortcut: 'R' },
  { id: 'squads', label: 'Squads', icon: 'network', href: '/squads', shortcut: 'Q' },
  { id: 'github', label: 'GitHub', icon: 'github', href: '/github', shortcut: 'G' },
  { id: 'prds', label: 'PRDs', icon: 'file-text', href: '/prds', shortcut: 'P' },
  { id: 'plans', label: 'Plans', icon: 'target', href: '/plans' },
  { id: 'qa', label: 'QA Metrics', icon: 'shield', href: '/qa' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings', shortcut: 'S' },
];

// ============ Status Colors (semantic) ============

export const STATUS_COLORS: Record<StoryStatus, string> = {
  backlog: 'text-muted-foreground',
  in_progress: 'text-status-info',
  ai_review: 'text-phase-review',
  human_review: 'text-status-warning',
  pr_created: 'text-phase-pr',
  done: 'text-status-success',
  error: 'text-status-error',
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-status-idle',
  working: 'bg-status-success',
  waiting: 'bg-status-warning',
  error: 'bg-status-error',
};
