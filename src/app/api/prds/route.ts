import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { resolveProjectRoot } from '@/lib/project-registry';

interface PRDSummary {
  slug: string;
  title: string;
  version: string;
  author: string;
  date: string;
  description: string;
  filePath: string;
}

export async function GET() {
  try {
    const projectRoot = await resolveProjectRoot();
    const docsDir = path.join(projectRoot, 'docs');
    const prds: PRDSummary[] = [];

    try {
      const files = await fs.readdir(docsDir);
      for (const file of files) {
        if (!file.startsWith('prd-') || !file.endsWith('.md')) continue;
        const filePath = path.join(docsDir, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: markdown } = matter(content);

        // Extract title from first H1
        const titleMatch = markdown.match(/^#\s+(.+)/m);
        const title = (data.title as string) || (titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, ''));

        // Extract first paragraph as description
        const lines = markdown.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        const description = (data.description as string) || lines[0]?.trim() || '';

        // Extract version from changelog table if present
        const versionMatch = markdown.match(/\|\s*[\d-]+\s*\|\s*([\d.]+)\s*\|/);
        const version = (data.version as string) || (versionMatch ? versionMatch[1] : '1.0');

        // Extract author
        const authorMatch = markdown.match(/\|\s*[\d-]+\s*\|\s*[\d.]+\s*\|\s*[^|]+\|\s*([^|]+)\|/);
        const author = (data.author as string) || (authorMatch ? authorMatch[1].trim() : 'Unknown');

        const slug = file.replace(/\.md$/, '');

        prds.push({
          slug,
          title,
          version,
          author,
          date: data.date || stat.mtime.toISOString().split('T')[0],
          description: description.slice(0, 200),
          filePath: path.relative(projectRoot, filePath),
        });
      }
    } catch {
      // docs directory doesn't exist
    }

    return NextResponse.json({ prds });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list PRDs: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
