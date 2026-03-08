import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const REGISTRY_PATH = path.join(
  process.env.HOME || '/root',
  '.aios',
  'dashboard',
  'projects.json'
);

interface ProjectEntry {
  path: string;
}

interface ProjectRegistry {
  defaultProject: string;
  projects: Record<string, ProjectEntry>;
}

let registryCache: ProjectRegistry | null = null;
let registryCacheTime = 0;
const CACHE_TTL_MS = 5000;

async function loadRegistry(): Promise<ProjectRegistry> {
  const now = Date.now();
  if (registryCache && now - registryCacheTime < CACHE_TTL_MS) {
    return registryCache;
  }

  try {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf-8');
    registryCache = JSON.parse(raw) as ProjectRegistry;
    registryCacheTime = now;
    return registryCache;
  } catch {
    return { defaultProject: '', projects: {} };
  }
}

export async function saveRegistry(registry: ProjectRegistry): Promise<void> {
  const dir = path.dirname(REGISTRY_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  registryCache = registry;
  registryCacheTime = Date.now();
}

export async function resolveProjectRoot(request?: NextRequest): Promise<string> {
  // 1. Check query param ?project=<name>
  if (request) {
    const projectName = request.nextUrl.searchParams.get('project');
    if (projectName) {
      const registry = await loadRegistry();
      const entry = registry.projects[projectName];
      if (entry?.path) {
        return entry.path;
      }
    }
  }

  // 2. Check registry default project
  const registry = await loadRegistry();
  if (registry.defaultProject) {
    const entry = registry.projects[registry.defaultProject];
    if (entry?.path) {
      return entry.path;
    }
  }

  // 3. Fall back to env var
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }

  // 4. Fall back to relative path
  return path.resolve(process.cwd(), '..', '..');
}

export async function listProjects(): Promise<ProjectRegistry> {
  return loadRegistry();
}

export async function registerProject(name: string, projectPath: string): Promise<ProjectRegistry> {
  const registry = await loadRegistry();
  registry.projects[name] = { path: projectPath };
  if (!registry.defaultProject) {
    registry.defaultProject = name;
  }
  await saveRegistry(registry);
  return registry;
}

export { REGISTRY_PATH };
