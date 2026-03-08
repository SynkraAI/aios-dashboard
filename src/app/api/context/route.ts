import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveProjectRoot } from '@/lib/project-registry';

interface ContextFile {
  id: string;
  name: string;
  path: string;
  type: 'rules' | 'agent' | 'config' | 'docs';
  description: string;
  lastModified: string;
  size: string;
}

interface ContextMCP {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  tools: number;
  description: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function scanFiles(
  dir: string,
  type: ContextFile['type'],
  descFn: (name: string) => string,
): Promise<ContextFile[]> {
  const files: ContextFile[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      const stat = await fs.stat(fullPath);
      files.push({
        id: `${type}-${entry.name}`,
        name: entry.name,
        path: path.relative(process.env.AIOS_PROJECT_ROOT || path.resolve(process.cwd(), '..', '..'), fullPath),
        type,
        description: descFn(entry.name),
        lastModified: stat.mtime.toISOString(),
        size: formatSize(stat.size),
      });
    }
  } catch {
    // Directory doesn't exist
  }
  return files;
}

async function getActiveRules(projectRoot: string): Promise<ContextFile[]> {
  const rules: ContextFile[] = [];

  // Check .claude/CLAUDE.md
  const claudeMd = path.join(projectRoot, '.claude', 'CLAUDE.md');
  try {
    const stat = await fs.stat(claudeMd);
    rules.push({
      id: 'rule-claude-md',
      name: 'CLAUDE.md',
      path: '.claude/CLAUDE.md',
      type: 'rules',
      description: 'Main project rules and instructions',
      lastModified: stat.mtime.toISOString(),
      size: formatSize(stat.size),
    });
  } catch { /* not found */ }

  // Scan .claude/rules/
  const rulesDir = path.join(projectRoot, '.claude', 'rules');
  const ruleFiles = await scanFiles(rulesDir, 'rules', (name) => {
    const stem = name.replace(/\.(md|txt|yaml)$/, '');
    return stem.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' rules';
  });
  rules.push(...ruleFiles);

  return rules;
}

async function getAgentDefinitions(projectRoot: string): Promise<ContextFile[]> {
  const agents: ContextFile[] = [];

  // .aiox-core/development/agents/
  const agentsDir = path.join(projectRoot, '.aiox-core', 'development', 'agents');
  const agentFiles = await scanFiles(agentsDir, 'agent', (name) => {
    const stem = name.replace(/\.(md|yaml|json)$/, '');
    return `${stem.charAt(0).toUpperCase() + stem.slice(1)} agent definition`;
  });
  agents.push(...agentFiles);

  // Also check squads/ for squad agent defs
  const squadsDir = path.join(projectRoot, 'squads');
  try {
    const squads = await fs.readdir(squadsDir, { withFileTypes: true });
    for (const squad of squads) {
      if (!squad.isDirectory() || squad.name.startsWith('.')) continue;
      const squadAgentsDir = path.join(squadsDir, squad.name, 'agents');
      const squadAgentFiles = await scanFiles(squadAgentsDir, 'agent', (name) => {
        const stem = name.replace(/\.(md|yaml|json)$/, '');
        return `${stem} agent (${squad.name} squad)`;
      });
      agents.push(...squadAgentFiles);
    }
  } catch { /* no squads dir */ }

  return agents;
}

async function getConfigFiles(projectRoot: string): Promise<ContextFile[]> {
  const configs: ContextFile[] = [];
  const configNames: Record<string, string> = {
    'package.json': 'Node.js dependencies and scripts',
    'tsconfig.json': 'TypeScript configuration',
    'core-config.yaml': 'AIOX core configuration',
    '.eslintrc.js': 'ESLint configuration',
    '.eslintrc.json': 'ESLint configuration',
    '.prettierrc': 'Prettier configuration',
    'vitest.config.ts': 'Vitest test configuration',
    'jest.config.js': 'Jest test configuration',
    'jest.config.ts': 'Jest test configuration',
  };

  for (const [name, desc] of Object.entries(configNames)) {
    const filePath = path.join(projectRoot, name);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        configs.push({
          id: `config-${name}`,
          name,
          path: name,
          type: 'config',
          description: desc,
          lastModified: stat.mtime.toISOString(),
          size: formatSize(stat.size),
        });
      }
    } catch { /* not found */ }
  }

  // .aiox-core configs
  const aioxConfigs = [
    { file: '.aiox-core/constitution.md', desc: 'AIOX Constitution — non-negotiable principles' },
    { file: '.aiox-core/package.json', desc: 'AIOX core package configuration' },
  ];
  for (const { file, desc } of aioxConfigs) {
    const filePath = path.join(projectRoot, file);
    try {
      const stat = await fs.stat(filePath);
      configs.push({
        id: `config-${path.basename(file)}`,
        name: path.basename(file),
        path: file,
        type: 'config',
        description: desc,
        lastModified: stat.mtime.toISOString(),
        size: formatSize(stat.size),
      });
    } catch { /* not found */ }
  }

  return configs;
}

async function getMCPServers(projectRoot: string): Promise<ContextMCP[]> {
  const servers: ContextMCP[] = [];

  // Try .claude/mcp.json
  const mcpPaths = [
    path.join(projectRoot, '.claude', 'mcp.json'),
    path.join(process.env.HOME || '/root', '.claude.json'),
  ];

  for (const mcpPath of mcpPaths) {
    try {
      const content = await fs.readFile(mcpPath, 'utf-8');
      const parsed = JSON.parse(content);
      const mcpServers = parsed.mcpServers || parsed.mcp_servers || {};

      for (const [name, config] of Object.entries(mcpServers)) {
        const cfg = config as Record<string, unknown>;
        const disabled = cfg.disabled === true;
        servers.push({
          id: `mcp-${name}`,
          name,
          status: disabled ? 'inactive' : 'active',
          tools: Array.isArray(cfg.tools) ? (cfg.tools as unknown[]).length : 0,
          description: (cfg.description as string) || `MCP server: ${name}`,
        });
      }
    } catch { /* file not found or invalid */ }
  }

  return servers;
}

function getRecentFiles(projectRoot: string): string[] {
  try {
    const output = execSync(
      'git log --format="" --diff-filter=M --name-only -20 2>/dev/null | head -20',
      { cwd: projectRoot, encoding: 'utf-8', timeout: 5000 }
    );
    const files = output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    // Deduplicate
    return [...new Set(files)].slice(0, 20);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const projectRoot = await resolveProjectRoot();

    const [activeRules, agentDefinitions, configFiles, mcpServers] = await Promise.all([
      getActiveRules(projectRoot),
      getAgentDefinitions(projectRoot),
      getConfigFiles(projectRoot),
      getMCPServers(projectRoot),
    ]);

    const recentFiles = getRecentFiles(projectRoot);

    // Derive project name from package.json or directory name
    let projectName = path.basename(projectRoot);
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8'));
      projectName = pkg.name || projectName;
    } catch { /* use dir name */ }

    // Check for CLAUDE.md path
    let claudeMdPath = '';
    try {
      await fs.access(path.join(projectRoot, '.claude', 'CLAUDE.md'));
      claudeMdPath = '.claude/CLAUDE.md';
    } catch {
      claudeMdPath = '(not found)';
    }

    return NextResponse.json({
      projectName,
      projectPath: projectRoot,
      claudeMdPath,
      activeRules,
      agentDefinitions,
      configFiles,
      mcpServers,
      recentFiles,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to read context: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
