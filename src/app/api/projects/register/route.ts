import { NextRequest, NextResponse } from 'next/server';
import { registerProject } from '@/lib/project-registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, path: projectPath } = body as { name?: string; path?: string };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!projectPath || typeof projectPath !== 'string' || !projectPath.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const registry = await registerProject(name.trim(), projectPath.trim());
    return NextResponse.json({ message: `Project '${name}' registered`, registry });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to register project: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
