import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/project-registry';

export async function GET() {
  try {
    const registry = await listProjects();
    return NextResponse.json(registry);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
