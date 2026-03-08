import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveProjectRoot } from '@/lib/project-registry';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const slugPath = slug.join('/');
    const projectRoot = await resolveProjectRoot();
    const filePath = path.join(projectRoot, 'docs', `${slugPath}.md`);

    // Prevent path traversal
    const resolved = path.resolve(filePath);
    const docsRoot = path.resolve(path.join(projectRoot, 'docs'));
    if (!resolved.startsWith(docsRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ slug: slugPath, content });
  } catch (error) {
    return NextResponse.json(
      { error: `Document not found: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 404 }
    );
  }
}
