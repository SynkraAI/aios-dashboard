import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveProjectRoot } from '@/lib/project-registry';

interface PlanItem {
  id: string;
  name: string;
  description: string;
  category: string;
  filePath: string;
}

export async function GET() {
  try {
    const projectRoot = await resolveProjectRoot();
    const tasksDir = path.join(projectRoot, '.aiox-core', 'development', 'tasks');
    const plans: PlanItem[] = [];

    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.md') && !entry.name.endsWith('.yaml')) continue;
        if (entry.name.startsWith('.')) continue;

        const filePath = path.join(tasksDir, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract title from first H1 or filename
        const titleMatch = content.match(/^#\s+(.+)/m);
        const stem = entry.name.replace(/\.(md|yaml)$/, '');
        const name = titleMatch ? titleMatch[1].trim() : stem.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Extract first paragraph as description
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
        const description = lines[0]?.trim().slice(0, 200) || '';

        // Categorize by filename prefix
        let category = 'general';
        if (stem.startsWith('db-')) category = 'database';
        else if (stem.startsWith('dev-')) category = 'development';
        else if (stem.startsWith('qa-') || stem.startsWith('apply-qa')) category = 'quality';
        else if (stem.startsWith('github-') || stem.startsWith('ci-')) category = 'devops';
        else if (stem.startsWith('create-') || stem.startsWith('build')) category = 'creation';
        else if (stem.startsWith('analyze') || stem.startsWith('audit')) category = 'analysis';
        else if (stem.startsWith('architect')) category = 'architecture';
        else if (stem.startsWith('brownfield')) category = 'brownfield';

        plans.push({
          id: stem,
          name,
          description,
          category,
          filePath: path.relative(projectRoot, filePath),
        });
      }
    } catch {
      // tasks directory doesn't exist
    }

    // Sort by category then name
    plans.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    // Group by category
    const categories = [...new Set(plans.map(p => p.category))];
    const grouped = categories.map(cat => ({
      category: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: plans.filter(p => p.category === cat).length,
      items: plans.filter(p => p.category === cat),
    }));

    return NextResponse.json({ plans, grouped, total: plans.length });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list plans: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
