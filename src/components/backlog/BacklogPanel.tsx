'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Layers,
  FileText,
  CheckCircle2,
  Circle,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStoryStore } from '@/stores/story-store';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { iconMap } from '@/lib/icons';
import {
  AGENT_CONFIG,
  KANBAN_COLUMNS,
  type Story,
  type StoryStatus,
  type StoryPriority,
  type AgentId,
} from '@/types';

// ============ Props ============

interface BacklogPanelProps {
  onStoryClick?: (story: Story) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ============ Types ============

interface EpicGroup {
  epic: Story | null;
  stories: Story[];
  taskCount: { total: number; completed: number };
  progress: number;
}

type FilterStatus = StoryStatus | 'all';
type FilterPriority = StoryPriority | 'all';
type FilterAgent = AgentId | 'all';

// ============ Priority Config ============

const PRIORITY_CONFIG: Record<StoryPriority, { label: string; color: string }> = {
  critical: { label: 'P0', color: 'var(--status-error)' },
  high: { label: 'P1', color: 'var(--status-warning)' },
  medium: { label: 'P2', color: 'var(--status-info)' },
  low: { label: 'P3', color: 'var(--text-muted)' },
};

// ============ Component ============

export function BacklogPanel({
  onStoryClick,
  onRefresh,
  isLoading = false,
  className,
}: BacklogPanelProps) {
  const { stories, getEpics, getStoriesOnly } = useStoryStore();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [agentFilter, setAgentFilter] = useState<FilterAgent>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Collapse state — tracks collapsed epics (all expanded by default)
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || agentFilter !== 'all';

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAgentFilter('all');
  }, []);

  // Build epic groups with filtered stories
  const epicGroups = useMemo((): EpicGroup[] => {
    const epics = getEpics();
    const allStories = getStoriesOnly();

    // Apply filters
    const filteredStories = allStories.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
      if (agentFilter !== 'all' && s.agentId !== agentFilter) return false;
      return true;
    });

    const filteredEpics = epics.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;
      return true;
    });

    // Group stories by epicId
    const storyMap = new Map<string, Story[]>();
    const unassigned: Story[] = [];

    for (const story of filteredStories) {
      if (story.epicId) {
        const existing = storyMap.get(story.epicId) || [];
        existing.push(story);
        storyMap.set(story.epicId, existing);
      } else {
        unassigned.push(story);
      }
    }

    const groups: EpicGroup[] = [];

    // Add epic groups
    for (const epic of filteredEpics) {
      const epicStories = storyMap.get(epic.id) || storyMap.get(epic.epicId || '') || [];
      // Also check if stories reference this epic by various ID patterns
      const matchedStories = epicStories.length > 0
        ? epicStories
        : filteredStories.filter((s) => s.epicId === epic.id);

      const taskCount = countTasks(matchedStories);
      const progress = calculateEpicProgress(epic, matchedStories);

      groups.push({ epic, stories: matchedStories, taskCount, progress });
    }

    // Also show epics that only exist as epicId references (no epic Story object)
    for (const [epicId, epicStories] of storyMap.entries()) {
      const hasEpicObject = filteredEpics.some((e) => e.id === epicId || e.epicId === epicId);
      if (!hasEpicObject && epicStories.length > 0) {
        const taskCount = countTasks(epicStories);
        const progress = calculateGroupProgress(epicStories);
        groups.push({
          epic: null,
          stories: epicStories,
          taskCount,
          progress,
        });
      }
    }

    // Sort epics: in_progress first, then by priority
    groups.sort((a, b) => {
      const statusOrder: Record<string, number> = { in_progress: 0, backlog: 1, ai_review: 2, human_review: 3, done: 4, error: 5 };
      const aStatus = a.epic?.status || 'backlog';
      const bStatus = b.epic?.status || 'backlog';
      const statusDiff = (statusOrder[aStatus] ?? 3) - (statusOrder[bStatus] ?? 3);
      if (statusDiff !== 0) return statusDiff;

      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = a.epic?.priority || 'medium';
      const bPriority = b.epic?.priority || 'medium';
      return (priorityOrder[aPriority] ?? 2) - (priorityOrder[bPriority] ?? 2);
    });

    // Add unassigned stories at the end
    if (unassigned.length > 0) {
      const taskCount = countTasks(unassigned);
      groups.push({
        epic: null,
        stories: unassigned,
        taskCount,
        progress: calculateGroupProgress(unassigned),
      });
    }

    return groups;
  }, [stories, getEpics, getStoriesOnly, statusFilter, priorityFilter, agentFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const allStories = Object.values(stories);
    const epics = allStories.filter((s) => s.type === 'epic');
    const storyItems = allStories.filter((s) => s.type !== 'epic');
    const inProgress = storyItems.filter((s) => s.status === 'in_progress').length;
    const done = storyItems.filter((s) => s.status === 'done').length;
    return { epics: epics.length, stories: storyItems.length, inProgress, done };
  }, [stories]);

  const toggleEpic = useCallback((epicId: string) => {
    setCollapsedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  }, []);

  const toggleTasks = useCallback((storyId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Backlog</h2>
          <div className="flex items-center gap-2 text-detail text-text-muted">
            <span>{stats.epics} epics</span>
            <span className="text-border">|</span>
            <span>{stats.stories} stories</span>
            <span className="text-border">|</span>
            <span className="text-status-info">{stats.inProgress} active</span>
            <span className="text-border">|</span>
            <span className="text-status-success">{stats.done} done</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-accent-gold-bg text-gold'
                : 'bg-muted hover:bg-accent'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-gold" />
            )}
          </button>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm',
                'bg-muted hover:bg-accent transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-hover)' }}>
          {/* Status filter */}
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as FilterStatus)}
            options={[
              { value: 'all', label: 'All' },
              ...KANBAN_COLUMNS.map((c) => ({ value: c.id, label: c.label })),
            ]}
          />

          {/* Priority filter */}
          <FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v as FilterPriority)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'critical', label: 'P0 Critical' },
              { value: 'high', label: 'P1 High' },
              { value: 'medium', label: 'P2 Medium' },
              { value: 'low', label: 'P3 Low' },
            ]}
          />

          {/* Agent filter */}
          <FilterSelect
            label="Agent"
            value={agentFilter}
            onChange={(v) => setAgentFilter(v as FilterAgent)}
            options={[
              { value: 'all', label: 'All' },
              ...Object.entries(AGENT_CONFIG).map(([id, cfg]) => ({
                value: id,
                label: `@${id} (${cfg.name})`,
              })),
            ]}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-detail text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-refined">
        {epicGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Layers className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No items match current filters</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-detail text-gold mt-1 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {epicGroups.map((group, idx) => (
              <EpicSection
                key={group.epic?.id || `group-${idx}`}
                group={group}
                isExpanded={!collapsedEpics.has(group.epic?.id || `group-${idx}`)}
                expandedTasks={expandedTasks}
                onToggleExpand={() => toggleEpic(group.epic?.id || `group-${idx}`)}
                onToggleTasks={toggleTasks}
                onStoryClick={onStoryClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Epic Section ============

interface EpicSectionProps {
  group: EpicGroup;
  isExpanded: boolean;
  expandedTasks: Set<string>;
  onToggleExpand: () => void;
  onToggleTasks: (storyId: string) => void;
  onStoryClick?: (story: Story) => void;
}

function EpicSection({
  group,
  isExpanded,
  expandedTasks,
  onToggleExpand,
  onToggleTasks,
  onStoryClick,
}: EpicSectionProps) {
  const { epic, stories, taskCount, progress } = group;
  const isUnassigned = !epic;
  const title = epic?.title || 'Unassigned Stories';
  const storyCount = stories.length;
  const statusColumn = epic ? KANBAN_COLUMNS.find((c) => c.id === epic.status) : null;

  return (
    <div className="border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
      {/* Epic Header */}
      <button
        onClick={onToggleExpand}
        className="flex items-center w-full gap-3 px-4 py-3 transition-colors hover:bg-card-hover"
      >
        {/* Expand chevron */}
        {isExpanded
          ? <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
        }

        {/* Epic icon */}
        {isUnassigned
          ? <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
          : <Layers className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-gold)' }} />
        }

        {/* Title */}
        <span className={cn(
          'text-sm font-medium truncate text-left flex-1',
          isUnassigned ? 'text-text-tertiary' : 'text-text-primary'
        )}>
          {title}
        </span>

        {/* Status badge */}
        {statusColumn && epic && (
          <StatusBadge status={epic.status} size="sm" />
        )}

        {/* Priority */}
        {epic?.priority && (
          <span
            className="text-detail font-medium px-1.5 py-0.5 border"
            style={{
              color: PRIORITY_CONFIG[epic.priority].color,
              borderColor: 'var(--border-subtle)',
            }}
          >
            {PRIORITY_CONFIG[epic.priority].label}
          </span>
        )}

        {/* Story count */}
        <span className="text-detail text-text-muted tabular-nums flex-shrink-0">
          {storyCount} {storyCount === 1 ? 'story' : 'stories'}
        </span>

        {/* Task count */}
        {taskCount.total > 0 && (
          <span className="text-detail text-text-muted tabular-nums flex-shrink-0">
            {taskCount.completed}/{taskCount.total} tasks
          </span>
        )}

        {/* Progress bar */}
        <div className="w-24 flex-shrink-0">
          <ProgressBar
            progress={progress}
            size="sm"
            color={progress === 100 ? 'var(--status-success)' : 'var(--accent-gold)'}
          />
        </div>
      </button>

      {/* Expanded stories */}
      {isExpanded && stories.length > 0 && (
        <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {stories.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              showTasks={expandedTasks.has(story.id)}
              onToggleTasks={() => onToggleTasks(story.id)}
              onClick={() => onStoryClick?.(story)}
            />
          ))}
        </div>
      )}

      {/* Expanded but empty */}
      {isExpanded && stories.length === 0 && (
        <div className="px-4 py-3 border-t text-detail text-text-muted" style={{ borderColor: 'var(--border-subtle)' }}>
          No stories in this epic
        </div>
      )}
    </div>
  );
}

// ============ Story Row ============

interface StoryRowProps {
  story: Story;
  showTasks: boolean;
  onToggleTasks: () => void;
  onClick?: () => void;
}

function StoryRow({ story, showTasks, onToggleTasks, onClick }: StoryRowProps) {
  const hasTasks = story.acceptanceCriteria && story.acceptanceCriteria.length > 0;
  const statusColumn = KANBAN_COLUMNS.find((c) => c.id === story.status);
  const agentConfig = story.agentId ? AGENT_CONFIG[story.agentId] : null;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors">
        {/* Task expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasTasks) onToggleTasks();
          }}
          className={cn(
            'flex-shrink-0 p-0.5',
            hasTasks ? 'text-text-muted hover:text-text-primary cursor-pointer' : 'text-transparent cursor-default'
          )}
          disabled={!hasTasks}
        >
          {showTasks
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />
          }
        </button>

        {/* Story icon */}
        <FileText className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />

        {/* Story ID */}
        <span className="text-detail font-mono text-text-muted flex-shrink-0 min-w-[4rem]">
          {story.id}
        </span>

        {/* Title (clickable) */}
        <button
          onClick={onClick}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors truncate text-left flex-1"
        >
          {story.title}
        </button>

        {/* Category */}
        {story.category && (
          <span
            className="text-detail font-medium uppercase tracking-wide px-1.5 py-0.5"
            style={{
              backgroundColor: `var(--category-${story.category}-bg, var(--border))`,
              color: `var(--category-${story.category}, var(--text-tertiary))`,
            }}
          >
            {story.category}
          </span>
        )}

        {/* Status badge */}
        <StatusBadge status={story.status} size="sm" />

        {/* Priority */}
        {story.priority && (
          <span
            className="text-detail font-medium"
            style={{ color: PRIORITY_CONFIG[story.priority].color }}
          >
            {PRIORITY_CONFIG[story.priority].label}
          </span>
        )}

        {/* Agent */}
        {agentConfig && (
          <span
            className="flex items-center gap-1 text-detail px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: agentConfig.bg, color: agentConfig.color }}
          >
            {(() => {
              const Icon = iconMap[agentConfig.icon];
              return Icon ? <Icon className="h-3 w-3" /> : null;
            })()}
            @{story.agentId}
          </span>
        )}

        {/* Tasks indicator */}
        {hasTasks && (
          <span className="text-detail text-text-muted tabular-nums flex-shrink-0">
            {countCompletedCriteria(story)}/{story.acceptanceCriteria!.length}
          </span>
        )}

        {/* Progress */}
        {typeof story.progress === 'number' && story.progress > 0 && (
          <div className="w-16 flex-shrink-0">
            <ProgressBar progress={story.progress} size="sm" showLabel />
          </div>
        )}
      </div>

      {/* Acceptance Criteria (Tasks) */}
      {showTasks && hasTasks && (
        <div className="pl-14 pr-4 pb-2 space-y-1">
          {story.acceptanceCriteria!.map((criterion, i) => (
            <TaskItem key={i} text={criterion} storyStatus={story.status} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Task Item ============

interface TaskItemProps {
  text: string;
  storyStatus: StoryStatus;
}

function TaskItem({ text, storyStatus }: TaskItemProps) {
  const isDone = storyStatus === 'done';

  return (
    <div className="flex items-start gap-2 py-1">
      {isDone ? (
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-success)' }} />
      ) : (
        <Circle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-text-muted" />
      )}
      <span className={cn(
        'text-label leading-relaxed',
        isDone ? 'text-text-muted line-through' : 'text-text-secondary'
      )}>
        {text}
      </span>
    </div>
  );
}

// ============ Filter Select ============

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-detail text-text-muted">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm bg-transparent border px-2 py-1 text-text-secondary focus:outline-none focus:border-gold"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============ Helpers ============

function countTasks(stories: Story[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const story of stories) {
    if (story.acceptanceCriteria) {
      total += story.acceptanceCriteria.length;
      if (story.status === 'done') {
        completed += story.acceptanceCriteria.length;
      }
    }
  }
  return { total, completed };
}

function countCompletedCriteria(story: Story): number {
  if (story.status === 'done' && story.acceptanceCriteria) {
    return story.acceptanceCriteria.length;
  }
  return 0;
}

function calculateEpicProgress(epic: Story, stories: Story[]): number {
  if (epic.status === 'done') return 100;
  if (stories.length === 0) return epic.progress || 0;
  return calculateGroupProgress(stories);
}

function calculateGroupProgress(stories: Story[]): number {
  if (stories.length === 0) return 0;
  const doneCount = stories.filter((s) => s.status === 'done').length;
  const inProgressCount = stories.filter((s) => s.status === 'in_progress').length;
  // Done stories count 100%, in_progress count 50%
  const totalProgress = doneCount * 100 + inProgressCount * 50;
  return Math.round(totalProgress / stories.length);
}
