import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveProjectRoot } from '@/lib/project-registry';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const projectRoot = await resolveProjectRoot();
    const filePath = path.join(projectRoot, 'docs', `${slug}.md`);

    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ slug, content });
  } catch (error) {
    return NextResponse.json(
      { error: `PRD not found: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 404 }
    );
  }
}
