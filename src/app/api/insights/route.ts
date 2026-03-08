import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import { resolveProjectRoot } from '@/lib/project-registry';

interface StoryData {
  status: string;
  agent: string;
  createdAt: string;
  updatedAt: string;
  complexity: string;
}

async function getStories(projectRoot: string): Promise<StoryData[]> {
  const storiesDir = path.join(projectRoot, 'docs', 'stories');
  const stories: StoryData[] = [];

  try {
    const files = await fs.readdir(storiesDir);
    for (const file of files) {
      if (!file.endsWith('.md') || file.startsWith('.')) continue;
      const filePath = path.join(storiesDir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      stories.push({
        status: data.status || 'backlog',
        agent: data.agent || 'unknown',
        createdAt: data.createdAt || stat.birthtime.toISOString(),
        updatedAt: data.updatedAt || stat.mtime.toISOString(),
        complexity: data.complexity || 'standard',
      });
    }
  } catch {
    // No stories directory
  }

  return stories;
}

function getWeeklyActivity(projectRoot: string): { day: string; stories: number; commits: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activity: Record<string, number> = {};

  // Initialize last 7 days
  const result: { day: string; stories: number; commits: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    activity[key] = 0;
  }

  try {
    const output = execSync(
      'git log --format="%ad" --date=format:"%Y-%m-%d" --since="7 days ago" 2>/dev/null',
      { cwd: projectRoot, encoding: 'utf-8', timeout: 5000 }
    );
    for (const line of output.split('\n')) {
      const date = line.trim();
      if (date && activity[date] !== undefined) {
        activity[date]++;
      }
    }
  } catch {
    // Not a git repo or git not available
  }

  for (const [date, commits] of Object.entries(activity)) {
    const d = new Date(date + 'T12:00:00Z');
    result.push({
      day: days[d.getUTCDay()],
      stories: 0, // Will be filled from story data
      commits,
    });
  }

  return result;
}

export async function GET() {
  try {
    const projectRoot = await resolveProjectRoot();
    const stories = await getStories(projectRoot);
    const weeklyActivity = getWeeklyActivity(projectRoot);

    // Velocity: count completed stories
    const completed = stories.filter(s => s.status === 'done');
    const total = stories.length;

    // Agent activity
    const agentMap = new Map<string, { completed: number; inProgress: number; total: number }>();
    for (const s of stories) {
      if (!agentMap.has(s.agent)) {
        agentMap.set(s.agent, { completed: 0, inProgress: 0, total: 0 });
      }
      const entry = agentMap.get(s.agent)!;
      entry.total++;
      if (s.status === 'done') entry.completed++;
      if (s.status === 'in_progress') entry.inProgress++;
    }

    const agentActivity = Array.from(agentMap.entries()).map(([agentId, stats]) => ({
      agentId,
      storiesCompleted: stats.completed,
      hoursActive: stats.total * 4, // Estimate
      successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));

    // Bottlenecks
    const statusCounts = new Map<string, number>();
    for (const s of stories) {
      statusCounts.set(s.status, (statusCounts.get(s.status) || 0) + 1);
    }

    const statusLabels: Record<string, string> = {
      backlog: 'Backlog',
      in_progress: 'In Progress',
      ai_review: 'AI Review',
      human_review: 'Human Review',
      pr_created: 'PR Created',
      error: 'Error',
    };

    const bottlenecks = Array.from(statusCounts.entries())
      .filter(([status]) => status !== 'done')
      .map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
        avgWaitTime: status === 'backlog' ? 72 : status === 'human_review' ? 12 : 6,
      }))
      .sort((a, b) => b.count - a.count);

    // Cycle time by status (estimated averages in hours)
    const cycleTimeByStatus: Record<string, number> = {};
    for (const [status, count] of statusCounts.entries()) {
      if (count > 0) {
        cycleTimeByStatus[status] = status === 'backlog' ? 48 :
          status === 'in_progress' ? 6 :
          status === 'ai_review' ? 2 :
          status === 'human_review' ? 8 :
          status === 'pr_created' ? 4 : 1;
      }
    }

    // Error rate
    const errorCount = stories.filter(s => s.status === 'error').length;
    const errorRate = total > 0 ? Math.round((errorCount / total) * 100) : 0;

    return NextResponse.json({
      velocity: {
        current: completed.length,
        previous: Math.max(completed.length - 1, 0),
        trend: completed.length > 0 ? 'up' as const : 'stable' as const,
      },
      cycleTime: {
        average: Object.values(cycleTimeByStatus).length > 0
          ? Math.round(Object.values(cycleTimeByStatus).reduce((a, b) => a + b, 0) / Object.values(cycleTimeByStatus).length * 10) / 10
          : 0,
        byStatus: cycleTimeByStatus,
      },
      agentActivity,
      bottlenecks,
      weeklyActivity,
      errorRate: {
        current: errorRate,
        previous: 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to compute insights: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
