import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { resolveProjectRoot } from '@/lib/project-registry';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  impact: string;
  effort: string;
  category: string;
  tags: string[];
}

function parsePriority(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('must') || lower.includes('critical') || lower.includes('p0')) return 'must_have';
  if (lower.includes('should') || lower.includes('high') || lower.includes('p1')) return 'should_have';
  if (lower.includes('could') || lower.includes('medium') || lower.includes('p2')) return 'could_have';
  if (lower.includes('won\'t') || lower.includes('wont') || lower.includes('low') || lower.includes('p3')) return 'wont_have';
  return 'could_have';
}

async function parseRoadmapFile(filePath: string): Promise<RoadmapItem[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const items: RoadmapItem[] = [];

  // Try frontmatter first
  const { data, content: markdown } = matter(content);
  if (data.items && Array.isArray(data.items)) {
    return data.items.map((item: Record<string, unknown>, i: number) => ({
      id: `roadmap-${i + 1}`,
      title: (item.title as string) || 'Untitled',
      description: (item.description as string) || '',
      priority: parsePriority((item.priority as string) || 'could'),
      impact: (item.impact as string) || 'medium',
      effort: (item.effort as string) || 'medium',
      category: (item.category as string) || 'feature',
      tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    }));
  }

  // Parse markdown sections: split on ## or ### headers
  const sections = markdown.split(/^(?=##\s)/m).filter(s => s.trim());
  let currentPriority = 'should_have';
  let itemIndex = 0;

  for (const section of sections) {
    const headerMatch = section.match(/^##\s+(.+)/m);
    if (!headerMatch) continue;

    const header = headerMatch[1].trim();

    // Check if this is a priority group header
    if (/must|critical|p0|high.priority/i.test(header)) {
      currentPriority = 'must_have';
      // Parse sub-items
      const subSections = section.split(/^(?=###\s)/m).slice(1);
      for (const sub of subSections) {
        const subMatch = sub.match(/^###\s+(.+)/m);
        if (subMatch) {
          itemIndex++;
          const desc = sub.replace(/^###\s+.+\n/, '').trim().split('\n')[0] || '';
          items.push({
            id: `roadmap-${itemIndex}`,
            title: subMatch[1].trim(),
            description: desc,
            priority: currentPriority,
            impact: 'high',
            effort: 'medium',
            category: 'feature',
            tags: [],
          });
        }
      }
      continue;
    }

    if (/should|medium.priority/i.test(header)) {
      currentPriority = 'should_have';
      const subSections = section.split(/^(?=###\s)/m).slice(1);
      for (const sub of subSections) {
        const subMatch = sub.match(/^###\s+(.+)/m);
        if (subMatch) {
          itemIndex++;
          const desc = sub.replace(/^###\s+.+\n/, '').trim().split('\n')[0] || '';
          items.push({
            id: `roadmap-${itemIndex}`,
            title: subMatch[1].trim(),
            description: desc,
            priority: currentPriority,
            impact: 'medium',
            effort: 'medium',
            category: 'feature',
            tags: [],
          });
        }
      }
      continue;
    }

    if (/could|nice|low.priority/i.test(header)) {
      currentPriority = 'could_have';
    }

    if (/won.?t|future|deferred/i.test(header)) {
      currentPriority = 'wont_have';
    }

    // If it's a regular section (not a priority group), treat it as an item
    if (!/must|should|could|won.?t|overview|introduction|quarterly|community/i.test(header)) {
      itemIndex++;
      const desc = section.replace(/^##\s+.+\n/, '').trim().split('\n')[0] || '';
      items.push({
        id: `roadmap-${itemIndex}`,
        title: header,
        description: desc,
        priority: currentPriority,
        impact: 'medium',
        effort: 'medium',
        category: 'feature',
        tags: [],
      });
    }
  }

  // If we found no structured items, create items from bullet points
  if (items.length === 0) {
    const bulletLines = markdown.match(/^[-*]\s+(.+)/gm);
    if (bulletLines) {
      for (const line of bulletLines.slice(0, 20)) {
        itemIndex++;
        const title = line.replace(/^[-*]\s+/, '').trim();
        if (title.length > 5) {
          items.push({
            id: `roadmap-${itemIndex}`,
            title,
            description: '',
            priority: 'should_have',
            impact: 'medium',
            effort: 'medium',
            category: 'feature',
            tags: [],
          });
        }
      }
    }
  }

  return items;
}

export async function GET() {
  try {
    const projectRoot = await resolveProjectRoot();
    let items: RoadmapItem[] = [];

    // Try docs/roadmap/ directory first
    const roadmapDir = path.join(projectRoot, 'docs', 'roadmap');
    try {
      const files = await fs.readdir(roadmapDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(roadmapDir, file);
        const fileItems = await parseRoadmapFile(filePath);
        items.push(...fileItems);
      }
    } catch {
      // No roadmap directory
    }

    // Fall back to docs/roadmap.md
    if (items.length === 0) {
      const roadmapFile = path.join(projectRoot, 'docs', 'roadmap.md');
      try {
        items = await parseRoadmapFile(roadmapFile);
      } catch {
        // No roadmap file
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to parse roadmap: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
