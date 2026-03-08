import { promises as fs } from 'fs';
import path from 'path';

export { resolveProjectRoot } from '@/lib/project-registry';

// Synchronous fallback — used by squad routes that call getProjectRoot() without await.
// New code should prefer the async resolveProjectRoot() from project-registry.
export function getProjectRoot(): string {
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }
  return path.resolve(process.cwd(), '..', '..');
}

export const VALID_SQUAD_SECTIONS = [
  'agents',
  'tasks',
  'workflows',
  'checklists',
  'templates',
  'data',
] as const;

export type SquadSectionName = (typeof VALID_SQUAD_SECTIONS)[number];

const SECTION_ALLOWED_EXTENSIONS: Record<SquadSectionName, ReadonlySet<string>> = {
  agents: new Set(['.md']),
  tasks: new Set(['.md']),
  workflows: new Set(['.md', '.yaml', '.yml']),
  checklists: new Set(['.md']),
  templates: new Set(['.md', '.yaml', '.yml']),
  data: new Set(['.md', '.yaml', '.yml', '.json']),
};

const SECTION_EXCLUDED_FILE_NAMES = new Set(['readme.md', 'template.md', '_template.md']);

export function formatName(name: string): string {
  return name
    .replace(/\.(md|yaml|yml|json)$/i, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function isSafePathSegment(value: string): boolean {
  return Boolean(value)
    && value !== '.'
    && value !== '..'
    && !value.includes('/')
    && !value.includes('\\')
    && !value.includes('\0');
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function isValidSquadSection(section: string): section is SquadSectionName {
  return VALID_SQUAD_SECTIONS.includes(section as SquadSectionName);
}

export function isListableSectionFile(section: string, fileName: string): boolean {
  if (!isValidSquadSection(section)) {
    return false;
  }
  if (!fileName || fileName.startsWith('.')) {
    return false;
  }
  if (SECTION_EXCLUDED_FILE_NAMES.has(fileName.toLowerCase())) {
    return false;
  }

  const ext = path.extname(fileName).toLowerCase();
  return SECTION_ALLOWED_EXTENSIONS[section].has(ext);
}

function normalizeRelativePath(relativePath: string): string {
  return path.posix
    .normalize(relativePath.replace(/\\/g, '/'))
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');
}

export function sanitizeRelativePath(relativePath: string): string | null {
  if (!relativePath || relativePath.includes('\0')) {
    return null;
  }

  const normalized = normalizeRelativePath(relativePath);
  if (
    !normalized
    || normalized === '.'
    || normalized === '..'
    || normalized.startsWith('../')
    || normalized.includes('/../')
  ) {
    return null;
  }

  return normalized;
}

export function resolvePathWithin(baseDir: string, relativePath: string): string | null {
  const safeRelativePath = sanitizeRelativePath(relativePath);
  if (!safeRelativePath) {
    return null;
  }

  const absoluteBase = path.resolve(baseDir);
  const resolved = path.resolve(absoluteBase, safeRelativePath);
  if (resolved !== absoluteBase && !resolved.startsWith(`${absoluteBase}${path.sep}`)) {
    return null;
  }

  return resolved;
}

export function resolveSquadSectionDir(
  projectRoot: string,
  squadName: string,
  section: string
): string | null {
  if (!isSafePathSegment(squadName) || !isValidSquadSection(section)) {
    return null;
  }

  const squadsRoot = path.resolve(projectRoot, 'squads');
  const squadDir = path.resolve(squadsRoot, squadName);
  const sectionDir = path.resolve(squadDir, section);

  if (!sectionDir.startsWith(`${squadDir}${path.sep}`)) {
    return null;
  }

  return sectionDir;
}

export function encodeSquadItemSlug(relativePath: string): string {
  const normalized = sanitizeRelativePath(relativePath);
  if (!normalized) {
    return '';
  }
  return Buffer.from(normalized, 'utf-8').toString('base64url');
}

export function decodeSquadItemSlug(slug: string): string | null {
  try {
    const decoded = Buffer.from(slug, 'base64url').toString('utf-8');
    const sanitized = sanitizeRelativePath(decoded);
    if (!sanitized) {
      return null;
    }

    // Ensure slug is canonical base64url for the sanitized path.
    const canonical = Buffer.from(sanitized, 'utf-8').toString('base64url');
    if (canonical !== slug) {
      return null;
    }

    return sanitized;
  } catch {
    return null;
  }
}

export async function listFilesRecursive(
  baseDir: string,
  predicate: (relativePath: string, fileName: string) => boolean
): Promise<string[]> {
  const files: string[] = [];

  const walk = async (currentDir: string): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relativePath = toPosixPath(path.relative(baseDir, fullPath));
      if (predicate(relativePath, entry.name)) {
        files.push(relativePath);
      }
    }
  };

  await walk(baseDir);
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function listSectionFilesRecursive(sectionDir: string, section: SquadSectionName): Promise<string[]> {
  return listFilesRecursive(sectionDir, (_relativePath, fileName) => isListableSectionFile(section, fileName));
}

export async function countFilesRecursive(
  baseDir: string,
  predicate: (relativePath: string, fileName: string) => boolean
): Promise<number> {
  const files = await listFilesRecursive(baseDir, predicate);
  return files.length;
}

export async function countSectionFilesRecursive(sectionDir: string, section: SquadSectionName): Promise<number> {
  return countFilesRecursive(sectionDir, (_relativePath, fileName) => isListableSectionFile(section, fileName));
}
